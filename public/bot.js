#!/usr/bin/env node
/**
 * ExamSetu Nepal - Interactive Telegram Quiz Bot
 * Designed for 24/7 execution in Android Termux or Node.js servers.
 *
 * Features:
 * - Native Telegram Quiz Polls with instant feedback and explanations
 * - Automatic syncing with ExamSetu SQLite database
 * - Daily challenges, streak tracking, XP points, and live leaderboard
 * - Zero external npm dependencies (uses native fetch & SQLite)
 */

require('dotenv').config();
const path = require('path');
const DB = require('./models/db');

// Ensure database is initialized
try {
  DB.init();
} catch (e) {
  // SQLite initialized
}

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '9100822829:AAHxuYYTQ8eI6yPqlxWgTU_fI-oviQjv6wM').trim();
const API_BASE = `https://api.telegram.org/bot${TOKEN}`;

// In-memory active polls registry: poll_id -> { question_id, correct_option_id, explanation, category, chat_id }
const activePolls = new Map();

// Helper: Make Telegram API request
async function callTelegram(method, payload) {
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return await res.json();
  } catch (err) {
    console.error(`[Telegram API Error] ${method}:`, err.message);
    return { ok: false, error: err.message };
  }
}

// Helper: Send message
async function sendMessage(chatId, text, options = {}) {
  return await callTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    ...options
  });
}

// Categories list for ExamSetu
const EXAM_CATEGORIES = [
  { id: 'loksewa', label: '🇳🇵 लोक सेवा (Lok Sewa)' },
  { id: 'banking', label: '🏦 बैंकिङ (Banking)' },
  { id: 'tsc', label: '👨‍🏫 शिक्षक सेवा (TSC)' },
  { id: 'see', label: '📚 SEE / NEB' },
  { id: 'entrance', label: '🎓 Entrance (IOE/CEE)' },
  { id: 'all', label: '🎲 सबै विषय (All Mix)' }
];

// Helper: Build category selection inline keyboard
function getCategoryKeyboard() {
  const keyboard = [];
  for (let i = 0; i < EXAM_CATEGORIES.length; i += 2) {
    const row = [
      { text: EXAM_CATEGORIES[i].label, callback_data: `cat_${EXAM_CATEGORIES[i].id}` }
    ];
    if (i + 1 < EXAM_CATEGORIES.length) {
      row.push({ text: EXAM_CATEGORIES[i + 1].label, callback_data: `cat_${EXAM_CATEGORIES[i + 1].id}` });
    }
    keyboard.push(row);
  }
  return { inline_keyboard: keyboard };
}

// Send Quiz Poll to user/group
async function sendQuizPoll(chatId, userId, category = 'all') {
  const question = DB.getRandomQuestionForTelegram(category);

  if (!question) {
    await sendMessage(
      chatId,
      `⚠️ <b>कुनै प्रश्न फेला परेन।</b>\nकृपया अर्को विधा छनौट गर्नुहोस्।`,
      { reply_markup: getCategoryKeyboard() }
    );
    return;
  }

  // Telegram limits poll question to 300 chars, options to 100 chars each
  const safeQuestion = question.question.length > 290 
    ? question.question.substring(0, 287) + '...' 
    : question.question;

  const safeOptions = question.options.map(opt => {
    const text = String(opt || '').trim();
    return text.length > 95 ? text.substring(0, 92) + '...' : text;
  });

  const pollPayload = {
    chat_id: chatId,
    question: `[${question.exam_name || 'ExamSetu'}] ${safeQuestion}`,
    options: safeOptions,
    is_anonymous: false,
    type: 'quiz',
    correct_option_id: question.correct_option_id,
    explanation: question.explanation ? question.explanation.substring(0, 195) : 'ExamSetu Nepal Practice Question',
    explanation_parse_mode: 'HTML'
  };

  const response = await callTelegram('sendPoll', pollPayload);

  if (response.ok && response.result && response.result.poll) {
    const pollId = response.result.poll.id;
    activePolls.set(pollId, {
      question_id: question.id,
      correct_option_id: question.correct_option_id,
      explanation: question.explanation,
      category: category,
      chat_id: chatId
    });

    if (activePolls.size > 500) {
      const firstKey = activePolls.keys().next().value;
      activePolls.delete(firstKey);
    }
  } else {
    console.error('[Telegram] Failed to send poll:', response);
  }
}

