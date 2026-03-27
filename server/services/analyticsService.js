const Build = require('../models/Build');
const Step = require('../models/Step');

// Compute full analytics payload
async function computeAnalytics() {
  const [
    totalBuilds,
    successBuilds,
    failedBuilds,
    avgDuration,
    slowestSteps,
    flakySteps,
    dailyTrends,
    stageTrends,
    insights,
  ] = await Promise.all([
    getTotalBuilds(),
    getCountByStatus('success'),
    getCountByStatus('failure'),
    getAvgBuildDuration(),
    getSlowestSteps(),
    getFlakySteps(),
    getDailyTrends(),
    getStageTrends(),
    generateInsights(),
  ]);

  const successRate = totalBuilds > 0 ? ((successBuilds / totalBuilds) * 100).toFixed(1) : 0;
  const failureRate = totalBuilds > 0 ? ((failedBuilds / totalBuilds) * 100).toFixed(1) : 0;
  const healthScore = computeHealthScore(successRate, avgDuration, flakySteps.length);

  return {
    totalBuilds,
    successBuilds,
    failedBuilds,
    avgDuration: Math.round(avgDuration),
    successRate: parseFloat(successRate),
    failureRate: parseFloat(failureRate),
    healthScore,
    slowestSteps,
    flakySteps,
    dailyTrends,
    stageTrends,
    insights,
  };
}

async function getTotalBuilds() {
  return Build.countDocuments();
}

async function getCountByStatus(status) {
  return Build.countDocuments({ status });
}

async function getAvgBuildDuration() {
  const result = await Build.aggregate([
    { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
  ]);
  return result[0]?.avgDuration || 0;
}

// Rank top 10 slowest steps by average duration
async function getSlowestSteps() {
  return Step.aggregate([
    { $group: {
      _id: '$stepName',
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
      count: { $sum: 1 },
    }},
    { $sort: { avgDuration: -1 } },
    { $limit: 10 },
    { $project: {
      stepName: '$_id',
      avgDuration: { $round: ['$avgDuration', 1] },
      maxDuration: 1,
      count: 1,
      _id: 0,
    }},
  ]);
}

// Identify flaky steps: those with mixed success/failure outcomes or retries
async function getFlakySteps() {
  const steps = await Step.aggregate([
    { $group: {
      _id: '$stepName',
      totalRuns: { $sum: 1 },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
      successes: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
      totalRetries: { $sum: '$retryCount' },
    }},
    { $match: {
      totalRuns: { $gte: 2 },
      $expr: { $and: [{ $gt: ['$failures', 0] }, { $gt: ['$successes', 0] }] },
    }},
    { $project: {
      stepName: '$_id',
      totalRuns: 1,
      failures: 1,
      successes: 1,
      totalRetries: 1,
      instabilityScore: {
        $round: [
          { $multiply: [
            { $divide: ['$failures', '$totalRuns'] },
            100,
          ]},
          1,
        ],
      },
      _id: 0,
    }},
    { $sort: { instabilityScore: -1 } },
    { $limit: 10 },
  ]);
  return steps;
}

// Daily build trends (last 30 days)
async function getDailyTrends() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return Build.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      totalBuilds: { $sum: 1 },
      avgDuration: { $avg: '$duration' },
      successes: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
    }},
    { $sort: { _id: 1 } },
    { $project: {
      date: '$_id',
      totalBuilds: 1,
      avgDuration: { $round: ['$avgDuration', 0] },
      successes: 1,
      failures: 1,
      successRate: {
        $round: [{ $multiply: [{ $divide: ['$successes', '$totalBuilds'] }, 100] }, 1],
      },
      _id: 0,
    }},
  ]);
}

// Stage/step performance trends
async function getStageTrends() {
  return Step.aggregate([
    { $group: {
      _id: '$stepName',
      avgDuration: { $avg: '$duration' },
      minDuration: { $min: '$duration' },
      maxDuration: { $max: '$duration' },
      count: { $sum: 1 },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
    }},
    { $sort: { avgDuration: -1 } },
    { $limit: 15 },
    { $project: {
      stepName: '$_id',
      avgDuration: { $round: ['$avgDuration', 1] },
      minDuration: 1,
      maxDuration: 1,
      count: 1,
      failures: 1,
      failureRate: {
        $round: [{ $multiply: [{ $divide: ['$failures', '$count'] }, 100] }, 1],
      },
      _id: 0,
    }},
  ]);
}

// Generate actionable insights
async function generateInsights() {
  const insights = [];
  const slowest = await getSlowestSteps();
  const flaky = await getFlakySteps();

  // Bottleneck insights
  for (const step of slowest.slice(0, 3)) {
    if (step.avgDuration > 60) {
      insights.push({
        type: 'bottleneck',
        severity: step.avgDuration > 300 ? 'high' : step.avgDuration > 120 ? 'medium' : 'low',
        title: `Slow step: ${step.stepName}`,
        message: `"${step.stepName}" averages ${step.avgDuration}s. Consider caching, parallelizing, or optimizing this step.`,
        metric: `${step.avgDuration}s avg`,
      });
    }
  }

  // Flaky step insights
  for (const step of flaky.slice(0, 3)) {
    insights.push({
      type: 'flaky',
      severity: step.instabilityScore > 50 ? 'high' : step.instabilityScore > 25 ? 'medium' : 'low',
      title: `Flaky step: ${step.stepName}`,
      message: `"${step.stepName}" has a ${step.instabilityScore}% failure rate across ${step.totalRuns} runs. Investigate root cause.`,
      metric: `${step.instabilityScore}% instability`,
    });
  }

  // Regression detection
  const recentAvg = await getRecentAvgDuration(7);
  const historicalAvg = await getRecentAvgDuration(30);
  if (historicalAvg > 0 && recentAvg > 0) {
    const change = ((recentAvg - historicalAvg) / historicalAvg) * 100;
    if (change > 15) {
      insights.push({
        type: 'regression',
        severity: change > 50 ? 'high' : change > 25 ? 'medium' : 'low',
        title: 'Build duration regression detected',
        message: `Average build time increased by ${change.toFixed(0)}% compared to the 30-day average. Investigate recent changes.`,
        metric: `+${change.toFixed(0)}%`,
      });
    }
  }

  // Health check
  const totalBuilds = await getTotalBuilds();
  const failCount = await getCountByStatus('failure');
  if (totalBuilds > 0) {
    const failRate = (failCount / totalBuilds) * 100;
    if (failRate > 30) {
      insights.push({
        type: 'health',
        severity: 'high',
        title: 'High failure rate',
        message: `${failRate.toFixed(1)}% of builds are failing. This indicates systemic issues in the pipeline.`,
        metric: `${failRate.toFixed(1)}% failure rate`,
      });
    }
  }

  return insights;
}

async function getRecentAvgDuration(days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await Build.aggregate([
    { $match: { createdAt: { $gte: since } } },
    { $group: { _id: null, avg: { $avg: '$duration' } } },
  ]);
  return result[0]?.avg || 0;
}

function computeHealthScore(successRate, avgDuration, flakyCount) {
  // Score from 0-100
  let score = 100;
  // Penalize for low success rate
  score -= Math.max(0, (100 - successRate) * 0.5);
  // Penalize for high avg duration (>5min = penalty)
  if (avgDuration > 300) score -= Math.min(20, (avgDuration - 300) / 30);
  // Penalize for flaky steps
  score -= flakyCount * 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

module.exports = { computeAnalytics };
