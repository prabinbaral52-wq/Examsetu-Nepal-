#!/usr/bin/env node
/**
 * ExamSetu Nepal - Interactive Telegram Quiz & AI Study Bot
 * Supports:
 * - Interactive MCQ Quiz Polls with Instant Explanations & XP
 * - AI Question Answering with Model Selection (Gemini 3.5 Flash, Lite, Lok Sewa Guru, Concept Explainer)
 * - Group Study Discussions & Thread Mentions
 * - 24/7 Termux & Background Daemon Execution
 */

const fs = require('fs');
const path = require('path');

// 1. Bot & AI Configuration
// Load .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/(^['"]|['"]$)/g, '').trim();
        if (!process.env[key] && val) process.env[key] = val;
      }
    });
  } catch (e) {}
}

const TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '9100822829:AAHxuYYTQ8eI6yPqlxWgTU_fI-oviQjv6wM').trim();
const API_BASE = `https://api.telegram.org/bot${TOKEN}`;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// 2. AI Models & Personas Catalog
const AI_MODELS = {
  'gemini-3.5-flash': {
    id: 'gemini-3.5-flash',
    name: '⚡ Gemini 3.5 Flash',
    badge: 'Smart & Fast',
    desc: 'High intelligence, balanced speed for all subjects',
    systemPrompt: `You are ExamSetu Nepal AI, an expert academic tutor for competitive exams in Nepal (Lok Sewa Aayog, Banking, TSC, SEE, NEB, and Entrance exams).
Respond helpfully, accurately, and politely in the language the student writes (Nepali or English).
Give official syllabus facts, references to Constitution of Nepal 2072 articles, formulas, and step-by-step reasoning where appropriate. Format answers cleanly.`
  },
  'gemini-3.5-flash-lite': {
    id: 'gemini-3.5-flash-lite',
    name: '🚀 Gemini Flash Lite',
    badge: 'Ultra Fast',
    desc: 'Instant responses for quick definitions, dates & facts',
    systemPrompt: `You are ExamSetu Quick AI for Nepali students. Provide rapid, concise, bulleted facts, dates, article numbers, and direct formulas for Lok Sewa and exam preparation.`
  },
  'loksewa-guru': {
    id: 'loksewa-guru',
    modelId: 'gemini-3.5-flash',
    name: '🇳🇵 Lok Sewa Guru (लोक सेवा गुरु)',
    badge: 'Specialist',
    desc: 'Specialized in Lok Sewa Kharidar, Subba & Officer syllabus',
    systemPrompt: `तपाईं 'ExamSetu लोक सेवा गुरु' हुनुहुन्छ — नेपालको लोक सेवा आयोग (खरिदार, ना.सु., शाखा अधिकृत), संस्थान र सुरक्षा निकायका परीक्षार्थीहरूका आधिकारिक डिजिटल मार्गदर्शक।
नेपाली भाषामा उत्तर दिनुहोस्। नेपालको संविधान २०७२, भूगोल, इतिहास, समसामयिक घटना, ऐन कानुन र प्रशासन सम्बन्धी प्रमाणिक तथ्य, धारा र उपधाराहरू स्पष्ट उल्लेख गर्नुहोस्। सम्झन सजिलो हुने सूत्र (Mnemonic) पनि दिनुहोस्।`
  },
  'concept-explainer': {
    id: 'concept-explainer',
    modelId: 'gemini-3.5-flash',
    name: '🧠 Concept Explainer (IQ & Math)',
    badge: 'Deep Reasoner',
    desc: 'Step-by-step mathematical reasoning, shortcuts & logic',
    systemPrompt: `You are ExamSetu Concept Explainer. When students ask about Quantitative Aptitude, Mental Ability (IQ), Science, or Math puzzles, break down the explanation step-by-step with clear formulas, alternative mental shortcuts (tricks), and verification.`
  },
  'gpt-study-buddy': {
    id: 'gpt-study-buddy',
    modelId: 'gemini-3.5-flash',
    name: '🌐 Universal Study Buddy',
    badge: 'General',
    desc: 'Friendly academic assistant for school, college & general GK',
    systemPrompt: `You are ExamSetu Study Buddy, a warm, motivating, and highly articulate study partner for students in Nepal. Explain concepts with clear analogies, practice examples, and encouraging tips.`
  }
};

