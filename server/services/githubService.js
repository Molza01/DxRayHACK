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
  const { data } = await axios.get(url, {
    headers: getHeaders(),
    params: { page, per_page: perPage },
  });
  return data.workflow_runs || [];
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
    return { exists: true, fullName: data.full_name, isPrivate: data.private };
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
    return {
      error: true,
      message: `Repository "${repoCheck.fullName}" exists but has no GitHub Actions workflows. This repository does not use CI/CD pipelines.`,
      synced: 0, skipped: 0, errors: 0,
    };
  }

  const results = { synced: 0, skipped: 0, errors: 0 };

  for (const run of runs) {
    try {
      // Check if build already exists
      const existing = await Build.findOne({ runId: run.id });
      if (existing) {
        results.skipped++;
        continue;
      }

      const duration = calcDuration(run.created_at, run.updated_at);
      const status = mapStatus(run.conclusion || run.status);

      const build = await Build.create({
        repoName: `${owner}/${repo}`,
        workflowName: run.name,
        runId: run.id,
        status,
        duration,
        branch: run.head_branch,
        commitSha: run.head_sha,
        triggeredBy: run.triggering_actor?.login || 'unknown',
        conclusion: run.conclusion,
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
