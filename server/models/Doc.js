const mongoose = require('mongoose');

const docSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  repoName: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  path: { type: String, required: true },
  lastUpdated: { type: Date, required: true },
  contentHash: { type: String },
  size: { type: Number, default: 0 },
  status: { type: String, enum: ['fresh', 'stale', 'outdated'], default: 'fresh' },
  staleDays: { type: Number, default: 0 },
  lastCommitAuthor: { type: String },
  lastCommitMessage: { type: String },
}, { timestamps: true });

docSchema.index({ userId: 1, repoName: 1, path: 1 }, { unique: true });

module.exports = mongoose.model('Doc', docSchema);