// 3. Load Questions Bank (from data/questions.json)
let questions = [];
const qPath = path.join(__dirname, 'data', 'questions.json');
try {
  if (fs.existsSync(qPath)) {
    questions = JSON.parse(fs.readFileSync(qPath, 'utf8'));
    console.log(`[ExamSetu Bot] 📚 Loaded ${questions.length} questions from ${qPath}`);
  }
} catch (e) {
  console.warn('[ExamSetu Bot] Questions load note:', e.message);
}

// Fallback questions if questions.json was empty or missing
if (!questions || questions.length === 0) {
  questions = [
    {
      id: 1,
      exam: "Lok Sewa",
      subject: "General Knowledge",
      question: "नेपालको संविधान (२०७२) अनुसार कतिवटा मौलिक हकको व्यवस्था गरिएको छ?",
      options: { A: "२५ वटा", B: "३१ वटा", C: "३५ वटा", D: "२१ वटा" },
      correct_answer: "B",
      explanation: "नेपालको संविधान २०७२ को भाग ३ अन्तर्गत धारा १६ देखि ४६ सम्म जम्मा ३१ वटा मौलिक हकहरूको व्यवस्था छ।"
    },
    {
      id: 2,
      exam: "Lok Sewa",
      subject: "General Knowledge",
      question: "क्षेत्रफलको आधारमा नेपालको सबैभन्दा ठूलो राष्ट्रिय निकुञ्ज कुन हो?",
      options: { A: "चितवन राष्ट्रिय निकुञ्ज", B: "सगरमाथा राष्ट्रिय निकुञ्ज", C: "शे-फोक्सुण्डो राष्ट्रिय निकुञ्ज", D: "बर्दिया राष्ट्रिय निकुञ्ज" },
      correct_answer: "C",
      explanation: "शे-फोक्सुण्डो राष्ट्रिय निकुञ्ज डोल्पा र मुगु जिल्लामा फैलिएको ३,५५५ वर्ग कि.मी. क्षेत्रफल ओगटेको सबैभन्दा ठूलो निकुञ्ज हो।"
    },
    {
      id: 3,
      exam: "Banking",
      subject: "Banking & Economics",
      question: "नेपाल राष्ट्र बैंक ऐन कहिले जारी भएको हो?",
      options: { A: "२०१२", B: "२०५८", C: "२०४८", D: "२०६३" },
      correct_answer: "B",
      explanation: "नेपाल राष्ट्र बैंक ऐन २०५८ अनुसार नेपाल राष्ट्र बैंक एक स्वायत्त र संगठित संस्थाको रूपमा स्थापित छ।"
    }
  ];
}

// 4. User profile & model settings database
const userDbPath = path.join(__dirname, 'data', 'telegram-users.json');
let userStats = {};
try {
  if (fs.existsSync(userDbPath)) {
    userStats = JSON.parse(fs.readFileSync(userDbPath, 'utf8'));
  }
} catch (e) {}

function saveUserStats() {
  try {
    const dir = path.dirname(userDbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(userDbPath, JSON.stringify(userStats, null, 2));
  } catch (e) {}
}

function getUserModel(userId) {
  return (userStats[userId] && userStats[userId].preferredModel) || 'gemini-3.5-flash';
}

function setUserModel(userId, modelKey) {
  if (!userStats[userId]) {
    userStats[userId] = { id: userId, name: 'Aspirant', score: 0, total: 0, correct: 0, streak: 1, xp: 10 };
  }
  userStats[userId].preferredModel = modelKey;
  saveUserStats();
}

// 5. Telegram API Helpers
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

async function sendChatAction(chatId, action = 'typing') {
  return await callTelegram('sendChatAction', { chat_id: chatId, action: action });
}

// Format Markdown safely into Telegram HTML
function formatTelegramHTML(text) {
  if (!text) return '';
  let str = String(text);

  // Escape HTML entities first
  str = str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Preformatted blocks
  str = str.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
  // Inline code
  str = str.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold: **text** or __text__
  str = str.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  str = str.replace(/__([^_]+)__/g, '<b>$1</b>');
  // Italic: *text* or _text_
  str = str.replace(/(?<!\w)\*([^*]+)\*(?!\w)/g, '<i>$1</i>');
  str = str.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<i>$1</i>');

  return str;
}

async function sendMessage(chatId, text, options = {}) {
  const parseMode = options.parse_mode !== undefined ? options.parse_mode : 'HTML';
  const cleanOptions = { ...options };
  delete cleanOptions.parse_mode;

  return await callTelegram('sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: parseMode,
    ...cleanOptions
  });
}

