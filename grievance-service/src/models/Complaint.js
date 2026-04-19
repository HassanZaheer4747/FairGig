const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  worker_id: { type: String, required: true, index: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  platform: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  category: {
    type: String,
    enum: ['wage_theft', 'unfair_deduction', 'account_suspension', 'discrimination', 'safety', 'other'],
    default: 'other',
    index: true
  },
  tags: [{ type: String, trim: true }],
  status: { type: String, enum: ['open', 'escalated', 'resolved', 'closed'], default: 'open', index: true },
  cluster: { type: String, default: null },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  upvotes: { type: Number, default: 0 },
  upvoted_by: [{ type: String }],
  is_public: { type: Boolean, default: true },
  resolution_note: { type: String, default: null },
  resolved_at: { type: Date, default: null },
  worker_name: { type: String, default: 'Anonymous' },
}, { timestamps: true });

complaintSchema.index({ status: 1, platform: 1 });
complaintSchema.index({ tags: 1 });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ cluster: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
