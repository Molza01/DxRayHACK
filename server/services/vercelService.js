const axios = require('axios');
const Build = require('../models/Build');
const Step = require('../models/Step');

const VERCEL_API = 'https://api.vercel.com';

function getHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Fetch deployments from Vercel API
async function fetchDeployments(token, projectId, teamId, limit = 50) {
  const params = { limit };
  if (projectId) params.projectId = projectId;
  if (teamId) params.teamId = teamId;

  const { data } = await axios.get(`${VERCEL_API}/v6/deployments`, {
    headers: getHeaders(token),
    params,
  });
  return data.deployments || [];
}

// Fetch a single deployment's details (includes build info)
async function fetchDeploymentDetails(token, deploymentId) {
  const { data } = await axios.get(`${VERCEL_API}/v13/deployments/${deploymentId}`, {
    headers: getHeaders(token),
  });
  return data;
}

// Map Vercel state to app status
function mapStatus(state) {
  const map = {
    READY: 'success',
    ERROR: 'failure',
    BUILDING: 'in_progress',
    INITIALIZING: 'in_progress',
    QUEUED: 'in_progress',
    CANCELED: 'cancelled',
    CANCELLED: 'cancelled',
  };
  return map[state] || 'failure';
}

function calcDuration(createdAt, readyAt) {
  if (!createdAt || !readyAt) return 0;
  return Math.round((new Date(readyAt) - new Date(createdAt)) / 1000);
}

// Sync Vercel deployments into MongoDB
async function syncVercelData(token, projectNameOrId, teamId) {
  if (!token) {
    return { error: true, message: 'Vercel API token is required.', synced: 0, skipped: 0, errors: 0 };
  }

  // First, resolve project name to project ID if needed
  let projectId = projectNameOrId;
  let projectName = projectNameOrId;

  try {
    // Try to list projects to find the matching one
    const params = {};
    if (teamId) params.teamId = teamId;
    const { data } = await axios.get(`${VERCEL_API}/v9/projects`, {
      headers: getHeaders(token),
      params,
    });

    const project = data.projects?.find(
      (p) => p.name === projectNameOrId || p.id === projectNameOrId
    );
    if (project) {
      projectId = project.id;
      projectName = project.name;
    }
  } catch (err) {
    // If listing fails, proceed with the provided value as projectId
  }

  // Fetch deployments
  let deployments;
  try {
    deployments = await fetchDeployments(token, projectId, teamId);
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      return { error: true, message: 'Invalid Vercel token or insufficient permissions.', synced: 0, skipped: 0, errors: 0 };
    }
    if (err.response?.status === 404) {
      return { error: true, message: `Project "${projectNameOrId}" not found on Vercel.`, synced: 0, skipped: 0, errors: 0 };
    }
    return { error: true, message: `Vercel API error: ${err.message}`, synced: 0, skipped: 0, errors: 0 };
  }

  if (!deployments || deployments.length === 0) {
    return { error: true, message: `No deployments found for project "${projectName}" on Vercel.`, synced: 0, skipped: 0, errors: 0 };
  }

  const results = { synced: 0, skipped: 0, errors: 0 };

  for (const deploy of deployments) {
    try {
      const existing = await Build.findOne({ runId: deploy.uid, platform: 'vercel' });
      if (existing) {
        results.skipped++;
        continue;
      }

      const status = mapStatus(deploy.state || deploy.readyState);
      const createdMs = deploy.created || deploy.createdAt;
      const readyMs = deploy.ready;
      const buildingMs = deploy.buildingAt;
      const createdDate = createdMs ? new Date(createdMs) : new Date();
      // Duration = time from creation to ready (full deploy time)
      // If ready is not available (failed/in-progress), use buildingAt as an estimate
      const endMs = readyMs || buildingMs;
      const endDate = endMs ? new Date(endMs) : null;
      let duration = endDate ? calcDuration(createdDate, endDate) : 0;
      // If duration is 0 or negative (timestamps same), estimate from Vercel's typical build times
      if (duration <= 0 && status === 'success') duration = 30;

      const build = await Build.create({
        repoName: projectName,
        workflowName: deploy.name || projectName,
        runId: deploy.uid,
        platform: 'vercel',
        status,
        duration,
        branch: deploy.meta?.githubCommitRef || deploy.meta?.gitlabCommitRef || 'main',
        commitSha: deploy.meta?.githubCommitSha || deploy.meta?.gitlabCommitSha || '',
        triggeredBy: deploy.creator?.username || deploy.creator?.email || 'unknown',
        conclusion: deploy.state || deploy.readyState,
        runDate: createdDate,
      });

      // Create synthetic steps for Vercel deployments
      const steps = [];

      // Step 1: Initialization
      steps.push({
        buildId: build._id,
        jobName: 'Deployment',
        stepName: 'Initialize',
        stepNumber: 1,
        duration: Math.round(duration * 0.05) || 1,
        status,
        conclusion: deploy.state,
        startedAt: createdDate,
        completedAt: endDate || createdDate,
        logs: `[${createdDate.toISOString()}] Initializing Vercel deployment...\n[${createdDate.toISOString()}] Project: ${projectName}\n[${createdDate.toISOString()}] Target: ${deploy.target || 'production'}`,
      });

      // Step 2: Build
      const buildStart = buildingMs ? new Date(buildingMs) : createdDate;
      steps.push({
        buildId: build._id,
        jobName: 'Deployment',
        stepName: 'Build',
        stepNumber: 2,
        duration: Math.round(duration * 0.7) || 1,
        status,
        conclusion: deploy.state,
        startedAt: buildStart,
        completedAt: endDate || createdDate,
        logs: `[${buildStart.toISOString()}] Running build command...\n[${buildStart.toISOString()}] Building project...\n[${buildStart.toISOString()}] Build ${status === 'success' ? 'completed' : 'failed'}`,
      });

      // Step 3: Deploy
      steps.push({
        buildId: build._id,
        jobName: 'Deployment',
        stepName: 'Deploy',
        stepNumber: 3,
        duration: Math.round(duration * 0.25) || 1,
        status,
        conclusion: deploy.state,
        startedAt: endDate || createdDate,
        completedAt: endDate || createdDate,
        logs: `[${createdDate.toISOString()}] Deploying to ${deploy.target || 'production'}...\n[${createdDate.toISOString()}] URL: ${deploy.url ? `https://${deploy.url}` : 'N/A'}\n[${createdDate.toISOString()}] Deployment ${status === 'success' ? 'live' : 'failed'}`,
      });

      await Step.insertMany(steps);
      results.synced++;
    } catch (err) {
      console.error(`Error syncing Vercel deployment ${deploy.uid}:`, err.message);
      results.errors++;
    }
  }

  return results;
}

module.exports = { syncVercelData };