async function sendLongMessage(chatId, rawText, options = {}) {
  const formatted = formatTelegramHTML(rawText);
  if (formatted.length <= 4000) {
    return await sendMessage(chatId, formatted, options);
  }

  // Split into chunks of ~3600 characters
  let remaining = formatted;
  while (remaining.length > 0) {
    if (remaining.length <= 3600) {
      await sendMessage(chatId, remaining, options);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n', 3600);
    if (splitIdx === -1) splitIdx = 3600;
    const chunk = remaining.substring(0, splitIdx);
    await sendMessage(chatId, chunk);
    remaining = remaining.substring(splitIdx).trim();
    await new Promise(r => setTimeout(r, 150));
  }
}

// 6. Gemini AI Inference Engine with Resilience
async function askGemini(prompt, modelKey = 'gemini-3.5-flash', context = '') {
  const apiKey = process.env.GEMINI_API_KEY || GEMINI_API_KEY;
  if (!apiKey) {
    return '⚠️ <b>AI Error:</b> GEMINI_API_KEY is not configured in the environment. Please configure it in your Secrets or .env file.';
  }

  const modelConf = AI_MODELS[modelKey] || AI_MODELS['gemini-3.5-flash'];
  const baseModel = modelConf.modelId || modelConf.id;

  // Fallback chain for maximum reliability
  const fallbackModels = [baseModel, 'gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const uniqueModels = [...new Set(fallbackModels)];

  for (const model of uniqueModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const fullPrompt = `${modelConf.systemPrompt}\n\n${context ? `[Context]: ${context}\n\n` : ''}User Question: ${prompt}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 1200
          }
        }),
        signal: AbortSignal.timeout(16000)
      });

      const data = await res.json();
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text.trim();
      }
      if (data?.error) {
        console.warn(`[AI Note - ${model}]:`, data.error.message);
      }
    } catch (err) {
      console.warn(`[AI Request Failed - ${model}]:`, err.message);
    }
  }

  return '⚠️ क्षमा गर्नुहोस्, AI सर्भरमा हाल अत्यधिक चाप रहेको छ। कृपया केही सेकेन्डपछि पुनः प्रयास गर्नुहोस्।';
}

// 7. Interactive Keyboards
function getModelKeyboard(currentModel = 'gemini-3.5-flash') {
  const rows = Object.entries(AI_MODELS).map(([key, item]) => {
    const isSelected = key === currentModel;
    return [{
      text: `${isSelected ? '✅ ' : ''}${item.name} (${item.badge})`,
      callback_data: `model_${key}`
    }];
  });

  rows.push([
    { text: '💬 Ask AI Now', callback_data: 'prompt_ai_help' },
    { text: '🎯 Back to Quiz', callback_data: 'cat_all' }
  ]);

  return { inline_keyboard: rows };
}

const EXAM_CATEGORIES = [
  { id: 'loksewa', label: '🇳🇵 लोक सेवा (Lok Sewa)', match: 'lok sewa' },
  { id: 'banking', label: '🏦 बैंकिङ (Banking)', match: 'banking' },
  { id: 'tsc', label: '👨‍🏫 शिक्षक सेवा (TSC)', match: 'tsc' },
  { id: 'all', label: '🎲 सबै विषय (All Mix)', match: '' }
];

function getCategoryKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🇳🇵 लोक सेवा (Lok Sewa)', callback_data: 'cat_loksewa' },
        { text: '🏦 बैंकिङ (Banking)', callback_data: 'cat_banking' }
      ],
      [
        { text: '👨‍🏫 शिक्षक सेवा (TSC)', callback_data: 'cat_tsc' },
        { text: '🎲 सबै विषय (All Mix)', callback_data: 'cat_all' }
      ],
      [
        { text: '🤖 AI Model Selection', callback_data: 'open_models' }
      ]
    ]
  };
}

// 8. Interactive Native Quiz Polls
const activePolls = new Map();

function getRandomQuestion(category = '') {
  let pool = questions;
  if (category && category !== 'all') {
    const catObj = EXAM_CATEGORIES.find(c => c.id === category);
    const search = (catObj ? catObj.match : category).toLowerCase();
    const filtered = questions.filter(q => 
      (q.exam && q.exam.toLowerCase().includes(search)) || 
      (q.subject && q.subject.toLowerCase().includes(search))
    );
    if (filtered.length > 0) pool = filtered;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx];
}

async function sendQuizPoll(chatId, userId, category = 'all') {
  const q = getRandomQuestion(category);
  if (!q) {
    await sendMessage(chatId, 'कुनै प्रश्न भेटिएन। कृपया अर्को विधा छान्नुहोस्: /categories');
    return;
  }

  let opts = [];
  if (q.options) {
    opts = [
      String(q.options.A || q.option_a || 'A'),
      String(q.options.B || q.option_b || 'B'),
      String(q.options.C || q.option_c || 'C'),
      String(q.options.D || q.option_d || 'D')
    ];
  } else {
    opts = ['Option A', 'Option B', 'Option C', 'Option D'];
  }

  const map = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
  const correctLetter = (q.correct_answer || 'A').toUpperCase().trim().replace(/OPTION\s*/i, '');
  const correctId = map[correctLetter] !== undefined ? map[correctLetter] : 0;

  const titlePrefix = q.exam ? `[${q.exam}] ` : `[ExamSetu] `;
  const fullQ = titlePrefix + q.question;
  const safeQ = fullQ.length > 295 ? fullQ.substring(0, 292) + '...' : fullQ;
  const safeOptions = opts.map(o => o.length > 95 ? o.substring(0, 92) + '...' : o);
  const safeExpl = (q.explanation || 'ExamSetu Nepal Practice Question').substring(0, 195);

  const payload = {
    chat_id: chatId,
    question: safeQ,
    options: safeOptions,
    type: 'quiz',
    is_anonymous: false,
    correct_option_id: correctId,
    explanation: safeExpl,
    explanation_parse_mode: 'HTML'
  };

  const res = await callTelegram('sendPoll', payload);
  if (res.ok && res.result && res.result.poll) {
    activePolls.set(res.result.poll.id, {
      question_id: q.id,
      correct_index: correctId,
      explanation: q.explanation,
      chatId: chatId,
      category: category,
      rawQuestion: q
    });
    if (activePolls.size > 500) {
      activePolls.delete(activePolls.keys().next().value);
    }
  }
}

// 9. Message Handling (Commands, Mentions, AI Discussion)
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const isGroup = msg.chat.type === 'group' || msg.chat.type === 'supergroup';
  const user = msg.from;
  if (!user || user.is_bot) return;

  const text = (msg.text || '').trim();
  if (!text) return;

  // Initialize user profile
  if (!userStats[user.id]) {
    userStats[user.id] = {
      id: user.id,
      name: user.first_name || 'Aspirant',
      username: user.username || '',
      score: 0,
      total: 0,
      correct: 0,
      streak: 1,
      xp: 10,
      preferredModel: 'gemini-3.5-flash',
      lastDate: new Date().toISOString().split('T')[0]
    };
    saveUserStats();
  }

  const parts = text.split(/\s+/);
  const firstWord = parts[0].toLowerCase();
  const cmd = firstWord.split('@')[0];
  const query = text.replace(/^[^\s]+\s*/, '').trim();

  // 1. /start command
  if (cmd === '/start') {
    const welcome = `
🙏 <b>नमस्ते ${user.first_name || 'साथी'}! ExamSetu Nepal मा स्वागत छ।</b>

तपाईंको लोक सेवा, बैंकिङ, र शिक्षक सेवा परीक्षाको तयारीलाई सहज बनाउन यो बट तयार पारिएको हो।

✨ <b>मुख्य सुविधाहरू:</b>
• 🎯 आधिकारिक वस्तुगत प्रश्नहरू (MCQs) र क्विज पोल
• 🤖 <b>AI Tutor</b> — जुनसुकै प्रश्न सोध्न सकिने (/ai वा सिधै लेखेर)
• ⚙️ <b>Model Selection</b> — आफूलाई मनपर्ने AI मोडल छान्ने (/model)
• 👥 <b>Group Discussion</b> — समूहमा सँगै अध्ययन र छलफल (/discuss)
• 🏆 राष्ट्रिय लिडरबोर्ड र दैनिक Streak

👇 <b>तयारी गर्न विधा वा AI मोडल छनौट गर्नुहोस्:</b>
    `;
    await sendMessage(chatId, welcome, { reply_markup: getCategoryKeyboard() });
    return;
  }

  // 2. /model or /models - Model selection
  if (cmd === '/model' || cmd === '/models') {
    const currentModel = getUserModel(user.id);
    const activeInfo = AI_MODELS[currentModel] || AI_MODELS['gemini-3.5-flash'];
    const modelMsg = `
🤖 <b>ExamSetu AI Model Selection:</b>
━━━━━━━━━━━━━━━━━━━━
हाल सक्रिय मोडल: <b>${activeInfo.name}</b> (${activeInfo.badge})
<i>${activeInfo.desc}</i>

तपाईंको अध्ययन आवश्यकता अनुसार तलको सूचीबाट AI मोडल वा शिक्षक शैली छनौट गर्नुहोस्: 👇
    `;
    await sendMessage(chatId, modelMsg, { reply_markup: getModelKeyboard(currentModel) });
    return;
  }

  // 3. /ai or /ask - Ask AI direct question
  if (cmd === '/ai' || cmd === '/ask') {
    if (!query) {
      await sendMessage(chatId, '💡 <b>कृपया प्रश्न पनि लेख्नुहोस्:</b>\nउदाहरण: <code>/ai नेपालको संविधान २०७२ मा कति मौलिक हक छन्?</code>');
      return;
    }

    await sendChatAction(chatId, 'typing');
    const selectedModel = getUserModel(user.id);
    const modelInfo = AI_MODELS[selectedModel] || AI_MODELS['gemini-3.5-flash'];

    const reply = await askGemini(query, selectedModel);
    const header = `🤖 <b>[${modelInfo.name}]</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    await sendLongMessage(chatId, `${header}${reply}\n\n<i>💡 मोडल परिवर्तन गर्न: /model</i>`);
    return;
  }

  // 4. /discuss - Group study discussion starter
  if (cmd === '/discuss') {
    const topic = query || 'नेपालको वर्तमान आर्थिक अवस्था र मौद्रिक नीति';
    await sendChatAction(chatId, 'typing');

    const discussPrompt = `We are a group of Nepali students preparing for Lok Sewa and competitive exams.
Topic: "${topic}"
1. Provide a brief 3-bullet summary of the core exam points for this topic.
2. Present 2 key conceptual debate questions to discuss together.
3. Suggest 1 common tricky question asked in exams regarding this topic.
Respond in clear, motivating Nepali.`;

    const discussReply = await askGemini(discussPrompt, getUserModel(user.id));
    const card = `
👥 <b>ExamSetu समूह अध्ययन छलफल (Group Discussion)</b>
📌 <b>विषय:</b> ${topic}
━━━━━━━━━━━━━━━━━━━━
${discussReply}
━━━━━━━━━━━━━━━━━━━━
<i>यस विषयमा आफ्ना विचारहरू तल कमेन्ट गर्नुहोस् र एकअर्कासँग सिक्नुहोस्!</i>
    `;
    await sendLongMessage(chatId, card);
    return;
  }

  // 5. /quiz command
  if (cmd === '/quiz') {
    await sendQuizPoll(chatId, user.id, 'all');
    return;
  }

  // 6. /daily command
  if (cmd === '/daily') {
    await sendMessage(chatId, '🌟 <b>ExamSetu दैनिक ५-प्रश्न चुनौती!</b>\nआजको पहिलो प्रश्न:');
    await sendQuizPoll(chatId, user.id, 'all');
    return;
  }

  // 7. /stats command
  if (cmd === '/stats') {
    const u = userStats[user.id];
    const acc = u.total > 0 ? Math.round((u.correct / u.total) * 100) : 0;
    const currentModel = getUserModel(user.id);
    const modelName = (AI_MODELS[currentModel] && AI_MODELS[currentModel].name) || 'Gemini 3.5 Flash';

    const msgText = `
📊 <b>ExamSetu प्रोफाइल: ${u.name}</b>
━━━━━━━━━━━━━━━━━━━━
🎯 <b>हल गरेका प्रश्नहरू:</b> ${u.total} वटा
✅ <b>सही उत्तर:</b> ${u.correct} वटा
📈 <b>Accuracy:</b> ${acc}%
🔥 <b>दैनिक Streak:</b> ${u.streak} दिन
⭐ <b>जम्मा XP:</b> ${u.xp} XP
🤖 <b>सक्रिय AI मोडल:</b> ${modelName}
━━━━━━━━━━━━━━━━━━━━
<i>नियमित अभ्यास गर्नुहोस् र सफल हुनुहोस्!</i>
    `;
    await sendMessage(chatId, msgText, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 अर्को प्रश्न खेल्नुहोस्', callback_data: 'quiz_all' }],
          [{ text: '⚙️ AI मोडल बदल्नुहोस्', callback_data: 'open_models' }]
        ]
      }
    });
    return;
  }

  // 8. /leaderboard command
  if (cmd === '/leaderboard') {
    const all = Object.values(userStats).sort((a, b) => b.score - a.score || b.xp - a.xp).slice(0, 10);
    let lb = `🏆 <b>ExamSetu नेपाल - शीर्ष १० विद्यार्थीहरू:</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    if (all.length === 0) {
      lb += `अहिलेसम्म कुनै क्विज खेलिएको छैन। तपाईं पहिलो हुनुहोस्! /quiz`;
    } else {
      all.forEach((u, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        lb += `${medal} <b>${u.name}</b> — ${u.score} अंक (${u.xp} XP) 🔥${u.streak}d\n`;
      });
    }
    lb += `━━━━━━━━━━━━━━━━━━━━\n<i>प्रत्येक सही उत्तरमा +१० XP प्राप्त हुन्छ।</i>`;
    await sendMessage(chatId, lb, {
      reply_markup: {
        inline_keyboard: [[{ text: '🎯 म पनि क्विज खेल्छु', callback_data: 'quiz_all' }]]
      }
    });
    return;
  }

  // 9. /categories command
  if (cmd === '/categories') {
    await sendMessage(chatId, '🎯 <b>विधा छान्नुहोस्:</b>', { reply_markup: getCategoryKeyboard() });
    return;
  }

  // 10. /help command
  if (cmd === '/help') {
    const help = `
📖 <b>ExamSetu Nepal बट कमाण्डहरू:</b>
━━━━━━━━━━━━━━━━━━━━
• <b>/quiz</b> - नयाँ बहुबैकल्पिक क्विज खेल्ने
• <b>/model</b> - AI मोडल वा शिक्षक शैली छनौट गर्ने
• <b>/ai &lt;प्रश्न&gt;</b> - AI सँग कुनै पनि विषयमा सोध्ने
• <b>/discuss &lt;विषय&gt;</b> - साथीहरूसँग समूह छलफल सुरु गर्ने
• <b>/stats</b> - आफ्नो स्कोर, XP र दैनिक Streak हेर्ने
• <b>/leaderboard</b> - उत्कृष्ट १० विद्यार्थीहरूको सूची
• <b>/categories</b> - परीक्षा विधा छान्ने (लोक सेवा, बैंकिङ, TSC)

<i>💡 सुझाव: निजी च्याटमा तपाईंले कुनै पनि प्रश्न सिधै लेख्दा AI ले तुरुन्तै व्याख्या गरिदिन्छ!</i>
    `;
    await sendMessage(chatId, help);
    return;
  }

  // 11. Group Mention or Direct 1-on-1 AI Conversation
  const isMentioned = text.toLowerCase().includes('@examsetuquizbot');
  const isReplyToBot = msg.reply_to_message && msg.reply_to_message.from && msg.reply_to_message.from.is_bot;

  if (!isGroup || isMentioned || isReplyToBot) {
    // Clean mention string
    let cleanQuery = text.replace(/@examsetuquizbot/gi, '').trim();
    if (!cleanQuery) {
      await sendMessage(chatId, 'नमस्ते! म ExamSetu AI हुँ। तपाईं मलाई कुनै पनि प्रश्न सोध्न सक्नुहुन्छ: <code>/ai नेपालको इतिहास</code> वा सिधै लेख्नुहोस्!');
      return;
    }

    await sendChatAction(chatId, 'typing');
    const selectedModel = getUserModel(user.id);
    const modelInfo = AI_MODELS[selectedModel] || AI_MODELS['gemini-3.5-flash'];

    let context = '';
    if (msg.reply_to_message && msg.reply_to_message.text) {
      context = `In reply to message: "${msg.reply_to_message.text}"`;
    }

    const aiAnswer = await askGemini(cleanQuery, selectedModel, context);
    const replyHeader = `🤖 <b>[${modelInfo.name}]</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    await sendLongMessage(chatId, `${replyHeader}${aiAnswer}\n\n<i>💡 मोडल परिवर्तन गर्न: /model</i>`);
  }
}

