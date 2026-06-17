const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Watchlist = require('../models/Watchlist');
const { protect, restrictTo } = require('../middleware/auth');
const { uploadImageBuffer } = require('../services/cloudinaryService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/watchlist
router.get('/', protect, async (req, res) => {
  try {
    const { category, riskLevel, search, active = 'true' } = req.query;
    const filter = { isActive: active === 'true' };
    if (category) filter.category = category;
    if (riskLevel) filter.riskLevel = riskLevel;
    if (search) filter.$text = { $search: search };

    const persons = await Watchlist.find(filter).sort({ riskLevel: -1, createdAt: -1 });
    res.json({ success: true, persons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/watchlist — add person with face image
router.post('/', protect, restrictTo('admin', 'supervisor'), upload.array('faceImages', 5), async (req, res) => {
  try {
    const { name, alias, category, riskLevel, description, caseNumber } = req.body;
    const personId = `WL-${uuidv4().slice(0, 8).toUpperCase()}`;

    const faceImages = [];
    for (const file of req.files || []) {
      const result = await uploadImageBuffer(file.buffer, `watchlist/${personId}`);
      faceImages.push({ url: result.secure_url, cloudinaryId: result.public_id });
    }

    const person = await Watchlist.create({
      personId, name, alias, category, riskLevel,
      description, caseNumber, faceImages,
      addedBy: req.user._id
    });

    res.status(201).json({ success: true, person });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/watchlist/:id — update person
router.patch('/:id', protect, restrictTo('admin', 'supervisor'), async (req, res) => {
  try {
    const person = await Watchlist.findOneAndUpdate(
      { personId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!person) return res.status(404).json({ success: false, message: 'Person not found' });
    res.json({ success: true, person });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/watchlist/:id
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const person = await Watchlist.findOneAndUpdate(
      { personId: req.params.id },
      { isActive: false },
      { new: true }
    );
    if (!person) return res.status(404).json({ success: false, message: 'Person not found' });
    res.json({ success: true, message: 'Person deactivated from watchlist' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/watchlist/match — compare face embedding against watchlist
router.post('/match', protect, async (req, res) => {
  try {
    const { embedding, threshold = 0.6 } = req.body;
    if (!embedding || !Array.isArray(embedding)) {
      return res.status(400).json({ success: false, message: 'Face embedding array required' });
    }

    const persons = await Watchlist.find({ isActive: true, faceEmbedding: { $exists: true, $ne: [] } });

    const cosineSimilarity = (a, b) => {
      const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
      const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
      const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
      return dot / (magA * magB);
    };

    const matches = persons
      .map(p => ({ person: p, score: cosineSimilarity(embedding, p.faceEmbedding) }))
      .filter(m => m.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    res.json({ success: true, matches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
