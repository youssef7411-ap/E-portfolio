import express from 'express';
import Subject from '../models/Subject.js';
import Post from '../models/Post.js';
import authenticate from '../middleware/authenticate.js';
import { cleanupOrphanedUploads } from '../utils/cleanupUploads.js';

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
    const { name, description, image, visible } = req.body;

    const subject = new Subject({
      name,
      description: description ?? '',
      image: image ?? '',
      visible: visible ?? true,
    });

    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update subject (protected)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    
    subject.updatedAt = new Date();
    await subject.save();
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

export default router;