// 10. Callback Queries (Inline Buttons & Model Switching)
async function handleCallbackQuery(cq) {
  const data = cq.data || '';
  const chatId = cq.message?.chat?.id || cq.from.id;
  const userId = cq.from.id;

  await callTelegram('answerCallbackQuery', { callback_query_id: cq.id });

  // Model switching
  if (data.startsWith('model_')) {
    const modelKey = data.replace('model_', '');
    if (AI_MODELS[modelKey]) {
      setUserModel(userId, modelKey);
      const m = AI_MODELS[modelKey];
      const notify = `✅ <b>सफल भयो!</b>\nतपाईंको AI मोडल <b>${m.name}</b> (${m.badge}) मा परिवर्तन गरियो।\n<i>${m.desc}</i>`;
      await sendMessage(chatId, notify, { reply_markup: getModelKeyboard(modelKey) });
    }
    return;
  }

  if (data === 'open_models') {
    const currentModel = getUserModel(userId);
    await sendMessage(chatId, '🤖 <b>AI मोडल छान्नुहोस्:</b>', { reply_markup: getModelKeyboard(currentModel) });
    return;
  }

  if (data === 'prompt_ai_help') {
    await sendMessage(chatId, '💬 <b>AI सँग प्रश्न सोध्ने तरिका:</b>\nकुनै पनि सन्देश सिधै टाइप गर्नुहोस् वा <code>/ai नेपालको राजधानी कहाँ हो?</code> लेख्नुहोस्।');
    return;
  }

  if (data.startsWith('cat_')) {
    const cat = data.replace('cat_', '');
    const catObj = EXAM_CATEGORIES.find(c => c.id === cat) || { label: cat };
    await sendMessage(chatId, `✅ विधा <b>${catObj.label}</b> चयन गरियो। प्रश्न तल प्रस्तुत छ: 👇`);
    await sendQuizPoll(chatId, userId, cat);
    return;
  }

  if (data.startsWith('quiz_')) {
    const cat = data.replace('quiz_', '');
    await sendQuizPoll(chatId, userId, cat);
    return;
  }

  if (data === 'view_leaderboard') {
    const all = Object.values(userStats).sort((a, b) => b.score - a.score).slice(0, 10);
    let lb = `🏆 <b>ExamSetu नेपाल - शीर्ष १० विद्यार्थीहरू:</b>\n━━━━━━━━━━━━━━━━━━━━\n`;
    all.forEach((u, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
      lb += `${medal} <b>${u.name}</b> — ${u.score} अंक (${u.xp} XP)\n`;
    });
    await sendMessage(chatId, lb, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 अर्को प्रश्न खेल्नुहोस्', callback_data: 'quiz_all' }]]
      }
    });
    return;
  }
}

