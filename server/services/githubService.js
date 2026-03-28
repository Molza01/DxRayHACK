const axios = require('axios');
const Build = require('../models/Build');
const Step = require('../models/Step');

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(token && token !== 'your_github_token_here' && { Authorization: `Bearer ${token}` }),
  };
}

// Fetch workflow runs from GitHub Actions API
async function fetchWorkflowRuns(owner, repo, page = 1, perPage = 30) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/runs`;
  try {
    const { data } = await axios.get(url, {
      headers: getHeaders(),
      params: { page, per_page: perPage },
    });
    return data.workflow_runs || [];
  } catch (err) {
    if (err.response?.status === 404) {
      throw new Error(
        `GitHub Actions is not enabled or not accessible for this repository. ` +
        `Make sure the repository uses GitHub Actions and your token has the "actions" scope for private repos.`
      );
    }
    throw err;
  }
}

// Fetch jobs for a specific workflow run
async function fetchRunJobs(owner, repo, runId) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/actions/runs/${runId}/jobs`;
  const { data } = await axios.get(url, { headers: getHeaders() });
  return data.jobs || [];
}

// Calculate duration in seconds between two ISO dates
function calcDuration(start, end) {
  if (!start || !end) return 0;
  return Math.round((new Date(end) - new Date(start)) / 1000);
}

// Verify the repository exists and is accessible
async function verifyRepo(owner, repo) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}`;
    const { data } = await axios.get(url, { headers: getHeaders() });
    return { exists: true, fullName: data.full_name, isPrivate: data.private, homepage: data.homepage || '' };
  } catch (err) {
    if (err.response?.status === 404) {
      return { exists: false, reason: 'Repository not found. Make sure the owner and repo name are correct and the repository is public (or your token has access).' };
    }
    if (err.response?.status === 401 || err.response?.status === 403) {
      return { exists: false, reason: 'Authentication failed. Check your GitHub token permissions.' };
    }
    return { exists: false, reason: `GitHub API error: ${err.message}` };
  }
}

// Detect if repo is deployed on Vercel or Render by checking GitHub deployments API and repo metadata
async function detectDeploymentPlatform(owner, repo, homepage) {
  const platforms = [];

  // Check homepage URL for platform hints
  if (homepage) {
    if (homepage.includes('vercel.app') || homepage.includes('.vercel.')) platforms.push('vercel');
    if (homepage.includes('onrender.com') || homepage.includes('.render.')) platforms.push('render');
  }

  // Check GitHub Deployments API for deployment environments
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/deployments`;
    const { data } = await axios.get(url, { headers: getHeaders(), params: { per_page: 20 } });
    if (data && data.length > 0) {
      for (const dep of data) {
        const env = (dep.environment || '').toLowerCase();
        const desc = (dep.description || '').toLowerCase();
        const creator = (dep.creator?.login || '').toLowerCase();

        if (creator.includes('vercel') || env.includes('vercel') || desc.includes('vercel')) {
          if (!platforms.includes('vercel')) platforms.push('vercel');
        }
        if (creator.includes('render') || env.includes('render') || desc.includes('render')) {
          if (!platforms.includes('render')) platforms.push('render');
        }
      }

      // If deployments exist but no platform detected, it may be Vercel (uses "Production" environment)
      if (platforms.length === 0) {
        const hasProductionEnv = data.some((d) => d.environment === 'Production' || d.environment === 'Preview');
        if (hasProductionEnv) platforms.push('vercel');
      }
    }
  } catch (e) {
    // Deployments API not accessible, continue
  }

  return platforms;
}

