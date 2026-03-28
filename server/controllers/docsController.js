const { syncDocs, getDocsHealth, getDocsIssues, generateChangelog } = require('../services/docsService');
const { generateDocFix } = require('../services/aiService');
const DocIssue = require('../models/DocIssue');
const axios = require('axios');

const GITHUB_API = 'https://api.github.com';

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  return {
    Accept: 'application/vnd.github.v3+json',
    ...(token && token !== 'your_github_token_here' && { Authorization: `Bearer ${token}` }),
  };
}

function parseRepoInput(input) {
  if (!input) return null;
  const trimmed = input.trim().replace(/\/+$/, '');
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const slashMatch = trimmed.match(/^([^/]+)\/([^/]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };
  return null;
}

async function fetchFileContent(owner, repo, filePath) {
  try {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${filePath}`;
    const { data } = await axios.get(url, { headers: getHeaders() });
    if (data.content) return Buffer.from(data.content, 'base64').toString('utf-8');
  } catch {}
  return null;
}

async function docsSync(req, res) {
  try {
    let { owner, repo, repoUrl } = req.body;
    if (repoUrl) {
      const parsed = parseRepoInput(repoUrl);
      if (!parsed) return res.status(400).json({ error: true, message: 'Invalid repository URL. Use format: https://github.com/owner/repo or owner/repo' });
      owner = parsed.owner;
      repo = parsed.repo;
    }
    if (!owner || !repo) return res.status(400).json({ error: true, message: 'Repository URL is required.' });
    repo = repo.replace(/\.git$/, '');

    const result = await syncDocs(owner, repo);
    if (result.error) return res.status(404).json(result);
    res.json({ ...result, owner, repo, message: `Scanned ${result.docsFound} docs and ${result.codeFiles} code files. Found ${result.issues} issues.` });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

async function docsHealth(req, res) {
  try {
    const repoName = req.query.repo || null;
    const health = await getDocsHealth(repoName);
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function docsIssues(req, res) {
  try {
    const repoName = req.query.repo || null;
    const issues = await getDocsIssues(repoName);
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function docsChangelog(req, res) {
  try {
    const { owner, repo } = req.query;
    if (!owner || !repo) return res.status(400).json({ error: true, message: 'owner and repo query params required.' });
    const changelog = await generateChangelog(owner, repo);
    res.json(changelog);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Generate AI-powered fix for a specific issue
async function docsFix(req, res) {
  try {
    const { issueId } = req.body;
    if (!issueId) return res.status(400).json({ error: true, message: 'issueId is required.' });

    const issue = await DocIssue.findById(issueId).lean();
    if (!issue) return res.status(404).json({ error: true, message: 'Issue not found.' });

    // Parse owner/repo from repoName
    const parts = issue.repoName.split('/');
    if (parts.length < 2) return res.status(400).json({ error: true, message: 'Invalid repo name on issue.' });
    const owner = parts[0];
    const repo = parts.slice(1).join('/');

    // Fetch the relevant files from GitHub
    const docContent = issue.file ? await fetchFileContent(owner, repo, issue.file) : null;

    // Fetch related code file if it's a mismatch issue
    let codeContent = null;
    if (issue.type === 'mismatch' && issue.file) {
      codeContent = await fetchFileContent(owner, repo, issue.file);
    }

    // Fetch package.json for version checks
    const packageJson = await fetchFileContent(owner, repo, 'package.json');

    // Generate the fix using Gemini AI (falls back to rule-based)
    const fix = await generateDocFix(issue, docContent, codeContent, packageJson);

    res.json(fix);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

// Generate fixes for ALL issues of a repo at once
async function docsFixAll(req, res) {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) return res.status(400).json({ error: true, message: 'repoUrl is required.' });

    const parsed = parseRepoInput(repoUrl);
    if (!parsed) return res.status(400).json({ error: true, message: 'Invalid repository URL.' });

    const repoName = `${parsed.owner}/${parsed.repo}`;
    const issues = await DocIssue.find({ repoName }).lean();
    if (issues.length === 0) return res.json({ fixes: [], message: 'No issues found for this repo.' });

    // Fetch package.json once
    const packageJson = await fetchFileContent(parsed.owner, parsed.repo, 'package.json');

    // Generate fixes (limit to 15 to avoid rate limits)
    const fixes = [];
    for (const issue of issues.slice(0, 15)) {
      const docContent = issue.file ? await fetchFileContent(parsed.owner, parsed.repo, issue.file) : null;
      const fix = await generateDocFix(issue, docContent, null, packageJson);
      fixes.push(fix);
    }

    res.json({
      fixes,
      total: issues.length,
      resolved: fixes.length,
      message: `Generated ${fixes.length} fix suggestions for ${issues.length} issues.`,
    });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

module.exports = { docsSync, docsHealth, docsIssues, docsChangelog, docsFix, docsFixAll };