// 11. Poll Answer Handler
async function handlePollAnswer(answer) {
  const pollData = activePolls.get(answer.poll_id);
  const selected = (answer.option_ids || [])[0];
  if (selected === undefined) return;

  const user = answer.user;
  const isCorrect = pollData ? (selected === pollData.correct_index) : false;

  if (!userStats[user.id]) {
    userStats[user.id] = { id: user.id, name: user.first_name || 'Aspirant', score: 0, total: 0, correct: 0, streak: 1, xp: 10 };
  }
  const u = userStats[user.id];
  u.total += 1;
  if (isCorrect) {
    u.correct += 1;
    u.score += 1;
    u.xp += 10;
  } else {
    u.xp += 2;
  }
  saveUserStats();

  if (pollData && pollData.chatId) {
    const feedback = isCorrect 
      ? `🎉 <b>उत्कृष्ट! सही उत्तर।</b> (+१० XP)` 
      : `❌ <b>उत्तर मिलेन!</b> (प्रयासको लागि +२ XP)`;
    await sendMessage(pollData.chatId, feedback, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '➡️ अर्को प्रश्न (Next Quiz)', callback_data: `quiz_${pollData.category || 'all'}` }],
          [{ text: '🤖 Ask AI Why', callback_data: `prompt_ai_help` }]
        ]
      }
    });
  }
}

