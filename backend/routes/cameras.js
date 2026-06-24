const express = require('express');
const Camera = require('../models/Camera');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

// GET /api/cameras
router.get('/', protect, async (req, res) => {
  try {
    const query = req.user.role === 'guard'
      ? { cameraId: { $in: req.user.assignedCameras } }
      : {};
    const cameras = await Camera.find(query).sort({ location: 1 });
    res.json({ success: true, cameras });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/cameras
router.post('/', protect, restrictTo('admin', 'supervisor'), async (req, res) => {
  try {
    const camera = await Camera.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, camera });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PATCH /api/cameras/:id/status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const camera = await Camera.findOneAndUpdate(
      { cameraId: req.params.id },
      { status: req.body.status, lastSeen: new Date() },
      { new: true }
    );
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    res.json({ success: true, camera });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/cameras/:id
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await Camera.findOneAndDelete({ cameraId: req.params.id });
    res.json({ success: true, message: 'Camera removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cameras/:id/config — used by AI service to fetch stream URL dynamically
router.get('/:id/config', protect, async (req, res) => {
  try {
    const camera = await Camera.findOne({ cameraId: req.params.id });
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    res.json({
      success: true,
      config: {
        cameraId: camera.cameraId,
        name: camera.name,
        streamUrl: camera.streamUrl,
        alertThreshold: camera.alertThreshold,
        fps: camera.fps,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/cameras/:id — update stream URL and other settings from dashboard
router.patch('/:id', protect, restrictTo('admin', 'supervisor'), async (req, res) => {
  try {
    const camera = await Camera.findOneAndUpdate(
      { cameraId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!camera) return res.status(404).json({ success: false, message: 'Camera not found' });
    res.json({ success: true, camera });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/cameras/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const total = await Camera.countDocuments();
    const online = await Camera.countDocuments({ status: 'online' });
    const offline = await Camera.countDocuments({ status: 'offline' });
    const maintenance = await Camera.countDocuments({ status: 'maintenance' });
    res.json({ success: true, stats: { total, online, offline, maintenance } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
