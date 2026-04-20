import express from 'express';
import Subject from '../models/Subject.js';
import Post from '../models/Post.js';
import authenticate from '../middleware/authenticate.js';
import { cleanupOrphanedUploads } from '../utils/cleanupUploads.js';
import TeacherEmail from '../models/TeacherEmail.js';
import PortfolioMeta from '../models/PortfolioMeta.js';

const sanitizePreview = (preview = {}) => {
  const source = preview && typeof preview === 'object' && !Array.isArray(preview) ? preview : {};
  return {
    badge: String(source.badge ?? '').slice(0, 80),
    title: String(source.title ?? '').slice(0, 120),
    description: String(source.description ?? '').slice(0, 280),
    showImage: source.showImage !== false,
    showDescription: source.showDescription !== false,
    showStats: source.showStats !== false,
    showCta: source.showCta !== false,
  };
};

const sanitizeSubjectPayload = (body = {}) => ({
  name: String(body.name ?? '').trim(),
  description: String(body.description ?? ''),
  image: String(body.image ?? ''),
  visible: body.visible !== false,
  order: Number(body.order) || 0,
  preview: sanitizePreview(body.preview),
});

// Helper: update last updated timestamp
async function updateLastUpdated() {
  await PortfolioMeta.findOneAndUpdate({}, { lastUpdated: new Date() }, { upsert: true });
}

const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ order: 1, createdAt: -1 });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single subject
router.get('/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create subject (protected)
router.post('/', authenticate, async (req, res) => {
  try {
    const payload = sanitizeSubjectPayload(req.body);
    if (!payload.name) {
      return res.status(400).json({ message: 'Subject name is required.' });
    }

    const subject = new Subject({
      ...payload,
    });

    await subject.save();
    await updateLastUpdated();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update subject (protected)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const payload = sanitizeSubjectPayload(req.body);
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    subject.updatedAt = new Date();
    await subject.save();
    await updateLastUpdated();
    res.json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Reorder subjects (protected)
router.put('/reorder', authenticate, async (req, res) => {
  try {
    const { order } = req.body; // [{ id, order }, ...]
    const updates = order.map(({ id, order: o }) =>
      Subject.findByIdAndUpdate(id, { order: o })
    );
    await Promise.all(updates);
    res.json({ message: 'Subjects reordered' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete subject (protected)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const deletedPosts = await Post.deleteMany({ subject_id: req.params.id });
    const deletedSubject = await Subject.deleteOne({ _id: req.params.id });

    if (!deletedSubject.deletedCount) {
      return res.status(500).json({ message: 'Failed to delete subject' });
    }

    await TeacherEmail.deleteOne({ subject: subject._id });
    await updateLastUpdated();

    // Fire-and-forget: clean up any uploads no longer referenced
    cleanupOrphanedUploads();

    res.json({
      message: 'Subject deleted permanently',
      deletedSubjectId: req.params.id,
      deletedPosts: deletedPosts.deletedCount || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Get teacher email for subject
router.get('/:id/teacher-email', async (req, res) => {
  try {
    const record = await TeacherEmail.findOne({ subject: req.params.id });
    res.json({ email: record ? record.email : '' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update teacher email for subject
router.put('/:id/teacher-email', authenticate, async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    if (!email) {
      await TeacherEmail.deleteOne({ subject: req.params.id });
      await updateLastUpdated();
      return res.json({ email: '' });
    }
    const record = await TeacherEmail.findOneAndUpdate(
      { subject: req.params.id },
      { email, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    await updateLastUpdated();
    res.json({ email: record.email });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