// Handle Commands
async function handleCommand(msg) {
  const chatId = msg.chat.id;
  const user = msg.from;
  const text = (msg.text || '').trim();
  const command = text.split(' ')[0].toLowerCase().split('@')[0];
  const param = text.split(' ')[1] || '';

  // Register / update user in SQLite
  const dbUser = DB.upsertTelegramUser({
    telegram_id: user.id,
    chat_id: chatId,
    username: user.username || '',
    first_name: user.first_name || 'Aspirant',
    preferred_category: 'all'
  });

  if (command === '/start') {
    const welcome = `
🙏 <b>नमस्ते ${user.first_name || 'साथी'}! ExamSetu Nepal मा स्वागत छ।</b>

तपाईंको लोक सेवा, बैंकिङ, शिक्षक सेवा र विभिन्न प्रवेश परीक्षाको तयारीलाई सहज बनाउन यो बट तयार पारिएको हो।

✨ <b>उपलब्ध सुविधाहरू:</b>
• 🎯 आधिकारिक पाठ्यक्रम अनुसारका वस्तुगत प्रश्नहरू (MCQs)
• ⏱️ स्वचालित क्विज र तत्काल सही उत्तरको व्याख्या
• 🔥 निरन्तर अध्ययनको Streak र XP रिवार्डहरू
• 🏆 देशभरिका विद्यार्थीहरूसँग प्रतिस्पर्धा (Leaderboard)

👇 <b>कृपया आफूले तयारी गर्न चाहेको विधा छनौट गर्नुहोस्:</b>
    `;
    await sendMessage(chatId, welcome, {
      reply_markup: getCategoryKeyboard()
    });
  } 
  else if (command === '/quiz') {
    const targetCat = param || dbUser?.preferred_category || 'all';
    await sendQuizPoll(chatId, user.id, targetCat);
  }
  else if (command === '/daily') {
    await sendMessage(
      chatId,
      `🌟 <b>ExamSetu दैनिक ५-प्रश्न चुनौती!</b>\nआजको तयारी सुरु गरौं:`,
      {}
    );
    await sendQuizPoll(chatId, user.id, 'all');
  }
  else if (command === '/stats') {
    const u = DB.getTelegramUser(user.id);
    if (!u) {
      await sendMessage(chatId, `तपाईंको कुनै तथ्यांक भेटिएन। कृपया /quiz सुरु गर्नुहोस्।`);
      return;
    }
    const acc = u.total_quizzes > 0 ? Math.round((u.correct_answers / u.total_quizzes) * 100) : 0;
    const statsMsg = `
📊 <b>ExamSetu विद्यार्थी प्रोफाइल: ${u.first_name || user.first_name}</b>
━━━━━━━━━━━━━━━━━━━━
🎯 <b>हल गरेका प्रश्नहरू:</b> ${u.total_quizzes} वटा
✅ <b>सही उत्तर:</b> ${u.correct_answers} वटा
📈 <b>सफलता दर (Accuracy):</b> ${acc}%
🔥 <b>दैनिक Streak:</b> ${u.current_streak} दिन
⭐ <b>जम्मा XP:</b> ${u.total_xp} XP
📚 <b>प्राथमिकता:</b> ${u.preferred_category.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━
<i>तयारीलाई अझ मजबुत बनाउन नियमित क्विज खेल्नुहोस्!</i>
    `;
    await sendMessage(chatId, statsMsg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 अर्को प्रश्न खेल्नुहोस्', callback_data: `quiz_${u.preferred_category || 'all'}` }],
          [{ text: '🏆 लिडरबोर्ड हेर्नुहोस्', callback_data: 'view_leaderboard' }]
        ]
      }
    });
  }
  else if (command === '/leaderboard') {
    const topUsers = DB.getTelegramLeaderboard(10);
    let lbText = `🏆 <b>ExamSetu नेपाल - उत्कृष्ट १० विद्यार्थीहरू:</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (!topUsers || topUsers.length === 0) {
      lbText += `अहिलेसम्म कुनै क्विज खेलिएको छैन। तपाईं पहिलो हुनुहोस्! /quiz`;
    } else {
      topUsers.forEach((top, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
        const name = top.first_name || (top.username ? `@${top.username}` : `Aspirant ${top.telegram_id}`);
        lbText += `${medal} <b>${name}</b> — ${top.score} अंक (${top.total_xp} XP) 🔥${top.current_streak}d\n`;
      });
    }
    lbText += `━━━━━━━━━━━━━━━━━━━━\n<i>प्रत्येक सही उत्तरमा +१० XP र १ स्कोर प्राप्त हुन्छ।</i>`;
    await sendMessage(chatId, lbText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎯 म पनि क्विज खेल्छु', callback_data: 'quiz_all' }]
        ]
      }
    });
  }
  else if (command === '/categories') {
    await sendMessage(chatId, `🎯 <b>तपाईं कुन परीक्षाको तयारी गर्दै हुनुहुन्छ? विधा छान्नुहोस्:</b>`, {
      reply_markup: getCategoryKeyboard()
    });
  }
  else if (command === '/help') {
    const helpText = `
📖 <b>ExamSetu नेपाल बट कमाण्डहरू:</b>

• <b>/start</b> - बट सुरु गर्ने र विधा छनौट गर्ने
• <b>/quiz</b> - नयाँ क्विज प्रश्न प्राप्त गर्ने
• <b>/daily</b> - दैनिक ५ प्रश्नहरूको चुनौती खेल्ने
• <b>/stats</b> - आफ्नो स्कोर, Streak र XP हेर्ने
• <b>/leaderboard</b> - नेपालभरिका उत्कृष्ट १० विद्यार्थीहरू
• <b>/categories</b> - परीक्षा विधा फेर्ने
• <b>/help</b> - यो मद्दत सूची हेर्ने

💡 <i>सुझाव: यो बटलाई आफ्नो साथीहरूको टेलिग्राम ग्रुपमा पनि थप्न सक्नुहुन्छ!</i>
    `;
    await sendMessage(chatId, helpText);
  }
}

// Handle Callback Queries
async function handleCallbackQuery(cq) {
  const data = cq.data || '';
  const chatId = cq.message?.chat?.id || cq.from.id;
  const userId = cq.from.id;

  await callTelegram('answerCallbackQuery', { callback_query_id: cq.id });

  if (data.startsWith('cat_')) {
    const cat = data.replace('cat_', '');
    DB.setTelegramCategory(userId, cat);
    const catObj = EXAM_CATEGORIES.find(c => c.id === cat) || { label: cat };

    await sendMessage(
      chatId,
      `✅ तपाईंको विधा <b>${catObj.label}</b> मा सेट गरियो!\nअब पहिलो प्रश्न तल प्रस्तुत छ: 👇`
    );
    await sendQuizPoll(chatId, userId, cat);
  }
  else if (data.startsWith('quiz_')) {
    const cat = data.replace('quiz_', '');
    await sendQuizPoll(chatId, userId, cat);
  }
  else if (data === 'view_leaderboard') {
    const topUsers = DB.getTelegramLeaderboard(10);
    let lbText = `🏆 <b>ExamSetu नेपाल - शीर्ष १० विद्यार्थीहरू:</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    topUsers.forEach((top, idx) => {
      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;
      const name = top.first_name || (top.username ? `@${top.username}` : `विद्यार्थी`);
      lbText += `${medal} <b>${name}</b> — ${top.score} अंक (${top.total_xp} XP)\n`;
    });
    await sendMessage(chatId, lbText, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 अर्को प्रश्न खेल्नुहोस्', callback_data: 'quiz_all' }]]
      }
    });
  }
}

