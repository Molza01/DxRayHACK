const { computeAnalytics } = require('../services/analyticsService');

async function getAnalytics(req, res) {
  try {
    const analytics = await computeAnalytics();
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAnalytics };
