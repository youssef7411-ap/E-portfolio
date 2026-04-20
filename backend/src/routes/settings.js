import express from 'express';
import authenticate from '../middleware/authenticate.js';
import {
  getOrCreateSiteSettings,
  getPublicSiteSettings,
  normalizeSiteSettingsUpdate,
} from '../utils/siteSettings.js';
import { getMailerStatus } from '../utils/mailer.js';

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const settings = await getOrCreateSiteSettings();
    res.json(getPublicSiteSettings(settings.toObject()));
  } catch (error) {
    res.status(500).json({ message: 'Failed to load public settings' });
  }
});

router.get('/admin', authenticate, async (req, res) => {
  try {
    const settings = await getOrCreateSiteSettings();
    res.json({
      ...normalizeSiteSettingsUpdate({}, settings.toObject()),
      mailer: getMailerStatus(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load admin settings' });
  }
});

router.put('/', authenticate, async (req, res) => {
  try {
    const current = await getOrCreateSiteSettings();
    const normalized = normalizeSiteSettingsUpdate(req.body, current.toObject());
    current.set(normalized);
    await current.save();

    res.json({
      ...normalizeSiteSettingsUpdate({}, current.toObject()),
      mailer: getMailerStatus(),
    });
  } catch (error) {
    res.status(400).json({ message: error.message || 'Failed to save settings' });
  }
});

export default router;