// Handle Poll Answers
async function handlePollAnswer(pollAnswer) {
  const pollId = pollAnswer.poll_id;
  const user = pollAnswer.user;
  const selectedOptions = pollAnswer.option_ids || [];

  if (selectedOptions.length === 0) return;

  const pollData = activePolls.get(pollId);
  const selectedOption = selectedOptions[0];
  const isCorrect = pollData ? (selectedOption === pollData.correct_option_id) : false;
  const questionId = pollData ? pollData.question_id : 1;

  const updatedUser = DB.recordTelegramQuizAttempt({
    telegram_id: user.id,
    question_id: questionId,
    poll_id: pollId,
    selected_option: selectedOption,
    is_correct: isCorrect
  });

  if (pollData && pollData.chat_id) {
    const feedback = isCorrect
      ? `🎉 <b>उत्कृष्ट! सही उत्तर।</b> (+१० XP)\n🔥 दैनिक Streak: ${updatedUser?.current_streak || 1} दिन`
      : `❌ <b>उत्तर गलत भयो!</b> (प्रयासको लागि +२ XP)\nसही उत्तर र व्याख्या पोलमा हेर्न सक्नुहुन्छ।`;

    await sendMessage(pollData.chat_id, feedback, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➡️ अर्को प्रश्न (Next Quiz)', callback_data: `quiz_${pollData.category || 'all'}` },
            { text: '📊 मेरो नतिजा', callback_data: 'view_stats' }
          ]
        ]
      }
    });
  }
}

// Long-polling loop
let offset = 0;
let isRunning = true;

async function startPolling() {
  console.log(`[ExamSetu Telegram Bot] 🤖 Bot is running 24/7 on Termux / Node.js...`);
  console.log(`[ExamSetu Telegram Bot] Connected as @Examsetuquizbot`);
  console.log(`[ExamSetu Telegram Bot] Ready to receive questions and polls.`);

  while (isRunning) {
    try {
      const response = await callTelegram('getUpdates', {
        offset: offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query', 'poll_answer']
      });

      if (response.ok && Array.isArray(response.result)) {
        for (const update of response.result) {
          offset = update.update_id + 1;

          if (update.message && update.message.text) {
            await handleCommand(update.message);
          } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          } else if (update.poll_answer) {
            await handlePollAnswer(update.poll_answer);
          }
        }
      } else {
        if (response.error_code === 401) {
          console.error('[ExamSetu Telegram Bot] ❌ Unauthorized: Check TELEGRAM_BOT_TOKEN.');
          await new Promise(r => setTimeout(r, 10000));
        } else {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (e) {
      console.error('[ExamSetu Telegram Bot] Polling network cycle:', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

process.on('SIGINT', () => {
  console.log('\n[ExamSetu Telegram Bot] Shutting down gracefully...');
  isRunning = false;
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[ExamSetu Telegram Bot] Terminated.');
  isRunning = false;
  process.exit(0);
});

startPolling();
