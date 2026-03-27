const { syncGitHubData } = require('../services/githubService');
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

async function seedDemo(req, res) {
  try {
    const result = await seedDemoData();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: true, message: err.message });
  }
}

module.exports = { syncGitHub, seedDemo };
