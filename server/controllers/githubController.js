const { syncGitHubData } = require('../services/githubService');
const { syncVercelData } = require('../services/vercelService');
const { syncRenderData } = require('../services/renderService');
const { seedDemoData } = require('../services/seedService');

async function syncGitHub(req, res) {
  try {
    let { owner, repo } = req.body;
    if (!owner || !repo) {
      return res.status(400).json({ error: true, message: 'Owner and repository name are required.' });
    }

    // Strip full URL if user pastes one (e.g. https://github.com/owner/repo)
    repo = repo.replace(/^https?:\/\/github\.com\/[^/]+\//, '').replace(/\/$/, '');

    const result = await syncGitHubData(owner, repo);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json({ ...result, message: `Successfully synced ${result.synced} builds from ${owner}/${repo}.` });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

async function syncVercel(req, res) {
  try {
    const token = process.env.VERCEL_TOKEN;
    const projectId = req.body.projectId || process.env.VERCEL_PROJECT_ID;

    if (!token || token === 'your_vercel_token_here') {
      return res.status(400).json({ error: true, message: 'VERCEL_TOKEN is not configured. Add your Vercel API token to the .env file.' });
    }
    if (!projectId || projectId === 'your_project_name_or_id_here') {
      return res.status(400).json({ error: true, message: 'Project name or ID is required.' });
    }

    const result = await syncVercelData(token, projectId);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json({ ...result, message: `Successfully synced ${result.synced} deployments from Vercel.` });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

async function syncRender(req, res) {
  try {
    const apiKey = process.env.RENDER_API_KEY;
    const serviceId = req.body.serviceId || process.env.RENDER_SERVICE_ID;

    if (!apiKey || apiKey === 'your_render_api_key_here') {
      return res.status(400).json({ error: true, message: 'RENDER_API_KEY is not configured. Add your Render API key to the .env file.' });
    }
    if (!serviceId || serviceId === 'your_render_service_id_here') {
      return res.status(400).json({ error: true, message: 'Service ID is required.' });
    }

    const result = await syncRenderData(apiKey, serviceId);

    if (result.error) {
      return res.status(404).json(result);
    }

    res.json({ ...result, message: `Successfully synced ${result.synced} deployments from Render.` });
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

async function seedDemo(req, res) {
  try {
    const result = await seedDemoData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

module.exports = { syncGitHub, syncVercel, syncRender, seedDemo };