// 12. Register Commands with Telegram
async function registerBotCommands() {
  const commands = [
    { command: 'quiz', description: '🎯 Play an interactive MCQ quiz poll' },
    { command: 'ai', description: '🤖 Ask AI tutor any question (/ai <query>)' },
    { command: 'discuss', description: '👥 Start a group study discussion' },
    { command: 'model', description: '⚙️ Choose AI Model & Teacher Persona' },
    { command: 'stats', description: '📊 View your score, accuracy, streak & XP' },
    { command: 'leaderboard', description: '🏆 National ranking of top learners' },
    { command: 'daily', description: '🌟 Daily 5-question mock challenge' },
    { command: 'categories', description: '📚 Switch exam categories' },
    { command: 'help', description: '📖 Guide & command cheat-sheet' }
  ];
  const res = await callTelegram('setMyCommands', { commands });
  if (res.ok) {
    console.log('[ExamSetu Bot] ✅ Telegram Menu Commands registered successfully!');
  }
}

// 13. Polling Engine
let offset = 0;
async function start() {
  console.log(`=======================================================`);
  console.log(`🇳🇵 ExamSetu Telegram Bot with AI connected as @Examsetuquizbot`);
  console.log(`🧠 AI Models: Gemini 3.5 Flash, Lite, Lok Sewa Guru, Concept Explainer`);
  console.log(`🚀 Ready to receive /quiz, /ai, /model, /discuss on Telegram!`);
  console.log(`=======================================================`);

  await registerBotCommands();

  while (true) {
    try {
      const res = await callTelegram('getUpdates', {
        offset: offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query', 'poll_answer']
      });

      if (res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            await handleMessage(update.message);
          } else if (update.callback_query) {
            await handleCallbackQuery(update.callback_query);
          } else if (update.poll_answer) {
            await handlePollAnswer(update.poll_answer);
          }
        }
      } else {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.error('[Polling Loop Error]:', e.message);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

start();
