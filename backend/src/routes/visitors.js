import express from 'express';
import Visitor from '../models/Visitor.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Public tracking endpoint.
router.post('/track', async (req, res) => {
  try {
    const { visitorId, path, permission, location } = req.body || {};
    if (!visitorId || typeof visitorId !== 'string' || visitorId.length < 8) {
      return res.status(400).json({ message: 'Invalid visitorId' });
    }

    const update = {
      $setOnInsert: {
        visitorId,
        firstSeenAt: new Date(),
      },
      $set: {
        lastSeenAt: new Date(),
        lastPath: typeof path === 'string' && path ? path : '/',
        userAgent: req.get('user-agent') || '',
      },
      $inc: { visits: 1 },
    };

    if (['granted', 'denied', 'prompt', 'unsupported', 'unknown'].includes(permission)) {
      update.$set.locationPermission = permission;
    }

    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    const acc = Number(location?.accuracy);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      update.$set.location = {
        latitude: lat,
        longitude: lng,
        accuracy: Number.isFinite(acc) ? acc : null,
      };
    }

    await Visitor.findOneAndUpdate(
      { visitorId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Auto-retention: keep only the latest 10 visitors.
    const keep = await Visitor.find()
      .sort({ lastSeenAt: -1 })
      .limit(10)
      .select('_id')
      .lean();
    const keepIds = keep.map(v => v._id);
    await Visitor.deleteMany({ _id: { $nin: keepIds } });

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// Admin stats endpoint.
router.get('/stats', authenticate, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalVisitors,
      activeToday,
      withLocation,
      recentVisitors,
    ] = await Promise.all([
      Visitor.countDocuments(),
      Visitor.countDocuments({ lastSeenAt: { $gte: startOfDay } }),
      Visitor.countDocuments({ 'location.latitude': { $ne: null }, 'location.longitude': { $ne: null } }),
      Visitor.find()
        .sort({ lastSeenAt: -1 })
        .limit(10)
        .select('visitorId lastSeenAt lastPath locationPermission location visits')
        .lean(),
    ]);

    return res.json({ totalVisitors, activeToday, withLocation, recentVisitors });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
