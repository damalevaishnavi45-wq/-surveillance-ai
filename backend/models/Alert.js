const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: { type: String, required: true, unique: true },
  cameraId: { type: String, required: true },
  cameraName: { type: String },
  location: { type: String },

  type: {
    type: String,
    required: true,
    enum: [
      'loitering',
      'fighting',
      'crowd_surge',
      'perimeter_breach',
      'unattended_object',
      'face_match',
      'unknown_person',
      'restricted_area',
      'fall_detected',
      'weapon_detected'
    ]
  },

  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },

  description: { type: String },

  // Person detection data
  persons: [{
    personId: String,
    boundingBox: { x: Number, y: Number, width: Number, height: Number },
    faceMatchId: String,
    faceMatchName: String,
    faceMatchConfidence: Number,
    isInWatchlist: { type: Boolean, default: false }
  }],

  // Screenshot/clip stored on Cloudinary
  snapshotUrl: { type: String },
  clipUrl: { type: String },
  cloudinaryPublicId: { type: String },

  status: { type: String, enum: ['active', 'acknowledged', 'resolved', 'false_positive'], default: 'active' },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acknowledgedAt: { type: Date },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  notes: { type: String },

  notificationSent: { type: Boolean, default: false },
  notificationChannels: [String]

}, { timestamps: true });

alertSchema.index({ cameraId: 1, createdAt: -1 });
alertSchema.index({ severity: 1, status: 1 });
alertSchema.index({ type: 1 });

module.exports = mongoose.model('Alert', alertSchema);
