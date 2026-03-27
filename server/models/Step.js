const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  buildId: { type: mongoose.Schema.Types.ObjectId, ref: 'Build', required: true, index: true },
  jobName: { type: String, required: true },
  stepName: { type: String, required: true },
  stepNumber: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // in seconds
  status: { type: String, enum: ['success', 'failure', 'skipped', 'cancelled', 'in_progress'], required: true },
  conclusion: { type: String },
  retryCount: { type: Number, default: 0 },
  startedAt: { type: Date },
  completedAt: { type: Date },
  logs: { type: String, default: '' },
}, { timestamps: true });

stepSchema.index({ stepName: 1 });
stepSchema.index({ status: 1 });

module.exports = mongoose.model('Step', stepSchema);
