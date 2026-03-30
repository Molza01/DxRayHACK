const mongoose = require('mongoose');

const docIssueSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  repoName: { type: String, required: true, index: true },
  type: { type: String, enum: ['missing', 'outdated', 'mismatch', 'stale'], required: true, index: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  file: { type: String },
  relatedCode: { type: String },
  title: { type: String, required: true },
  description: { type: String },
  suggestion: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('DocIssue', docIssueSchema);