// Sync GitHub Actions data into MongoDB
async function syncGitHubData(owner, repo) {
  // Step 1: Verify the repo exists
  const repoCheck = await verifyRepo(owner, repo);
  if (!repoCheck.exists) {
    return { error: true, message: repoCheck.reason, synced: 0, skipped: 0, errors: 0 };
  }

  // Step 2: Fetch workflow runs
  let runs;
  try {
    runs = await fetchWorkflowRuns(owner, repo, 1, 50);
  } catch (err) {
    return { error: true, message: `Failed to fetch workflow runs: ${err.message}`, synced: 0, skipped: 0, errors: 0 };
  }

  // Step 3: Check if repo has any CI/CD workflows
  if (!runs || runs.length === 0) {
    // Auto-detect if deployed on Vercel/Render
    const detectedPlatforms = await detectDeploymentPlatform(owner, repo, repoCheck.homepage);

    const platformHints = [];
    if (detectedPlatforms.includes('vercel')) platformHints.push('Vercel');
    if (detectedPlatforms.includes('render')) platformHints.push('Render');

    const hint = platformHints.length > 0
      ? ` We detected this repo may be deployed on ${platformHints.join(' and ')}. Try syncing using the ${platformHints.join('/')} tab instead.`
      : ' If this project is deployed on Vercel or Render, use those sync options instead.';

    return {
      error: true,
      detectedPlatforms,
      message: `Repository "${repoCheck.fullName}" has no GitHub Actions workflows.${hint}`,
      synced: 0, skipped: 0, errors: 0,
    };
  }

  const results = { synced: 0, skipped: 0, errors: 0 };

  for (const run of runs) {
    try {
      // Check if build already exists
      const existing = await Build.findOne({ runId: String(run.id), platform: 'github' });
      if (existing) {
        results.skipped++;
        continue;
      }

      const duration = calcDuration(run.created_at, run.updated_at);
      const status = mapStatus(run.conclusion || run.status);

      const build = await Build.create({
        repoName: `${owner}/${repo}`,
        workflowName: run.name,
        runId: String(run.id),
        platform: 'github',
        status,
        duration,
        branch: run.head_branch,
        commitSha: run.head_sha,
        triggeredBy: run.triggering_actor?.login || 'unknown',
        conclusion: run.conclusion,
        runDate: run.created_at ? new Date(run.created_at) : new Date(),
      });

      // Fetch and store jobs/steps
      const jobs = await fetchRunJobs(owner, repo, run.id);
      let stepNumber = 0;

      for (const job of jobs) {
        const steps = job.steps || [];

        if (steps.length > 0) {
          // Normal job with steps
          for (const step of steps) {
            stepNumber++;
            const stepDuration = calcDuration(step.started_at, step.completed_at);
            await Step.create({
              buildId: build._id,
              jobName: job.name,
              stepName: step.name,
              stepNumber: step.number || stepNumber,
              duration: stepDuration,
              status: mapStatus(step.conclusion || step.status),
              conclusion: step.conclusion,
              retryCount: 0,
              startedAt: step.started_at,
              completedAt: step.completed_at,
              logs: generateMockLog(step.name, step.conclusion, stepDuration),
            });
          }
        } else {
          // Job with no steps (e.g., GitHub Pages deploy job)
          // Create a single step entry representing the whole job
          stepNumber++;
          const jobDuration = calcDuration(job.started_at, job.completed_at);
          await Step.create({
            buildId: build._id,
            jobName: job.name,
            stepName: job.name,
            stepNumber,
            duration: jobDuration,
            status: mapStatus(job.conclusion || job.status),
            conclusion: job.conclusion,
            retryCount: 0,
            startedAt: job.started_at,
            completedAt: job.completed_at,
            logs: generateMockLog(job.name, job.conclusion, jobDuration),
          });
        }
      }

      results.synced++;
    } catch (err) {
      console.error(`Error syncing run ${run.id}:`, err.message);
      results.errors++;
    }
  }

  return results;
}

function mapStatus(ghStatus) {
  const map = {
    success: 'success',
    failure: 'failure',
    cancelled: 'cancelled',
    skipped: 'skipped',
    in_progress: 'in_progress',
    queued: 'in_progress',
    neutral: 'success',
    timed_out: 'failure',
    action_required: 'failure',
  };
  return map[ghStatus] || 'failure';
}

function generateMockLog(stepName, conclusion, duration) {
  const timestamp = new Date().toISOString();
  const status = conclusion === 'success' ? 'completed successfully' : 'failed';
  return [
    `[${timestamp}] Starting step: ${stepName}`,
    `[${timestamp}] Setting up environment...`,
    `[${timestamp}] Executing ${stepName}...`,
    `[${timestamp}] Duration: ${duration}s`,
    `[${timestamp}] Step ${status}`,
  ].join('\n');
}

module.exports = { syncGitHubData, fetchWorkflowRuns, fetchRunJobs };
