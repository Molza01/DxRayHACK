const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  repoName: { type: String, required: true, index: true },
  workflowName: { type: String, required: true },
  runId: { type: String, required: true },
  platform: { type: String, enum: ['github', 'vercel', 'render'], default: 'github', index: true },
  status: { type: String, enum: ['success', 'failure', 'cancelled', 'in_progress'], required: true },
  duration: { type: Number, default: 0 }, // in seconds
  branch: { type: String, default: 'main' },
  commitSha: { type: String },
  triggeredBy: { type: String },
  conclusion: { type: String },
  runDate: { type: Date },
}, { timestamps: true });

buildSchema.index({ userId: 1, runId: 1, platform: 1 }, { unique: true });

buildSchema.index({ createdAt: -1 });
buildSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Build', buildSchema);
