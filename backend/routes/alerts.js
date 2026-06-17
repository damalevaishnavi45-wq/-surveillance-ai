const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Alert = require('../models/Alert');
const Camera = require('../models/Camera');
const { protect, restrictTo } = require('../middleware/auth');
const { sendAlertEmail } = require('../services/emailService');
const { uploadBase64Image } = require('../services/cloudinaryService');

const router = express.Router();

// GET /api/alerts — with filters
router.get('/', protect, async (req, res) => {
  try {
    const { severity, status, type, cameraId, from, to, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (cameraId) filter.cameraId = cameraId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [alerts, total] = await Promise.all([
      Alert.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Alert.countDocuments(filter)
    ]);

    res.json({ success: true, alerts, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/alerts — called by AI detection service
router.post('/', protect, async (req, res) => {
  try {
    const { cameraId, type, severity, confidence, description, persons, snapshotBase64 } = req.body;

    const camera = await Camera.findOne({ cameraId });

    let snapshotUrl = null;
    let cloudinaryPublicId = null;
    if (snapshotBase64) {
      const result = await uploadBase64Image(snapshotBase64, `alerts/${cameraId}`);
      snapshotUrl = result.secure_url;
      cloudinaryPublicId = result.public_id;
    }

    const alert = await Alert.create({
      alertId: uuidv4(),
      cameraId,
      cameraName: camera?.name || cameraId,
      location: camera?.location || 'Unknown',
      type, severity, confidence, description,
      persons: persons || [],
      snapshotUrl,
      cloudinaryPublicId
    });

    // Increment camera alert count
    if (camera) {
      await Camera.findOneAndUpdate({ cameraId }, { $inc: { totalAlerts: 1 } });
    }

    // Send email for high/critical alerts
    if (['high', 'critical'].includes(severity)) {
      await sendAlertEmail(alert);
    }

    // Emit via Socket.io (attached in server.js)
    const io = req.app.get('io');
    if (io) io.emit('new_alert', alert);

    res.status(201).json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      { status: 'acknowledged', acknowledgedBy: req.user._id, acknowledgedAt: new Date() },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    const io = req.app.get('io');
    if (io) io.emit('alert_updated', alert);

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { alertId: req.params.id },
      {
        status: req.body.falsePositive ? 'false_positive' : 'resolved',
        resolvedBy: req.user._id,
        resolvedAt: new Date(),
        notes: req.body.notes
      },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });

    const io = req.app.get('io');
    if (io) io.emit('alert_updated', alert);

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/alerts/stats
router.get('/stats/summary', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayCount, active, critical, byType, bySeverity] = await Promise.all([
      Alert.countDocuments(),
      Alert.countDocuments({ createdAt: { $gte: today } }),
      Alert.countDocuments({ status: 'active' }),
      Alert.countDocuments({ severity: 'critical', status: 'active' }),
      Alert.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Alert.aggregate([{ $group: { _id: '$severity', count: { $sum: 1 } } }])
    ]);

    res.json({ success: true, stats: { total, todayCount, active, critical, byType, bySeverity } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
