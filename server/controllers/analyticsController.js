const { computeAnalytics } = require('../services/analyticsService');

async function getAnalytics(req, res) {
  try {
    const repoName = req.query.repo || null;
    const analytics = await computeAnalytics(repoName, req.user._id);
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAnalytics };
