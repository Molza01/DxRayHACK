const Build = require('../models/Build');
const Step = require('../models/Step');

// Helper: get build IDs for a repo filter (used to filter steps)
async function getBuildIdsForRepo(repoName) {
  if (!repoName) return null;
  const builds = await Build.find({ repoName }).select('_id').lean();
  return builds.map(b => b._id);
}

// Helper: build match filter
function buildFilter(repoName) {
  return repoName ? { repoName } : {};
}

// Helper: step filter using buildIds
function stepFilter(buildIds) {
  return buildIds ? { buildId: { $in: buildIds } } : {};
}

// Compute full analytics payload
async function computeAnalytics(repoName) {
  // Pre-fetch buildIds if repo filter is active
  const buildIds = await getBuildIdsForRepo(repoName);
  const bf = buildFilter(repoName);
  const sf = stepFilter(buildIds);

  // Also get list of all repos for the frontend selector
  const availableRepos = await Build.distinct('repoName');

  const [
    totalBuilds,
    successBuilds,
    failedBuilds,
    avgDuration,
    slowestSteps,
    flakySteps,
    dailyTrends,
    stageTrends,
    heatmapData,
    retryAnalysis,
    bottleneckImpact,
  ] = await Promise.all([
    Build.countDocuments(bf),
    Build.countDocuments({ ...bf, status: 'success' }),
    Build.countDocuments({ ...bf, status: 'failure' }),
    getAvgBuildDuration(bf),
    getSlowestSteps(sf),
    getFlakySteps(sf),
    getDailyTrends(bf),
    getStageTrends(sf),
    getBuildHeatmap(bf),
    getRetryAnalysis(sf, bf),
    getBottleneckImpact(sf),
  ]);

  const insights = await generateInsights(bf, sf, totalBuilds, successBuilds, failedBuilds, avgDuration);

  const successRate = totalBuilds > 0 ? ((successBuilds / totalBuilds) * 100).toFixed(1) : 0;
  const failureRate = totalBuilds > 0 ? ((failedBuilds / totalBuilds) * 100).toFixed(1) : 0;
  const healthScore = computeHealthScore(successRate, avgDuration, flakySteps.length);
  const recommendations = generateRecommendations(slowestSteps, flakySteps, bottleneckImpact, avgDuration, parseFloat(successRate));

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
    heatmapData,
    retryAnalysis,
    insights,
    bottleneckImpact,
    recommendations,
    availableRepos,
  };
}

async function getAvgBuildDuration(bf) {
  const result = await Build.aggregate([
    { $match: bf },
    { $group: { _id: null, avgDuration: { $avg: '$duration' } } },
  ]);
  return result[0]?.avgDuration || 0;
}

async function getSlowestSteps(sf) {
  return Step.aggregate([
    { $match: sf },
    { $group: {
      _id: '$stepName',
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
      minDuration: { $min: '$duration' },
      count: { $sum: 1 },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
    }},
    { $sort: { avgDuration: -1 } },
    { $limit: 10 },
    { $project: {
      stepName: '$_id',
      avgDuration: { $round: ['$avgDuration', 1] },
      maxDuration: 1,
      minDuration: 1,
      count: 1,
      failures: 1,
      _id: 0,
    }},
  ]);
}

async function getFlakySteps(sf) {
  return Step.aggregate([
    { $match: sf },
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
        $round: [{ $multiply: [{ $divide: ['$failures', '$totalRuns'] }, 100] }, 1],
      },
      _id: 0,
    }},
    { $sort: { instabilityScore: -1 } },
    { $limit: 10 },
  ]);
}

async function getBuildHeatmap(bf) {
  return Build.aggregate([
    { $match: bf },
    { $addFields: { effectiveDate: { $ifNull: ['$runDate', '$createdAt'] } } },
    { $group: {
      _id: {
        day: { $dayOfWeek: '$effectiveDate' },
        hour: { $hour: '$effectiveDate' },
      },
      count: { $sum: 1 },
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
      successes: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
    }},
    { $project: {
      day: { $subtract: ['$_id.day', 1] },
      hour: '$_id.hour',
      count: 1,
      avgDuration: { $round: ['$avgDuration', 0] },
      maxDuration: 1,
      failures: 1,
      successes: 1,
      _id: 0,
    }},
    { $sort: { day: 1, hour: 1 } },
  ]);
}

async function getRetryAnalysis(sf, bf) {
  const retrySteps = await Step.aggregate([
    { $match: sf },
    { $group: {
      _id: '$stepName',
      totalRuns: { $sum: 1 },
      totalRetries: { $sum: '$retryCount' },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
      successes: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
    }},
    { $match: { totalRuns: { $gte: 2 }, failures: { $gt: 0 } } },
    { $project: {
      stepName: '$_id',
      totalRuns: 1, totalRetries: 1, failures: 1, successes: 1,
      avgDuration: { $round: ['$avgDuration', 1] },
      maxDuration: 1,
      retryRate: { $round: [{ $multiply: [{ $divide: ['$totalRetries', '$totalRuns'] }, 100] }, 1] },
      failureRate: { $round: [{ $multiply: [{ $divide: ['$failures', '$totalRuns'] }, 100] }, 1] },
      _id: 0,
    }},
    { $sort: { failureRate: -1 } },
    { $limit: 10 },
  ]);

  const timePatterns = await Step.aggregate([
    { $match: { ...sf, status: 'failure' } },
    { $group: { _id: { $hour: { $ifNull: ['$startedAt', '$createdAt'] } }, failureCount: { $sum: 1 } } },
    { $sort: { failureCount: -1 } },
    { $limit: 5 },
    { $project: { hour: '$_id', failureCount: 1, _id: 0 } },
  ]);

  const branchPatterns = await Build.aggregate([
    { $match: { ...bf, status: 'failure' } },
    { $group: { _id: '$branch', failureCount: { $sum: 1 } } },
    { $sort: { failureCount: -1 } },
    { $limit: 5 },
    { $project: { branch: '$_id', failureCount: 1, _id: 0 } },
  ]);

  return { retrySteps, timePatterns, branchPatterns };
}

async function getDailyTrends(bf) {
  const dateRange = await Build.aggregate([
    { $match: bf },
    { $addFields: { effectiveDate: { $ifNull: ['$runDate', '$createdAt'] } } },
    { $group: {
      _id: null,
      earliest: { $min: '$effectiveDate' },
      latest: { $max: '$effectiveDate' },
    }},
  ]);

  if (!dateRange.length || !dateRange[0].earliest) return [];

  const earliest = new Date(dateRange[0].earliest);
  const latest = new Date(dateRange[0].latest);
  const now = new Date();

  const startDate = new Date(Math.max(earliest.getTime(), now.getTime() - 90 * 86400000));
  const endDate = now > latest ? now : latest;

  const raw = await Build.aggregate([
    { $match: bf },
    { $addFields: { effectiveDate: { $ifNull: ['$runDate', '$createdAt'] } } },
    { $match: { effectiveDate: { $gte: startDate } } },
    { $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$effectiveDate' } },
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
      successRate: { $round: [{ $multiply: [{ $divide: ['$successes', '$totalBuilds'] }, 100] }, 1] },
      _id: 0,
    }},
  ]);

  const dataByDate = {};
  for (const row of raw) dataByDate[row.date] = row;

  const filled = [];
  const dayCount = Math.ceil((endDate - startDate) / 86400000) + 1;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    filled.push(dataByDate[key] || { date: key, totalBuilds: 0, avgDuration: 0, successes: 0, failures: 0, successRate: 0 });
  }
  return filled;
}

async function getStageTrends(sf) {
  return Step.aggregate([
    { $match: sf },
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
      minDuration: 1, maxDuration: 1, count: 1, failures: 1,
      failureRate: { $round: [{ $multiply: [{ $divide: ['$failures', '$count'] }, 100] }, 1] },
      _id: 0,
    }},
  ]);
}

async function getBottleneckImpact(sf) {
  const totalDurationResult = await Step.aggregate([
    { $match: sf },
    { $group: { _id: null, totalDuration: { $sum: '$duration' } } },
  ]);
  const totalPipelineDuration = totalDurationResult[0]?.totalDuration || 1;

  const steps = await Step.aggregate([
    { $match: sf },
    { $group: {
      _id: '$stepName',
      totalDuration: { $sum: '$duration' },
      avgDuration: { $avg: '$duration' },
      maxDuration: { $max: '$duration' },
      minDuration: { $min: '$duration' },
      count: { $sum: 1 },
      failures: { $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] } },
    }},
    { $sort: { totalDuration: -1 } },
    { $limit: 10 },
  ]);

  return steps.map((step) => {
    const contributionPct = Math.round((step.totalDuration / totalPipelineDuration) * 1000) / 10;
    const durationVariance = step.maxDuration - step.minDuration;
    const failureRate = step.count > 0 ? Math.round((step.failures / step.count) * 1000) / 10 : 0;
    const impactScore = Math.round(
      (contributionPct * 0.4) + (Math.min(durationVariance / 10, 30) * 0.3) + (failureRate * 0.3)
    );
    return {
      stepName: step._id,
      totalDuration: Math.round(step.totalDuration),
      avgDuration: Math.round(step.avgDuration * 10) / 10,
      maxDuration: step.maxDuration,
      minDuration: step.minDuration,
      count: step.count,
      contributionPct,
      durationVariance: Math.round(durationVariance),
      failureRate,
      impactScore: Math.min(100, impactScore),
      estimatedSavings: Math.round(step.avgDuration * 0.3),
    };
  });
}

function analyzeRootCause(stepName, failureRate, avgDuration, maxDuration) {
  const causes = [];
  if (maxDuration > avgDuration * 3) causes.push('High duration variance suggests intermittent resource contention or network instability');
  const name = stepName.toLowerCase();
  if (name.includes('test') || name.includes('spec')) {
    causes.push(failureRate > 30 ? 'High test failure rate — likely flaky assertions, race conditions, or timing-dependent tests' : 'Intermittent test failures — check for shared state or external service dependencies');
  }
  if (name.includes('install') || name.includes('dependencies') || name.includes('npm') || name.includes('yarn')) causes.push('Dependency installation failures — registry timeouts, version conflicts, or lock file issues');
  if (name.includes('build') || name.includes('compile') || name.includes('bundle')) causes.push('Build failures — check for memory limits (OOM), TypeScript errors, or missing env variables');
  if (name.includes('deploy')) causes.push('Deployment failures — health check timeouts, resource limits, or container startup issues');
  if (name.includes('lint') || name.includes('format')) causes.push('Linting failures — inconsistent formatting or new lint rules; consider auto-fixing in CI');
  if (name.includes('docker') || name.includes('image')) causes.push('Docker build failures — base image availability, layer caching, or Dockerfile issues');
  if (name.includes('push') || name.includes('publish') || name.includes('upload')) causes.push('Artifact publishing failures — registry auth, network, or storage limits');
  if (name.includes('health') || name.includes('smoke')) causes.push('Health check failures — service needs longer startup time or downstream deps unavailable');
  if (name.includes('checkout') || name.includes('clone')) causes.push('Source checkout failures — repo permissions, LFS quota, or network issues');
  if (causes.length === 0) causes.push('Review step logs for error patterns — common causes: timeouts, permission errors, resource exhaustion');
  return causes;
}

async function generateInsights(bf, sf, totalBuilds, successBuilds, failedBuilds, avgDuration) {
  const insights = [];
  const slowest = await getSlowestSteps(sf);
  const flaky = await getFlakySteps(sf);

  for (const step of slowest.slice(0, 3)) {
    if (step.avgDuration > 10) {
      const rootCauses = analyzeRootCause(step.stepName, (step.failures / step.count) * 100, step.avgDuration, step.maxDuration);
      insights.push({
        type: 'bottleneck',
        severity: step.avgDuration > 300 ? 'high' : step.avgDuration > 60 ? 'medium' : 'low',
        title: `Slow step: ${step.stepName}`,
        message: `"${step.stepName}" averages ${step.avgDuration}s (max: ${step.maxDuration}s). Consider caching, parallelizing, or optimizing.`,
        metric: `${step.avgDuration}s avg`,
        rootCause: rootCauses,
      });
    }
  }

  for (const step of flaky.slice(0, 3)) {
    const rootCauses = analyzeRootCause(step.stepName, step.instabilityScore, 0, 0);
    insights.push({
      type: 'flaky',
      severity: step.instabilityScore > 50 ? 'high' : step.instabilityScore > 25 ? 'medium' : 'low',
      title: `Flaky step: ${step.stepName}`,
      message: `"${step.stepName}" has ${step.instabilityScore}% failure rate across ${step.totalRuns} runs.${step.totalRetries > 0 ? ` Retried ${step.totalRetries} times.` : ''}`,
      metric: `${step.instabilityScore}% instability`,
      rootCause: rootCauses,
    });
  }

  const cancelledCount = await Build.countDocuments({ ...bf, status: 'cancelled' });
  if (cancelledCount > 0 && totalBuilds > 0) {
    const cancelRate = (cancelledCount / totalBuilds) * 100;
    insights.push({
      type: 'flaky',
      severity: cancelRate > 20 ? 'high' : cancelRate > 10 ? 'medium' : 'low',
      title: 'Cancelled builds detected',
      message: `${cancelledCount} build(s) (${cancelRate.toFixed(1)}%) were cancelled.`,
      metric: `${cancelledCount} cancelled`,
      rootCause: ['Builds may be cancelled by new pushes or manual aborts of long-running pipelines'],
    });
  }

  if (avgDuration >= 900) {
    insights.push({
      type: 'bottleneck', severity: 'high',
      title: 'Average builds exceed 15 minutes',
      message: `Average build time is ${Math.round(avgDuration / 60)} minutes. This severely impacts developer productivity.`,
      metric: `${Math.round(avgDuration / 60)}min avg`,
      rootCause: ['Parallelize independent steps', 'Implement caching for dependencies and build artifacts', 'Split monolithic pipelines', 'Use incremental builds'],
    });
  } else if (avgDuration >= 600) {
    insights.push({
      type: 'bottleneck', severity: 'medium',
      title: 'Builds approaching 15-minute threshold',
      message: `Average build time is ${Math.round(avgDuration / 60)} minutes.`,
      metric: `${Math.round(avgDuration / 60)}min avg`,
      rootCause: ['Optimize the slowest steps before builds breach the 15-minute mark', 'Implement build caching strategies'],
    });
  }

  if (totalBuilds > 0 && failedBuilds > 0) {
    const failRate = (failedBuilds / totalBuilds) * 100;
    if (failRate > 30) {
      insights.push({
        type: 'health', severity: 'high',
        title: 'High failure rate',
        message: `${failRate.toFixed(1)}% of builds are failing (${failedBuilds}/${totalBuilds}).`,
        metric: `${failRate.toFixed(1)}% failure rate`,
        rootCause: ['Identify most frequently failing steps', 'Check if failures are on specific branches or times', 'Review infrastructure changes'],
      });
    }
  }

  if (totalBuilds > 0 && failedBuilds === 0) {
    const sr = totalBuilds > 0 ? (successBuilds / totalBuilds) * 100 : 0;
    insights.push({
      type: 'health', severity: 'low',
      title: 'Pipeline health is excellent',
      message: `${sr.toFixed(1)}% success rate across ${totalBuilds} builds. No failures detected.`,
      metric: `${sr.toFixed(1)}% success`,
    });
  }

  return insights;
}

function generateRecommendations(slowestSteps, flakySteps, bottleneckImpact, avgDuration, successRate) {
  const recs = [];
  let priority = 1;

  const installStep = (bottleneckImpact || []).find(s => s.stepName.toLowerCase().includes('install') || s.stepName.toLowerCase().includes('dependencies'));
  if (installStep && installStep.avgDuration > 20) {
    recs.push({ priority: priority++, category: 'cache', title: 'Cache dependency installation', description: `"${installStep.stepName}" averages ${installStep.avgDuration}s (${installStep.contributionPct}% of pipeline). Caching can reduce by 60-80%.`, estimatedSaving: `${Math.round(installStep.avgDuration * 0.7)}s per build`, effort: 'low', impact: 'high' });
  }

  const topBn = (bottleneckImpact || []).filter(s => s.contributionPct > 15);
  if (topBn.length >= 2) {
    const ts = topBn.reduce((sum, s) => sum + s.estimatedSavings, 0);
    recs.push({ priority: priority++, category: 'parallel', title: 'Parallelize independent stages', description: `${topBn.length} steps each contribute >15% of total time. Parallel execution could halve wall time.`, estimatedSaving: `${Math.round(ts * 0.5)}s per build`, effort: 'medium', impact: 'high' });
  }

  if (flakySteps.length > 0) {
    const w = flakySteps[0];
    recs.push({ priority: priority++, category: 'reliability', title: `Fix flaky step: ${w.stepName}`, description: `"${w.stepName}" has ${w.instabilityScore}% instability across ${w.totalRuns} runs.`, estimatedSaving: `${Math.round(avgDuration * w.failures * 0.5 / Math.max(w.totalRuns, 1))}s avg wasted per build`, effort: 'medium', impact: 'high' });
  }

  if (slowestSteps.length > 0 && slowestSteps[0].avgDuration > 30) {
    const s = slowestSteps[0];
    recs.push({ priority: priority++, category: 'optimize', title: `Optimize ${s.stepName}`, description: `Averages ${s.avgDuration}s (peak: ${s.maxDuration}s). Try incremental builds, splitting jobs, or upgrading runners.`, estimatedSaving: `${s.avgDuration > 60 ? Math.round(s.avgDuration * 0.4) : Math.round(s.avgDuration * 0.25)}s per build`, effort: s.avgDuration > 120 ? 'high' : 'medium', impact: 'medium' });
  }

  if (avgDuration > 300) {
    recs.push({ priority: priority++, category: 'architecture', title: 'Split monolithic pipeline', description: `Average build is ${Math.round(avgDuration)}s. Split into targeted pipelines (lint-only for drafts, full suite for main).`, estimatedSaving: `${Math.round(avgDuration * 0.4)}s for non-critical paths`, effort: 'medium', impact: 'high' });
  }

  if (successRate < 80) {
    recs.push({ priority: priority++, category: 'reliability', title: 'Improve pipeline reliability', description: `Success rate is ${successRate}%. Focus on top failing steps to quickly improve reliability.`, estimatedSaving: `${Math.round((100 - successRate) / 100 * avgDuration)}s avg wasted per attempt`, effort: 'varies', impact: 'high' });
  }

  return recs;
}

async function getRecentAvgDuration(bf, days) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const result = await Build.aggregate([
    { $match: bf },
    { $addFields: { effectiveDate: { $ifNull: ['$runDate', '$createdAt'] } } },
    { $match: { effectiveDate: { $gte: since } } },
    { $group: { _id: null, avg: { $avg: '$duration' } } },
  ]);
  return result[0]?.avg || 0;
}

function computeHealthScore(successRate, avgDuration, flakyCount) {
  let score = 100;
  score -= Math.max(0, (100 - successRate) * 0.5);
  if (avgDuration > 300) score -= Math.min(20, (avgDuration - 300) / 30);
  score -= flakyCount * 5;
  if (avgDuration > 900) score -= 15;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function generateReport() {
  const analytics = await computeAnalytics(null);
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalBuilds: analytics.totalBuilds,
      successRate: analytics.successRate,
      failureRate: analytics.failureRate,
      avgDuration: analytics.avgDuration,
      healthScore: analytics.healthScore,
    },
    bottlenecks: analytics.bottleneckImpact?.slice(0, 5) || [],
    flakySteps: analytics.flakySteps?.slice(0, 5) || [],
    insights: analytics.insights || [],
    recommendations: analytics.recommendations || [],
    trends: analytics.dailyTrends || [],
  };
}

module.exports = { computeAnalytics, generateReport };
