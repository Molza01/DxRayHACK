const Build = require('../models/Build');
const Step = require('../models/Step');

// Generate realistic demo data for the dashboard
async function seedDemoData() {
  const existing = await Build.countDocuments();
  if (existing > 0) return { message: 'Data already exists', count: existing };

  const workflows = ['CI Pipeline', 'Deploy Production', 'Run Tests', 'Build & Publish', 'Lint & Format'];
  const branches = ['main', 'develop', 'feature/auth', 'feature/api', 'fix/memory-leak', 'hotfix/login'];
  const users = ['alice', 'bob', 'charlie', 'diana', 'eve'];

  const stepTemplates = {
    'CI Pipeline': [
      { name: 'Checkout code', baseDuration: 5, variance: 3 },
      { name: 'Setup Node.js', baseDuration: 12, variance: 5 },
      { name: 'Install dependencies', baseDuration: 45, variance: 20 },
      { name: 'Run linter', baseDuration: 15, variance: 8 },
      { name: 'Run unit tests', baseDuration: 90, variance: 40, flakyChance: 0.15 },
      { name: 'Run integration tests', baseDuration: 180, variance: 60, flakyChance: 0.1 },
      { name: 'Build application', baseDuration: 60, variance: 25 },
      { name: 'Upload artifacts', baseDuration: 20, variance: 10 },
    ],
    'Deploy Production': [
      { name: 'Checkout code', baseDuration: 4, variance: 2 },
      { name: 'Setup environment', baseDuration: 15, variance: 5 },
      { name: 'Build Docker image', baseDuration: 120, variance: 40 },
      { name: 'Push to registry', baseDuration: 30, variance: 15 },
      { name: 'Deploy to staging', baseDuration: 45, variance: 20 },
      { name: 'Run smoke tests', baseDuration: 60, variance: 30, flakyChance: 0.2 },
      { name: 'Deploy to production', baseDuration: 40, variance: 15 },
      { name: 'Health check', baseDuration: 15, variance: 5, flakyChance: 0.05 },
    ],
    'Run Tests': [
      { name: 'Checkout code', baseDuration: 5, variance: 2 },
      { name: 'Setup Node.js', baseDuration: 10, variance: 4 },
      { name: 'Install dependencies', baseDuration: 50, variance: 20 },
      { name: 'Run unit tests', baseDuration: 120, variance: 50, flakyChance: 0.12 },
      { name: 'Run e2e tests', baseDuration: 240, variance: 80, flakyChance: 0.18 },
      { name: 'Generate coverage report', baseDuration: 15, variance: 5 },
    ],
    'Build & Publish': [
      { name: 'Checkout code', baseDuration: 4, variance: 2 },
      { name: 'Setup build tools', baseDuration: 20, variance: 8 },
      { name: 'Compile TypeScript', baseDuration: 35, variance: 15 },
      { name: 'Bundle assets', baseDuration: 55, variance: 20 },
      { name: 'Run tests', baseDuration: 80, variance: 30, flakyChance: 0.08 },
      { name: 'Publish package', baseDuration: 25, variance: 10 },
    ],
    'Lint & Format': [
      { name: 'Checkout code', baseDuration: 4, variance: 2 },
      { name: 'Setup Node.js', baseDuration: 8, variance: 3 },
      { name: 'Install dependencies', baseDuration: 40, variance: 15 },
      { name: 'Run ESLint', baseDuration: 25, variance: 10, flakyChance: 0.05 },
      { name: 'Check Prettier', baseDuration: 10, variance: 5 },
    ],
  };

  const builds = [];
  const now = Date.now();

  // Generate 60 builds over the past 30 days
  for (let i = 0; i < 60; i++) {
    const workflow = workflows[Math.floor(Math.random() * workflows.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date(now - daysAgo * 86400000 - hoursAgo * 3600000);

    // Determine build outcome with realistic distribution
    const rand = Math.random();
    let status;
    if (rand < 0.65) status = 'success';
    else if (rand < 0.88) status = 'failure';
    else status = 'cancelled';

    const steps = stepTemplates[workflow];
    let totalDuration = 0;
    const buildSteps = [];
    let buildFailed = false;

    for (const template of steps) {
      if (buildFailed) {
        buildSteps.push({
          ...template,
          duration: 0,
          status: 'skipped',
          startedAt: createdAt,
          completedAt: createdAt,
        });
        continue;
      }

      const duration = Math.max(1, template.baseDuration + (Math.random() - 0.5) * 2 * template.variance);
      const roundedDuration = Math.round(duration);
      totalDuration += roundedDuration;

      let stepStatus = 'success';
      const retryCount = 0;

      if (status === 'failure' && template.flakyChance && Math.random() < 0.4) {
        stepStatus = 'failure';
        buildFailed = true;
      } else if (template.flakyChance && Math.random() < template.flakyChance * 0.3) {
        stepStatus = 'failure';
        if (status === 'success') stepStatus = 'success'; // retry succeeded
      }

      const stepStart = new Date(createdAt.getTime() + (totalDuration - roundedDuration) * 1000);
      const stepEnd = new Date(stepStart.getTime() + roundedDuration * 1000);

      buildSteps.push({
        ...template,
        duration: roundedDuration,
        status: stepStatus,
        retryCount,
        startedAt: stepStart,
        completedAt: stepEnd,
      });
    }

    builds.push({
      workflow,
      status,
      totalDuration,
      createdAt,
      branch: branches[Math.floor(Math.random() * branches.length)],
      user: users[Math.floor(Math.random() * users.length)],
      steps: buildSteps,
    });
  }

  // Store in DB
  let buildCount = 0;
  for (const b of builds) {
    const build = await Build.create({
      repoName: 'demo/ci-insight-scanner',
      workflowName: b.workflow,
      runId: 1000000 + buildCount,
      status: b.status,
      duration: b.totalDuration,
      branch: b.branch,
      commitSha: generateSha(),
      triggeredBy: b.user,
      conclusion: b.status,
      createdAt: b.createdAt,
      updatedAt: new Date(b.createdAt.getTime() + b.totalDuration * 1000),
    });

    for (const s of b.steps) {
      await Step.create({
        buildId: build._id,
        jobName: b.workflow,
        stepName: s.name,
        stepNumber: b.steps.indexOf(s) + 1,
        duration: s.duration,
        status: s.status,
        conclusion: s.status,
        retryCount: s.retryCount || 0,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        logs: generateLogs(s.name, s.status, s.duration),
      });
    }
    buildCount++;
  }

  return { message: 'Demo data seeded', count: buildCount };
}

function generateSha() {
  return Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
}

function generateLogs(stepName, status, duration) {
  const lines = [
    `$ echo "Starting ${stepName}"`,
    `Starting ${stepName}...`,
    `> Setting up environment variables`,
    `> Checking prerequisites...`,
    `  ✓ All prerequisites met`,
    `> Executing ${stepName}`,
  ];

  if (stepName.includes('Install')) {
    lines.push('> npm ci --prefer-offline', 'added 1247 packages in 32s', '> node_modules cached successfully');
  } else if (stepName.includes('test') || stepName.includes('Test')) {
    lines.push('> jest --coverage --ci', 'PASS src/utils.test.js', 'PASS src/api.test.js');
    if (status === 'failure') {
      lines.push('FAIL src/auth.test.js', '  ● Authentication › should validate token', '    expect(received).toBe(expected)', '    Expected: true', '    Received: false');
    } else {
      lines.push('Tests: 142 passed, 142 total', 'Coverage: 87.3%');
    }
  } else if (stepName.includes('Build') || stepName.includes('Compile') || stepName.includes('Bundle')) {
    lines.push('> webpack --mode production', 'Hash: a1b2c3d4e5f6', 'Built at: 2024-01-15');
    if (status === 'failure') {
      lines.push('ERROR in ./src/index.ts', 'Module build failed: SyntaxError');
    } else {
      lines.push('Output: dist/bundle.js (245 KB)', '✓ Build completed');
    }
  } else if (stepName.includes('Deploy')) {
    lines.push('> Deploying to cluster...', '> Rolling update initiated', '> Waiting for pods to be ready...');
    if (status === 'failure') {
      lines.push('Error: Readiness probe failed', 'Deployment rollback initiated');
    } else {
      lines.push('✓ All pods healthy', '✓ Deployment successful');
    }
  }

  lines.push(`> Step completed in ${duration}s`);
  lines.push(status === 'success' ? '✓ Success' : status === 'failure' ? '✗ Failed' : '○ Skipped');

  return lines.join('\n');
}

module.exports = { seedDemoData };
