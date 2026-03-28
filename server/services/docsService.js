const axios = require('axios');
const crypto = require('crypto');
const Doc = require('../models/Doc');
const DocIssue = require('../models/DocIssue');

const GITHUB_API = 'https://api.github.com';
const STALE_THRESHOLD_DAYS = 30;

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(token && token !== 'your_github_token_here' && { Authorization: `Bearer ${token}` }),
  };
}

// ============================================
// GITHUB DATA FETCHING
// ============================================

// Recursively fetch all files from a GitHub repo
async function fetchRepoTree(owner, repo) {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`;
  const { data } = await axios.get(url, { headers: getHeaders() });
  return data.tree || [];
}

// Get last commit info for a specific file
async function fetchFileCommit(owner, repo, filePath) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/commits`;
    const { data } = await axios.get(url, {
      headers: getHeaders(),
      params: { path: filePath, per_page: 1 },
    });
    if (data.length > 0) {
      return {
        date: data[0].commit.committer.date,
        author: data[0].commit.author.name,
        message: data[0].commit.message.split('\n')[0],
        sha: data[0].sha,
      };
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Fetch file content from GitHub
async function fetchFileContent(owner, repo, filePath) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
    const { data } = await axios.get(url, { headers: getHeaders() });
    if (data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

// Fetch recent commits for changelog
async function fetchRecentCommits(owner, repo, count = 50) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/commits`;
    const { data } = await axios.get(url, {
      headers: getHeaders(),
      params: { per_page: count },
    });
    return data;
  } catch (e) {
    return [];
  }
}

// ============================================
// FILE CLASSIFICATION
// ============================================

function isDocFile(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.mdx') || lower.endsWith('.txt') || lower.endsWith('.rst')) return true;
  if (lower.includes('docs/') || lower.includes('doc/') || lower.includes('documentation/')) return true;
  if (lower === 'readme.md' || lower === 'changelog.md' || lower === 'contributing.md') return true;
  return false;
}

function isCodeFile(path) {
  const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.rb', '.php', '.rs'];
  return extensions.some(ext => path.toLowerCase().endsWith(ext));
}

function isRouteFile(path) {
  const lower = path.toLowerCase();
  return lower.includes('route') || lower.includes('controller') || lower.includes('api') ||
    lower.includes('endpoint') || lower.includes('handler');
}

// ============================================
// DOCS SYNC — Main orchestrator
// ============================================

async function syncDocs(owner, repo) {
  const repoName = `${owner}/${repo}`;

  // Verify repo exists
  try {
    await axios.get(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: getHeaders() });
  } catch (err) {
    if (err.response?.status === 404) {
      return { error: true, message: 'Repository not found.' };
    }
    return { error: true, message: `GitHub API error: ${err.message}` };
  }

  // Fetch entire repo tree
  let tree;
  try {
    tree = await fetchRepoTree(owner, repo);
  } catch (err) {
    return { error: true, message: `Failed to fetch repo tree: ${err.message}` };
  }

  const docFiles = tree.filter(f => f.type === 'blob' && isDocFile(f.path));
  const codeFiles = tree.filter(f => f.type === 'blob' && isCodeFile(f.path));
  const routeFiles = tree.filter(f => f.type === 'blob' && isRouteFile(f.path));

  // Clear old data for this repo
  await Doc.deleteMany({ repoName });
  await DocIssue.deleteMany({ repoName });

  const now = new Date();
  const results = { docsFound: 0, codeFiles: codeFiles.length, issues: 0, synced: 0 };

  // ---- Process doc files ----
  for (const file of docFiles) {
    const commit = await fetchFileCommit(owner, repo, file.path);
    const lastUpdated = commit ? new Date(commit.date) : new Date(0);
    const daysSinceUpdate = Math.floor((now - lastUpdated) / (1000 * 60 * 60 * 24));
    const status = daysSinceUpdate > 90 ? 'outdated' : daysSinceUpdate > STALE_THRESHOLD_DAYS ? 'stale' : 'fresh';

    await Doc.create({
      repoName,
      fileName: file.path.split('/').pop(),
      path: file.path,
      lastUpdated,
      contentHash: file.sha,
      size: file.size || 0,
      status,
      staleDays: daysSinceUpdate,
      lastCommitAuthor: commit?.author || 'unknown',
      lastCommitMessage: commit?.message || '',
    });

    if (status === 'stale' || status === 'outdated') {
      await DocIssue.create({
        repoName,
        type: 'stale',
        severity: status === 'outdated' ? 'high' : 'medium',
        file: file.path,
        title: `${status === 'outdated' ? 'Outdated' : 'Stale'} documentation: ${file.path}`,
        description: `Last updated ${daysSinceUpdate} days ago by ${commit?.author || 'unknown'}.`,
        suggestion: `Review and update "${file.path}" — it may contain outdated information.`,
      });
      results.issues++;
    }

    results.docsFound++;
    results.synced++;
  }

  // ---- Detect code-to-docs drift ----
  // Check if route/controller files have corresponding documentation
  for (const routeFile of routeFiles) {
    const content = await fetchFileContent(owner, repo, routeFile.path);
    if (!content) continue;

    // Extract API routes from code
    const routes = extractRoutes(content);
    if (routes.length === 0) continue;

    // Check if any doc file mentions these routes
    let hasDocCoverage = false;
    for (const doc of docFiles) {
      const docContent = await fetchFileContent(owner, repo, doc.path);
      if (docContent) {
        const routesMentioned = routes.filter(r => docContent.includes(r.path) || docContent.includes(r.method));
        if (routesMentioned.length > 0) {
          hasDocCoverage = true;
          // Check for partial coverage
          const undocumentedRoutes = routes.filter(r => !docContent.includes(r.path));
          for (const ur of undocumentedRoutes) {
            await DocIssue.create({
              repoName,
              type: 'mismatch',
              severity: 'medium',
              file: routeFile.path,
              relatedCode: `${ur.method} ${ur.path}`,
              title: `Undocumented API endpoint: ${ur.method} ${ur.path}`,
              description: `Route defined in "${routeFile.path}" but not found in documentation.`,
              suggestion: `Add documentation for "${ur.method} ${ur.path}" to your API docs.`,
            });
            results.issues++;
          }
          break;
        }
      }
    }

    if (!hasDocCoverage && routes.length > 0) {
      await DocIssue.create({
        repoName,
        type: 'missing',
        severity: 'high',
        file: routeFile.path,
        relatedCode: routes.map(r => `${r.method} ${r.path}`).join(', '),
        title: `No documentation for ${routeFile.path}`,
        description: `Found ${routes.length} API endpoint(s) in "${routeFile.path}" with no corresponding documentation.`,
        suggestion: `Create API documentation covering the ${routes.length} endpoint(s) in this file.`,
      });
      results.issues++;
    }
  }

  // ---- Check for missing README ----
  const hasReadme = docFiles.some(f => f.path.toLowerCase() === 'readme.md');
  if (!hasReadme) {
    await DocIssue.create({
      repoName,
      type: 'missing',
      severity: 'critical',
      title: 'Missing README.md',
      description: 'No README.md found in the repository root. This is critical for onboarding.',
      suggestion: 'Create a README.md with project overview, setup instructions, and usage examples.',
    });
    results.issues++;
  }

  // ---- Check for missing CONTRIBUTING/CHANGELOG ----
  const hasContributing = docFiles.some(f => f.path.toLowerCase().includes('contributing'));
  if (!hasContributing && codeFiles.length > 10) {
    await DocIssue.create({
      repoName,
      type: 'missing',
      severity: 'low',
      file: null,
      title: 'Missing CONTRIBUTING.md',
      description: 'No contributing guide found. This impacts developer onboarding.',
      suggestion: 'Add a CONTRIBUTING.md with development setup, coding standards, and PR process.',
    });
    results.issues++;
  }

  return results;
}

// Extract API routes from code content
function extractRoutes(content) {
  const routes = [];
  // Express-style: router.get('/path', ...) or app.post('/path', ...)
  const expressPattern = /(?:router|app)\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  let match;
  while ((match = expressPattern.exec(content)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }

  // Flask-style: @app.route('/path', methods=['GET'])
  const flaskPattern = /@app\.route\s*\(\s*['"`]([^'"`]+)['"`]/gi;
  while ((match = flaskPattern.exec(content)) !== null) {
    routes.push({ method: 'GET', path: match[1] });
  }

  // FastAPI-style: @router.get("/path")
  const fastapiPattern = /@(?:router|app)\.(get|post|put|delete)\s*\(\s*["']([^"']+)["']/gi;
  while ((match = fastapiPattern.exec(content)) !== null) {
    routes.push({ method: match[1].toUpperCase(), path: match[2] });
  }

  return routes;
}

// ============================================
// DOCS HEALTH ANALYTICS
// ============================================

async function getDocsHealth(repoName) {
  const filter = repoName ? { repoName } : {};
  const allDocs = await Doc.find(filter).lean();

  if (allDocs.length === 0) {
    return {
      totalDocs: 0,
      freshDocs: 0,
      staleDocs: 0,
      outdatedDocs: 0,
      freshnessPercent: 0,
      healthScore: 0,
      docs: [],
      availableRepos: await Doc.distinct('repoName'),
    };
  }

  const freshDocs = allDocs.filter(d => d.status === 'fresh');
  const staleDocs = allDocs.filter(d => d.status === 'stale');
  const outdatedDocs = allDocs.filter(d => d.status === 'outdated');
  const freshnessPercent = Math.round((freshDocs.length / allDocs.length) * 100);

  // Docs health score (0-100)
  let score = 100;
  score -= (staleDocs.length / allDocs.length) * 30;
  score -= (outdatedDocs.length / allDocs.length) * 50;
  score = Math.max(0, Math.min(100, Math.round(score)));

  // Sort: stale/outdated first, then by staleDays desc
  const sortedDocs = allDocs.sort((a, b) => {
    const order = { outdated: 0, stale: 1, fresh: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.staleDays - a.staleDays;
  });

  return {
    totalDocs: allDocs.length,
    freshDocs: freshDocs.length,
    staleDocs: staleDocs.length,
    outdatedDocs: outdatedDocs.length,
    freshnessPercent,
    healthScore: score,
    avgStaleDays: Math.round(allDocs.reduce((s, d) => s + d.staleDays, 0) / allDocs.length),
    docs: sortedDocs,
    availableRepos: await Doc.distinct('repoName'),
  };
}

// ============================================
// DOCS ISSUES
// ============================================

async function getDocsIssues(repoName) {
  const filter = repoName ? { repoName } : {};
  const issues = await DocIssue.find(filter).sort({ severity: -1, createdAt: -1 }).lean();

  const missing = issues.filter(i => i.type === 'missing');
  const stale = issues.filter(i => i.type === 'stale' || i.type === 'outdated');
  const mismatch = issues.filter(i => i.type === 'mismatch');

  return {
    total: issues.length,
    missing: missing.length,
    stale: stale.length,
    mismatch: mismatch.length,
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    issues,
  };
}

// ============================================
// AUTO-GENERATED CHANGELOG
// ============================================

async function generateChangelog(owner, repo) {
  const commits = await fetchRecentCommits(owner, repo, 50);
  if (!commits || commits.length === 0) {
    return { entries: [], apiChanges: [] };
  }

  const entries = [];
  const apiChanges = [];

  for (const commit of commits) {
    const msg = commit.commit.message;
    const date = commit.commit.committer.date;
    const author = commit.commit.author.name;

    const entry = {
      sha: commit.sha.slice(0, 7),
      date,
      author,
      message: msg.split('\n')[0],
      type: categorizeCommit(msg),
    };
    entries.push(entry);

    // Detect API-related changes
    if (isApiRelatedCommit(msg)) {
      apiChanges.push({
        ...entry,
        impact: detectApiImpact(msg),
      });
    }
  }

  // Group entries by date
  const grouped = {};
  entries.forEach(e => {
    const day = e.date.slice(0, 10);
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(e);
  });

  return {
    entries,
    apiChanges,
    byDate: grouped,
    totalCommits: entries.length,
    apiCommits: apiChanges.length,
  };
}

function categorizeCommit(message) {
  const msg = message.toLowerCase();
  if (msg.startsWith('feat') || msg.includes('add ') || msg.includes('new ')) return 'feature';
  if (msg.startsWith('fix') || msg.includes('bug') || msg.includes('patch')) return 'fix';
  if (msg.startsWith('doc') || msg.includes('readme') || msg.includes('docs')) return 'docs';
  if (msg.startsWith('refactor') || msg.includes('clean') || msg.includes('restructure')) return 'refactor';
  if (msg.startsWith('test') || msg.includes('spec')) return 'test';
  if (msg.includes('deploy') || msg.includes('ci') || msg.includes('build')) return 'ci';
  if (msg.includes('breaking') || msg.includes('remove') || msg.includes('deprecate')) return 'breaking';
  return 'other';
}

function isApiRelatedCommit(message) {
  const msg = message.toLowerCase();
  return msg.includes('api') || msg.includes('route') || msg.includes('endpoint') ||
    msg.includes('controller') || msg.includes('handler') || msg.includes('rest') ||
    msg.includes('graphql') || msg.includes('mutation') || msg.includes('query');
}

function detectApiImpact(message) {
  const msg = message.toLowerCase();
  if (msg.includes('breaking') || msg.includes('remove') || msg.includes('delete')) return 'breaking';
  if (msg.includes('add') || msg.includes('new') || msg.includes('create')) return 'addition';
  if (msg.includes('fix') || msg.includes('patch') || msg.includes('update')) return 'modification';
  if (msg.includes('deprecat')) return 'deprecation';
  return 'modification';
}

module.exports = { syncDocs, getDocsHealth, getDocsIssues, generateChangelog };
