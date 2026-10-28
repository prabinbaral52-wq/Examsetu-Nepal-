const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const DB = require('../models/db');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

// Simple in-memory rate-limiter for sensitive routes (login, register)
const rateLimits = {};
function checkRateLimit(ip, endpoint, maxHits = 15, windowMs = 60000) {
  const key = `${ip}_${endpoint}`;
  const now = Date.now();
  if (!rateLimits[key]) {
    rateLimits[key] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  if (now > rateLimits[key].resetTime) {
    rateLimits[key] = { count: 1, resetTime: now + windowMs };
    return true;
  }
  rateLimits[key].count++;
  return rateLimits[key].count <= maxHits;
}

// --- Auth Routes ---

// Register
router.post('/auth/register', (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'register', 10, 60000)) {
      return res.status(429).json({ success: false, message: 'Too many registration requests. Please wait a minute.' });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields (Name, Email, Password) are required.' });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const existing = DB.getUserByEmail(trimmedEmail);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const newId = DB.createUser(name.trim(), trimmedEmail, hash, 'student');

    const newUser = { id: newId, name: name.trim(), email: trimmedEmail, role: 'student', current_streak: 1, total_xp: 50 };
    req.session.user = newUser;

    return res.status(201).json({ success: true, message: 'Registration successful! Welcome to ExamSetu.', user: newUser });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// Login
router.post('/auth/login', (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(ip, 'login', 15, 60000)) {
      return res.status(429).json({ success: false, message: 'Too many login attempts. Please wait a minute.' });
    }

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const user = DB.getUserByEmail(trimmedEmail);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const match = bcrypt.compareSync(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      current_streak: user.current_streak || 1,
      total_xp: user.total_xp || 50
    };
    req.session.user = sessionUser;

    return res.json({ success: true, message: 'Login successful.', user: sessionUser });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Failed to logout.' });
    }
    res.clearCookie(process.env.SESSION_NAME || 'examsetu_sid');
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

// Current User Info
router.get('/auth/me', (req, res) => {
  if (req.session && req.session.user) {
    const fresh = DB.getUserById(req.session.user.id);
    return res.json({ success: true, user: fresh || req.session.user });
  }
  return res.json({ success: false, user: null });
});

// --- Country Routes ---

router.get('/countries', (req, res) => {
  try {
    const countries = DB.getAllCountries();
    return res.json({ success: true, countries });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/countries', isAuthenticated, isAdmin, (req, res) => {
  try {
    const { name, code, currency, flag_emoji, is_active } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Country name and code are required.' });
    }
    DB.createCountry(name, code.toUpperCase(), currency || 'NPR', flag_emoji || '🌐', is_active ?? 1);
    return res.json({ success: true, message: 'Country created successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Public Exam & Subject Routes ---

// Get all active exams (with country filter)
router.get('/exams', (req, res) => {
  try {
    const country = req.query.country || 'NP';
    const exams = DB.getAllExams(country);
    const stats = DB.getOverallStats();
    return res.json({ success: true, exams, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get subjects under an exam
router.get('/exams/:slug/subjects', (req, res) => {
  try {
    const exam = DB.getExamBySlug(req.params.slug);
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam category not found.' });
    }
    const subjects = DB.getSubjectsByExamSlug(req.params.slug);
    return res.json({ success: true, exam, subjects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Get topics for a subject
router.get('/subjects/:slug/topics', (req, res) => {
  try {
    const topics = DB.getTopicsBySubjectSlug(req.params.slug);
    const subject = DB.getSubjectBySlug(req.params.slug);
    return res.json({ success: true, subject, topics });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Practice Mode & Mock Test Questions ---

// Fetch questions for Practice Mode (includes instant answers & explanations)
router.get('/practice/questions', (req, res) => {
  try {
    const { exam, subject, topic, limit = 20 } = req.query;
    const questions = DB.getQuestionsByExamAndSubject(exam, subject, parseInt(limit), topic);

    const formatted = questions.map((q) => ({
      id: q.id,
      exam: q.exam_name,
      subject: q.subject_name,
      topic: q.topic,
      difficulty: q.difficulty,
      language: q.language || 'both',
      question: q.question,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d
      },
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      marks: q.marks || 1
    }));

    return res.json({ success: true, count: formatted.length, questions: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Start a Timed Mock Test (sanitized questions without leaking answers)
router.post('/tests/start', (req, res) => {
  try {
    const { exam, subject, topic, count, durationMinutes } = req.body;
    const qCount = parseInt(count) || 20;
    const questions = DB.getQuestionsByExamAndSubject(exam, subject, qCount, topic);

    if (questions.length === 0) {
      return res.status(404).json({ success: false, message: 'No published questions found for this selection.' });
    }

    const testQuestions = questions.map((q) => ({
      id: q.id,
      exam: q.exam_name,
      subject: q.subject_name,
      topic: q.topic,
      difficulty: q.difficulty,
      question: q.question,
      options: {
        A: q.option_a,
        B: q.option_b,
        C: q.option_c,
        D: q.option_d
      }
    }));

    // Dynamically scale duration based on count (approx 50-60 seconds per question, min 10m)
    const duration = durationMinutes || Math.max(10, Math.round(qCount * 0.9));

    return res.json({
      success: true,
      test: {
        exam: exam || 'Lok Sewa',
        subject: subject || 'General Practice',
        topic: topic || 'All Topics',
        totalQuestions: testQuestions.length,
        durationMinutes: duration,
        questions: testQuestions
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Submit a test and compute result
router.post('/tests/:id/submit', (req, res) => {
  try {
    const { userAnswers, timeTakenSeconds, examName, subjectName, mode = 'mock' } = req.body;

    if (!userAnswers || typeof userAnswers !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid submission payload.' });
    }

    const questionIds = Object.keys(userAnswers).map((id) => parseInt(id));
    if (questionIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No questions submitted.' });
    }

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const detailedResults = [];

    for (const qId of questionIds) {
      const q = DB.getQuestionById(qId);
      if (!q) continue;

      const selected = userAnswers[qId] || null;
      let isCorrect = false;

      if (!selected || selected === '') {
        skippedCount++;
      } else if (selected.toUpperCase() === q.correct_answer.toUpperCase()) {
        isCorrect = true;
        correctCount++;
      } else {
        wrongCount++;
      }

      detailedResults.push({
        questionId: q.id,
        question: q.question,
        topic: q.topic,
        difficulty: q.difficulty,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d
        },
        userAnswer: selected,
        correctAnswer: q.correct_answer,
        isCorrect,
        explanation: q.explanation
      });
    }

    const totalQuestions = questionIds.length;
    const score = correctCount;
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    const userId = req.session && req.session.user ? req.session.user.id : null;

    // Save test attempt to database
    const attemptId = DB.createTestAttempt({
      user_id: userId,
      mode: mode,
      exam_name: examName || 'Lok Sewa',
      subject_name: subjectName || 'General Practice',
      practice_set_title: `${subjectName || 'Mock'} Practice Set`,
      score,
      total_questions: totalQuestions,
      correct_count: correctCount,
      wrong_count: wrongCount,
      skipped_count: skippedCount,
      time_taken_seconds: parseInt(timeTakenSeconds) || 0,
      percentage
    });

    // Save answers
    for (const r of detailedResults) {
      DB.saveTestAnswer(attemptId, r.questionId, r.userAnswer, r.isCorrect);
    }

    return res.json({
      success: true,
      attemptId,
      result: {
        score,
        totalQuestions,
        correctCount,
        wrongCount,
        skippedCount,
        percentage,
        isPassed: percentage >= 40,
        timeTakenSeconds: parseInt(timeTakenSeconds) || 0,
        xpEarned: correctCount * 5 + 10,
        detailedResults
      }
    });
  } catch (err) {
    console.error('Test submit error:', err);
    return res.status(500).json({ success: false, message: 'Error evaluating test answers.' });
  }
});

// Get result of an attempt
router.get('/tests/:id/result', (req, res) => {
  try {
    const attemptId = parseInt(req.params.id);
    const attempt = DB.getTestAttemptById(attemptId);
    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Test attempt record not found.' });
    }

    const answers = DB.getTestAttemptAnswers(attemptId);
    const detailedResults = answers.map((a) => ({
      questionId: a.question_id,
      question: a.question,
      topic: a.topic,
      difficulty: a.difficulty,
      options: {
        A: a.option_a,
        B: a.option_b,
        C: a.option_c,
        D: a.option_d
      },
      userAnswer: a.selected_option,
      correctAnswer: a.correct_answer,
      isCorrect: Boolean(a.is_correct),
      explanation: a.explanation
    }));

    return res.json({
      success: true,
      attempt,
      result: {
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        correctCount: attempt.correct_count,
        wrongCount: attempt.wrong_count,
        skippedCount: attempt.skipped_count,
        percentage: attempt.percentage,
        isPassed: attempt.percentage >= 40,
        timeTakenSeconds: attempt.time_taken_seconds,
        xpEarned: attempt.xp_earned || 20,
        detailedResults
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Question Reporting ---

router.post('/questions/:id/report', (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    const { reason, details } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Report reason is required.' });
    }
    const userId = req.session && req.session.user ? req.session.user.id : null;
    DB.createQuestionReport(questionId, userId, reason, details);
    return res.json({ success: true, message: 'Thank you. Our editorial team will review this question.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Gamification & Student Dashboard ---

router.get('/user/dashboard', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = DB.getUserById(userId);
    const history = DB.getUserTestHistory(userId);
    const bookmarks = DB.getUserBookmarks(userId);
    const wrongAnswers = DB.getUserWrongAnswers(userId);
    const badges = DB.getUserBadges(userId);
    const allBadges = DB.getAllBadges();
    const leaderboard = DB.getWeeklyLeaderboard();

    const totalTests = history.length;
    let avgScore = 0;
    let bestScore = 0;

    if (totalTests > 0) {
      const sum = history.reduce((acc, h) => acc + (h.percentage || 0), 0);
      avgScore = Math.round(sum / totalTests);
      bestScore = Math.max(...history.map((h) => h.percentage || 0));
    }

    return res.json({
      success: true,
      user,
      stats: {
        testsTaken: totalTests,
        averageScore: avgScore,
        bestScore,
        currentStreak: user?.current_streak || 1,
        totalXp: user?.total_xp || 50,
        bookmarksCount: bookmarks.length,
        wrongNotebookCount: wrongAnswers.length
      },
      recentTests: history,
      bookmarks,
      wrongNotebook: wrongAnswers,
      badges,
      allBadges,
      leaderboard
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Bookmarks
router.post('/user/bookmarks', isAuthenticated, (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) {
      return res.status(400).json({ success: false, message: 'Question ID required.' });
    }
    DB.addBookmark(req.session.user.id, questionId);
    return res.json({ success: true, message: 'Question saved to bookmarks.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/user/bookmarks/:id', isAuthenticated, (req, res) => {
  try {
    const questionId = parseInt(req.params.id);
    DB.removeBookmark(req.session.user.id, questionId);
    return res.json({ success: true, message: 'Bookmark removed.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// --- Admin Panel Routes ---

router.get('/admin/stats', isAuthenticated, isAdmin, (req, res) => {
  try {
    const stats = DB.getOverallStats();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/questions', isAuthenticated, isAdmin, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const status = req.query.status || 'all';
    const questions = DB.getAllQuestions(limit, 0, status);
    return res.json({ success: true, count: questions.length, questions });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/questions', isAuthenticated, isAdmin, (req, res) => {
  try {
    const q = req.body;
    if (!q.question || !q.exam || !q.correct_answer) {
      return res.status(400).json({ success: false, message: 'Question, exam, and correct answer are required.' });
    }
    const newId = DB.createQuestion(q);
    return res.status(201).json({ success: true, message: 'Question added successfully.', id: newId });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/questions/:id', isAuthenticated, isAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const q = req.body;
    DB.updateQuestion(id, q);
    return res.json({ success: true, message: 'Question updated successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/admin/questions/:id/status', isAuthenticated, isAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    if (!['draft', 'under_review', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }
    DB.updateQuestionStatus(id, status);
    return res.json({ success: true, message: `Question status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/admin/questions/:id', isAuthenticated, isAdmin, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    DB.deleteQuestion(id);
    return res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/reports', isAuthenticated, isAdmin, (req, res) => {
  try {
    const reports = DB.getAllQuestionReports();
    return res.json({ success: true, reports });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/reports/:id/action', isAuthenticated, isAdmin, (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { action } = req.body; // 'dismiss', 'resolve', 'archive'
    DB.resolveQuestionReport(reportId, action);
    return res.json({ success: true, message: `Report processed with action: ${action}` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/admin/import', isAuthenticated, isAdmin, (req, res) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide an array of valid questions in JSON.' });
    }
    let imported = 0;
    for (const q of questions) {
      if (q.question && (q.correct_answer || q.correctAnswer)) {
        DB.createQuestion({
          country_id: q.country_id || 1,
          exam: q.exam || q.exam_name || 'Lok Sewa',
          subject: q.subject || q.subject_name || 'General Knowledge',
          topic: q.topic || 'General',
          difficulty: q.difficulty || 'medium',
          language: q.language || 'both',
          question: q.question,
          options: q.options || {
            A: q.option_a,
            B: q.option_b,
            C: q.option_c,
            D: q.option_d
          },
          correct_answer: q.correct_answer || q.correctAnswer,
          explanation: q.explanation || '',
          marks: q.marks || 1,
          status: q.status || 'published'
        });
        imported++;
      }
    }
    return res.json({ success: true, message: `Successfully imported ${imported} questions.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/attempts', isAuthenticated, isAdmin, (req, res) => {
  try {
    const attempts = DB.getAllAttempts(50);
    return res.json({ success: true, attempts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/admin/users', isAuthenticated, isAdmin, (req, res) => {
  try {
    const users = DB.getAllUsers();
    return res.json({ success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Telegram Bot Endpoints
router.get('/telegram/stats', (req, res) => {
  try {
    const stats = DB.getTelegramBotStats();
    const isConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN !== 'your_telegram_bot_token_here');
    return res.json({
      success: true,
      stats,
      configured: isConfigured
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/telegram/leaderboard', (req, res) => {
  try {
    const leaderboard = DB.getTelegramLeaderboard(15);
    return res.json({ success: true, leaderboard });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

