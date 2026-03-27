const Build = require('../models/Build');
const Step = require('../models/Step');

// GET /api/builds — list all builds
async function getAllBuilds(req, res) {
  try {
    const { status, workflow, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (workflow) filter.workflowName = workflow;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [builds, total] = await Promise.all([
      Build.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Build.countDocuments(filter),
    ]);

    res.json({ builds, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/builds/:id — single build with steps
async function getBuildById(req, res) {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });

    const steps = await Step.find({ buildId: build._id }).sort({ stepNumber: 1 });
    res.json({ build, steps });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAllBuilds, getBuildById };
