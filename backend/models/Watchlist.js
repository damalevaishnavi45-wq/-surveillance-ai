const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  personId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  alias: { type: String },
  category: {
    type: String,
    enum: ['suspect', 'missing_person', 'vip', 'employee', 'banned', 'other'],
    required: true
  },
  riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  description: { type: String },

  // Face images stored on Cloudinary
  faceImages: [{
    url: String,
    cloudinaryId: String,
    uploadedAt: { type: Date, default: Date.now }
  }],

  // 128-dim face embedding vector (stored as array)
  faceEmbedding: [Number],

  isActive: { type: Boolean, default: true },
  lastDetected: { type: Date },
  detectionCount: { type: Number, default: 0 },
  detectedAt: [String], // camera IDs

  caseNumber: { type: String },
  reportedBy: { type: String },
  additionalInfo: { type: mongoose.Schema.Types.Mixed },

  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

watchlistSchema.index({ riskLevel: 1, isActive: 1 });
watchlistSchema.index({ name: 'text', alias: 'text', description: 'text' });

module.exports = mongoose.model('Watchlist', watchlistSchema);
