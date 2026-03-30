const axios = require('axios');
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// POST /api/auth/signup
async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
        githubAvatarUrl: user.githubAvatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
        githubAvatarUrl: user.githubAvatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// GET /api/auth/me
async function getMe(req, res) {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    githubUsername: req.user.githubUsername,
    githubAvatarUrl: req.user.githubAvatarUrl,
  });
}

// POST /api/auth/github/connect
// Exchange GitHub OAuth code for access token and link to user
async function connectGitHub(req, res) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'GitHub authorization code is required' });
    }

    // Exchange code for access token
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenRes.data.access_token;
    if (!accessToken) {
      return res.status(400).json({ message: 'Failed to get GitHub access token' });
    }

    // Fetch GitHub user profile
    const profileRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { id: githubId, login: githubUsername, avatar_url: githubAvatarUrl } = profileRes.data;

    // Update user with GitHub info
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { githubId: String(githubId), githubUsername, githubAccessToken: accessToken, githubAvatarUrl },
      { new: true }
    ).select('-password');

    res.json({
      message: 'GitHub account connected successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        githubUsername: user.githubUsername,
        githubAvatarUrl: user.githubAvatarUrl,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to connect GitHub: ' + err.message });
  }
}

// GET /api/auth/github/repos
// Fetch authenticated user's GitHub repositories
async function getGitHubRepos(req, res) {
  try {
    if (!req.user.githubAccessToken) {
      return res.status(400).json({ message: 'GitHub account not connected' });
    }

    const repos = [];
    let page = 1;
    const perPage = 100;

    // Paginate through all repos
    while (true) {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: { Authorization: `Bearer ${req.user.githubAccessToken}` },
        params: { per_page: perPage, page, sort: 'updated', direction: 'desc' },
      });

      repos.push(...response.data.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
        updated_at: r.updated_at,
        language: r.language,
        default_branch: r.default_branch,
      })));

      if (response.data.length < perPage) break;
      page++;
      if (page > 5) break; // Safety limit: max 500 repos
    }

    res.json({ repos });
  } catch (err) {
    if (err.response?.status === 401) {
      return res.status(401).json({ message: 'GitHub token expired. Please reconnect your GitHub account.' });
    }
    res.status(500).json({ message: 'Failed to fetch repos: ' + err.message });
  }
}

module.exports = { signup, login, getMe, connectGitHub, getGitHubRepos };
