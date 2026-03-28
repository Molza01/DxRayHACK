const express = require('express');
const router = express.Router();

const { getAllBuilds, getBuildById } = require('../controllers/buildController');
const { getAnalytics } = require('../controllers/analyticsController');
const { syncGitHub, syncVercel, syncRender, seedDemo } = require('../controllers/githubController');
const { docsSync, docsHealth, docsIssues, docsChangelog, docsFix, docsFixAll } = require('../controllers/docsController');
const { generateReport } = require('../services/analyticsService');

// Build routes
router.get('/builds', getAllBuilds);
router.get('/builds/:id', getBuildById);

// Analytics
router.get('/analytics', getAnalytics);

// Platform sync routes
router.post('/github/sync', syncGitHub);
router.post('/vercel/sync', syncVercel);
router.post('/render/sync', syncRender);

// Docs Scanner routes
router.post('/docs/sync', docsSync);
router.get('/docs/health', docsHealth);
router.get('/docs/issues', docsIssues);
router.get('/docs/changelog', docsChangelog);
router.post('/docs/fix', docsFix);
router.post('/docs/fix-all', docsFixAll);

// Exportable report (JSON)
router.get('/report', async (req, res) => {
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
router.post('/seed', seedDemo);

// Seed scenario-based demo presets
router.post('/seed/:scenario', async (req, res) => {
  try {
    const { seedScenarioData } = require('../services/seedService');
    const result = await seedScenarioData(req.params.scenario);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
});

// Clear all data (for resync)
router.post('/clear', async (req, res) => {
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
