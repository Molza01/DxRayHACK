const express = require('express');
const router = express.Router();

const { getAllBuilds, getBuildById } = require('../controllers/buildController');
const { getAnalytics } = require('../controllers/analyticsController');
const { syncGitHub, syncVercel, syncRender, seedDemo } = require('../controllers/githubController');
const { docsSync, docsHealth, docsIssues, docsChangelog, docsFix, docsFixAll } = require('../controllers/docsController');
const { signup, login, getMe, connectGitHub, getGitHubRepos } = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');
const { generateReport } = require('../services/analyticsService');

// ──── Auth routes (public) ────
router.post('/auth/signup', signup);
router.post('/auth/login', login);

// ──── Auth routes (protected) ────
router.get('/auth/me', authMiddleware, getMe);
router.post('/auth/github/connect', authMiddleware, connectGitHub);
router.get('/auth/github/repos', authMiddleware, getGitHubRepos);

// ──── Protected feature routes ────

// Build routes
router.get('/builds', authMiddleware, getAllBuilds);
router.get('/builds/:id', authMiddleware, getBuildById);

// Analytics
router.get('/analytics', authMiddleware, getAnalytics);

// Platform sync routes
router.post('/github/sync', authMiddleware, syncGitHub);
router.post('/vercel/sync', authMiddleware, syncVercel);
router.post('/render/sync', authMiddleware, syncRender);

// Docs Scanner routes
router.post('/docs/sync', authMiddleware, docsSync);
router.get('/docs/health', authMiddleware, docsHealth);
router.get('/docs/issues', authMiddleware, docsIssues);
router.get('/docs/changelog', authMiddleware, docsChangelog);
router.post('/docs/fix', authMiddleware, docsFix);
router.post('/docs/fix-all', authMiddleware, docsFixAll);

// Exportable report (JSON)
router.get('/report', authMiddleware, async (req, res) => {
  try {
    const report = await generateReport();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SSE endpoint for live updates
router.get('/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial heartbeat
  res.write('data: {"type":"connected"}\n\n');

  // Set up interval to push analytics updates
  const interval = setInterval(async () => {
    try {
      const { computeAnalytics } = require('../services/analyticsService');
      const data = await computeAnalytics();
      res.write(`data: ${JSON.stringify({ type: 'analytics', data })}\n\n`);
    } catch (e) {
      // Ignore errors in SSE
    }
  }, 30000); // Every 30 seconds

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Seed demo data
router.post('/seed', authMiddleware, seedDemo);

// Seed scenario-based demo presets
router.post('/seed/:scenario', authMiddleware, async (req, res) => {
  try {
    const { seedScenarioData } = require('../services/seedService');
    const result = await seedScenarioData(req.params.scenario);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Clear all data (for resync)
router.post('/clear', authMiddleware, async (req, res) => {
  try {
    const Build = require('../models/Build');
    const Step = require('../models/Step');
    const Doc = require('../models/Doc');
    const DocIssue = require('../models/DocIssue');
    await Promise.all([Build.deleteMany({}), Step.deleteMany({}), Doc.deleteMany({}), DocIssue.deleteMany({})]);
    res.json({ message: 'All data cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
