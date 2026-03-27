const express = require('express');
const router = express.Router();

const { getAllBuilds, getBuildById } = require('../controllers/buildController');
const { getAnalytics } = require('../controllers/analyticsController');
const { syncGitHub, seedDemo } = require('../controllers/githubController');

// Build routes
router.get('/builds', getAllBuilds);
router.get('/builds/:id', getBuildById);

// Analytics
router.get('/analytics', getAnalytics);

// GitHub sync
router.post('/github/sync', syncGitHub);

// Seed demo data
router.post('/seed', seedDemo);

// Clear all data (for resync)
router.post('/clear', async (req, res) => {
  try {
    const Build = require('../models/Build');
    const Step = require('../models/Step');
    await Promise.all([Build.deleteMany({}), Step.deleteMany({})]);
    res.json({ message: 'All data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
