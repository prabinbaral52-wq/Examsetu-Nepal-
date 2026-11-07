const express = require('express');
const router = express.Router();
const DB = require('../models/db');
const { isAuthenticated } = require('../middleware/auth');

// Progress analytics - weak topics for the logged-in user
router.get('/analytics/weak-topics', isAuthenticated, (req, res) => {
  try {
    const userId = req.session.user.id;
    // Simple aggregation - can be expanded with proper DB queries
    const attempts = []; // DB.getUserAttempts(userId) would be ideal
    const topicStats = {};

    // Placeholder structure ready for real data
    const weakTopics = [
      { topic: 'Nepal Constitution', accuracy: 45, attempts: 12 },
      { topic: 'General Mental Ability', accuracy: 52, attempts: 8 },
      { topic: 'Banking Basics', accuracy: 60, attempts: 5 }
    ];

    return res.json({
      success: true,
      weakTopics,
      message: 'Connect real attempt data for personalized analytics.'
    });
  } catch (err) {
    console.error('Analytics error:', err);
    return res.status(500).json({ success: false, message: 'Error loading analytics' });
  }
});

module.exports = router;
