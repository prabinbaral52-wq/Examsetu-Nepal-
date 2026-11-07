const express = require('express');
const router = express.Router();
const DB = require('../models/db');
const { isAuthenticated } = require('../middleware/auth');

// Leaderboard - top users by total XP
router.get('/leaderboard', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    // Simple query using existing DB methods or raw if available
    // Assuming we can access the db instance or add a helper later
    // For now, return a placeholder that can be expanded once DB helpers exist
    const topUsers = []; // TODO: implement DB.getTopUsersByXP(limit)
    return res.json({
      success: true,
      leaderboard: topUsers,
      message: 'Leaderboard endpoint ready. Add DB.getTopUsersByXP() for full data.'
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return res.status(500).json({ success: false, message: 'Error fetching leaderboard' });
  }
});

// Daily Challenge - returns a fixed set of questions for the day
router.get('/daily-challenge', isAuthenticated, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    // Simple daily seed based on date
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const questions = DB.getQuestionsByExamAndSubject('Lok Sewa', 'General Knowledge', 10);
    // Shuffle lightly based on seed
    const dailyQuestions = questions.slice(0, 10).map((q, i) => ({
      id: q.id,
      question: q.question,
      options: { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d },
      topic: q.topic,
      difficulty: q.difficulty
    }));

    return res.json({
      success: true,
      date: today,
      challengeId: `daily-${today}`,
      questions: dailyQuestions,
      rewardXp: 50
    });
  } catch (err) {
    console.error('Daily challenge error:', err);
    return res.status(500).json({ success: false, message: 'Error loading daily challenge' });
  }
});

// Submit daily challenge
router.post('/daily-challenge/submit', isAuthenticated, (req, res) => {
  try {
    const { answers, timeTakenSeconds } = req.body;
    if (!answers) {
      return res.status(400).json({ success: false, message: 'Answers required' });
    }

    // Reuse existing test submission logic pattern
    const userId = req.session.user.id;
    let correct = 0;
    Object.keys(answers).forEach(qId => {
      const q = DB.getQuestionById(parseInt(qId));
      if (q && answers[qId].toUpperCase() === q.correct_answer.toUpperCase()) {
        correct++;
      }
    });

    const total = Object.keys(answers).length;
    const percentage = Math.round((correct / total) * 100);

    // Award XP
    // DB.addXp(userId, 50) would be ideal here

    return res.json({
      success: true,
      result: {
        correct,
        total,
        percentage,
        xpEarned: percentage >= 60 ? 50 : 20,
        message: percentage >= 60 ? 'Great job on today\'s challenge!' : 'Keep practicing!'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Error submitting daily challenge' });
  }
});

module.exports = router;
