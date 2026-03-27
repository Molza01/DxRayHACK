const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  repoName: { type: String, required: true, index: true },
  workflowName: { type: String, required: true },
  runId: { type: Number, required: true, unique: true },
  status: { type: String, enum: ['success', 'failure', 'cancelled', 'in_progress'], required: true },
  duration: { type: Number, default: 0 }, // in seconds
  branch: { type: String, default: 'main' },
  commitSha: { type: String },
  triggeredBy: { type: String },
  conclusion: { type: String },
}, { timestamps: true });

buildSchema.index({ createdAt: -1 });
buildSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Build', buildSchema);
