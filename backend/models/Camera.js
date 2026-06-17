const mongoose = require('mongoose');

const cameraSchema = new mongoose.Schema({
  cameraId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: { type: String, required: true },
  streamUrl: { type: String },
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'offline' },
  resolution: { type: String, default: '1080p' },
  fps: { type: Number, default: 25 },
  isRecording: { type: Boolean, default: false },
  detectionZones: [{
    zoneId: String,
    name: String,
    coordinates: [{ x: Number, y: Number }],
    sensitivity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' }
  }],
  alertThreshold: { type: Number, default: 0.75, min: 0, max: 1 },
  lastSeen: { type: Date, default: Date.now },
  totalAlerts: { type: Number, default: 0 },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Camera', cameraSchema);
