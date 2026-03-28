const axios = require('axios');
const Build = require('../models/Build');
const Step = require('../models/Step');

const RENDER_API = 'https://api.render.com/v1';

function getHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
  };
}

// Map Render deploy status to app status
function mapStatus(status) {
  const map = {
    live: 'success',
    build_failed: 'failure',
    update_failed: 'failure',
    canceled: 'cancelled',
    cancelled: 'cancelled',
    deactivated: 'cancelled',
    created: 'in_progress',
    build_in_progress: 'in_progress',
    update_in_progress: 'in_progress',
    pre_deploy_in_progress: 'in_progress',
    pre_deploy_failed: 'failure',
  };
  return map[status] || 'failure';
}

function calcDuration(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 1000);
}

// Fetch service details to get service name
async function fetchServiceDetails(apiKey, serviceId) {
  try {
    const { data } = await axios.get(`${RENDER_API}/services/${serviceId}`, {
      headers: getHeaders(apiKey),
    });
    return data;
  } catch (err) {
    return null;
  }
}

// Fetch deploys for a Render service
async function fetchDeploys(apiKey, serviceId, limit = 50) {
  const { data } = await axios.get(`${RENDER_API}/services/${serviceId}/deploys`, {
    headers: getHeaders(apiKey),
    params: { limit },
  });
  // Render API returns array of { deploy: {...} } objects
  return data.map((item) => item.deploy || item);
}

// Sync Render deployment data into MongoDB
async function syncRenderData(apiKey, serviceId) {
  if (!apiKey) {
    return { error: true, message: 'Render API key is required.', synced: 0, skipped: 0, errors: 0 };
  }
  if (!serviceId) {
    return { error: true, message: 'Render Service ID is required.', synced: 0, skipped: 0, errors: 0 };
  }

  // Fetch service details for name
  const serviceDetails = await fetchServiceDetails(apiKey, serviceId);
  const serviceName = serviceDetails?.name || serviceDetails?.service?.name || serviceId;

  // Fetch deploys
  let deploys;
  try {
    deploys = await fetchDeploys(apiKey, serviceId);
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      return { error: true, message: 'Invalid Render API key or insufficient permissions.', synced: 0, skipped: 0, errors: 0 };
    }
    if (err.response?.status === 404) {
      return { error: true, message: `Service "${serviceId}" not found on Render.`, synced: 0, skipped: 0, errors: 0 };
    }
    return { error: true, message: `Render API error: ${err.message}`, synced: 0, skipped: 0, errors: 0 };
  }

  if (!deploys || deploys.length === 0) {
    return { error: true, message: `No deployments found for service "${serviceName}" on Render.`, synced: 0, skipped: 0, errors: 0 };
  }

  const results = { synced: 0, skipped: 0, errors: 0 };

  for (const deploy of deploys) {
    try {
      const deployId = deploy.id;
      const existing = await Build.findOne({ runId: deployId, platform: 'render' });
      if (existing) {
        results.skipped++;
        continue;
      }

      const status = mapStatus(deploy.status);
      const createdAt = deploy.createdAt ? new Date(deploy.createdAt) : new Date();
      const finishedAt = deploy.finishedAt ? new Date(deploy.finishedAt) : null;
      const duration = finishedAt ? calcDuration(createdAt, finishedAt) : 0;

      const build = await Build.create({
        repoName: serviceName,
        workflowName: `Render Deploy`,
        runId: deployId,
        platform: 'render',
        status,
        duration,
        branch: deploy.commit?.branch || 'main',
        commitSha: deploy.commit?.id || '',
        triggeredBy: deploy.trigger || 'unknown',
        conclusion: deploy.status,
        runDate: createdAt,
      });

      // Create synthetic steps for Render deployments
      const steps = [];
      const commitMsg = deploy.commit?.message || 'No commit message';

      // Step 1: Initialize
      steps.push({
        buildId: build._id,
        jobName: 'Render Deploy',
        stepName: 'Initialize',
        stepNumber: 1,
        duration: Math.round(duration * 0.05) || 1,
        status,
        conclusion: deploy.status,
        startedAt: createdAt,
        completedAt: finishedAt || createdAt,
        logs: `[${createdAt.toISOString()}] Initializing Render deployment...\n[${createdAt.toISOString()}] Service: ${serviceName}\n[${createdAt.toISOString()}] Commit: ${commitMsg}`,
      });

      // Step 2: Build
      steps.push({
        buildId: build._id,
        jobName: 'Render Deploy',
        stepName: 'Build',
        stepNumber: 2,
        duration: Math.round(duration * 0.6) || 1,
        status,
        conclusion: deploy.status,
        startedAt: createdAt,
        completedAt: finishedAt || createdAt,
        logs: `[${createdAt.toISOString()}] Building application...\n[${createdAt.toISOString()}] Installing dependencies...\n[${createdAt.toISOString()}] Build ${status === 'success' ? 'completed' : 'failed'}`,
      });

      // Step 3: Deploy
      steps.push({
        buildId: build._id,
        jobName: 'Render Deploy',
        stepName: 'Deploy',
        stepNumber: 3,
        duration: Math.round(duration * 0.35) || 1,
        status,
        conclusion: deploy.status,
        startedAt: createdAt,
        completedAt: finishedAt || createdAt,
        logs: `[${createdAt.toISOString()}] Deploying service...\n[${createdAt.toISOString()}] Health check ${status === 'success' ? 'passed' : 'failed'}\n[${createdAt.toISOString()}] Deployment ${status === 'success' ? 'live' : 'failed'}`,
      });

      await Step.insertMany(steps);
      results.synced++;
    } catch (err) {
      console.error(`Error syncing Render deploy ${deploy.id}:`, err.message);
      results.errors++;
    }
  }

  return results;
}

module.exports = { syncRenderData };
