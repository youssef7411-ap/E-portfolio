import express from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post.js';
import Subject from '../models/Subject.js';
import authenticate from '../middleware/authenticate.js';
import { cleanupOrphanedUploads } from '../utils/cleanupUploads.js';

const router = express.Router();

const POST_TYPES = new Set(['note', 'summary', 'assignment', 'project', 'exam', 'other']);

const asNonEmptyString = (value) => {
  const v = String(value ?? '').trim();
  return v ? v : '';
};

const normalizeSemester = (value) => {
  const raw = asNonEmptyString(value).toLowerCase();
  if (!raw) return '';
  const token = raw.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  if (token === 'first' || token === '1' || token === '1st') return 'first';
  if (token === 'second' || token === '2' || token === '2nd') return 'second';
  if (token === 'third' || token === '3' || token === '3rd') return 'third';
  return null;
};

const normalizeGrade = (value) => {
  const raw = asNonEmptyString(value);
  if (!raw) return '';
  const match = raw.match(/\d{1,2}/);
  if (!match) return null;
  const n = Number(match[0]);
  if (!Number.isInteger(n) || n < 1 || n > 12) return null;
  return String(n);
};

const normalizeType = (value) => asNonEmptyString(value).toLowerCase();

const ensureDefaultSubjectId = async () => {
  const subject = await Subject.findOneAndUpdate(
    { name: 'General' },
    { $setOnInsert: { name: 'General', description: '', image: '', visible: true, order: 0 } },
    { new: true, upsert: true }
  );
  return subject._id;
};

// Get all published posts (public)
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find({ published: true })
      .populate('subject_id', 'name description')
      .sort({ date_created: -1 });
    res.json(posts.filter(post => post.subject_id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get ALL posts including drafts (admin only)
router.get('/admin/all', authenticate, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('subject_id', 'name description')
      .sort({ date_created: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get published posts by subject (public)
router.get('/subject/:subjectId', async (req, res) => {
  try {
    const posts = await Post.find({ subject_id: req.params.subjectId, published: true })
      .populate('subject_id', 'name description')
      .sort({ date_created: -1 });
    res.json(posts.filter(post => post.subject_id));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dynamic filter options for a subject (public)
router.get('/subject/:subjectId/filters', async (req, res) => {
  try {
    const subjectId = String(req.params.subjectId || '');
    if (!mongoose.isValidObjectId(subjectId)) {
      return res.status(400).json({ message: 'Invalid subject id' });
    }

    const baseQuery = { subject_id: subjectId, published: true };

    const [gradesRaw, semestersRaw, typesRaw] = await Promise.all([
      Post.distinct('grade', baseQuery),
      Post.distinct('semester', baseQuery),
      Post.distinct('type', baseQuery),
    ]);

    const grades = (Array.isArray(gradesRaw) ? gradesRaw : [])
      .map(v => String(v || '').trim())
      .filter(Boolean)
      .filter(v => /^\d{1,2}$/.test(v))
      .map(v => String(Number(v)))
      .filter(v => {
        const n = Number(v);
        return Number.isInteger(n) && n >= 1 && n <= 12;
      })
      .sort((a, b) => Number(a) - Number(b));

    const semesterOrder = new Map([['first', 1], ['second', 2], ['third', 3]]);
    const semesters = (Array.isArray(semestersRaw) ? semestersRaw : [])
      .map(v => String(v || '').trim().toLowerCase())
      .filter(v => semesterOrder.has(v))
      .sort((a, b) => (semesterOrder.get(a) || 99) - (semesterOrder.get(b) || 99));

    const typeOrder = new Map([['exam', 1], ['summary', 2], ['assignment', 3], ['project', 4], ['note', 5], ['other', 6]]);
    const types = (Array.isArray(typesRaw) ? typesRaw : [])
      .map(v => String(v || '').trim().toLowerCase())
      .filter(v => POST_TYPES.has(v))
      .sort((a, b) => (typeOrder.get(a) || 99) - (typeOrder.get(b) || 99));

    res.json({ grades, semesters, types });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load filters' });
  }
});

// Get single post
router.get('/:id', async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('subject_id', 'name description');
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create post (protected)
router.post('/', authenticate, async (req, res) => {
  try {
    const title = asNonEmptyString(req.body?.title);
    const description = asNonEmptyString(req.body?.description);
    const content = asNonEmptyString(req.body?.content) || description;
    const author = asNonEmptyString(req.body?.author);
    const semester = normalizeSemester(req.body?.semester);
    const grade = normalizeGrade(req.body?.grade);
    const type = normalizeType(req.body?.type) || 'note';
    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    const images = Array.isArray(req.body?.images) ? req.body.images : [];
    const videos = Array.isArray(req.body?.videos) ? req.body.videos : [];
    const published = req.body?.published !== undefined ? Boolean(req.body.published) : true;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }
    if (!content) {
      return res.status(400).json({ message: 'Content is required.' });
    }
    if (semester === null) {
      return res.status(400).json({ message: 'Semester must be First, Second, or Third.' });
    }
    if (!semester) {
      return res.status(400).json({ message: 'Semester is required.' });
    }
    if (grade === null) {
      return res.status(400).json({ message: 'Grade must be between 1 and 12.' });
    }
    if (!grade) {
      return res.status(400).json({ message: 'Grade is required.' });
    }
    if (!POST_TYPES.has(type)) {
      return res.status(400).json({ message: 'Type is invalid.' });
    }

    const subject_id = req.body?.subject_id || await ensureDefaultSubjectId();

    const subjectExists = await Subject.exists({ _id: subject_id });
    if (!subjectExists) {
      return res.status(400).json({ message: 'Selected class/subject does not exist.' });
    }

    const post = new Post({
      title,
      description: description || content,
      content,
      author,
      subject_id,
      semester,
      grade,
      type,
      files,
      images,
      videos,
      published,
    });
    await post.save();

    await post.populate('subject_id', 'name description');
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post' });
  }
});

// Update post (protected)
router.put('/:id', authenticate, async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'title')) {
      const title = asNonEmptyString(req.body.title);
      if (!title) return res.status(400).json({ message: 'Title is required.' });
      req.body.title = title;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'author')) {
      req.body.author = asNonEmptyString(req.body.author);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'semester')) {
      const semester = normalizeSemester(req.body.semester);
      if (semester === null) return res.status(400).json({ message: 'Semester must be First, Second, or Third.' });
      if (!semester) return res.status(400).json({ message: 'Semester is required.' });
      req.body.semester = semester;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'grade')) {
      const grade = normalizeGrade(req.body.grade);
      if (grade === null) return res.status(400).json({ message: 'Grade must be between 1 and 12.' });
      if (!grade) return res.status(400).json({ message: 'Grade is required.' });
      req.body.grade = grade;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'type')) {
      const type = normalizeType(req.body.type);
      if (!type) return res.status(400).json({ message: 'Type is required.' });
      if (!POST_TYPES.has(type)) return res.status(400).json({ message: 'Type is invalid.' });
      req.body.type = type;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'content')) {
      const content = asNonEmptyString(req.body.content);
      if (!content) return res.status(400).json({ message: 'Content is required.' });
      req.body.content = content;
      if (!Object.prototype.hasOwnProperty.call(req.body, 'description')) {
        req.body.description = content;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      const description = asNonEmptyString(req.body.description);
      if (!description) return res.status(400).json({ message: 'Description/content is required.' });
      req.body.description = description;
      if (!Object.prototype.hasOwnProperty.call(req.body, 'content')) {
        req.body.content = description;
      }
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'subject_id')) {
      if (!req.body.subject_id) {
        req.body.subject_id = await ensureDefaultSubjectId();
      }

      const subjectExists = await Subject.exists({ _id: req.body.subject_id });
      if (!subjectExists) {
        return res.status(400).json({ message: 'Selected class/subject does not exist.' });
      }
    }

    req.body.updatedAt = new Date();
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('subject_id', 'name description');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.json(post);
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid post id' });
    }
    res.status(500).json({ message: 'Failed to update post' });
  }
});

// Toggle publish status (protected)
router.patch('/:id/publish', authenticate, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.published = !post.published;
    post.updatedAt = new Date();
    await post.save();

    res.json({ published: post.published });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete post (protected)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const exists = await Post.findById(req.params.id).select('_id title subject_id');
    if (!exists) {
      console.log(JSON.stringify({ at: new Date().toISOString(), event: 'post_delete', actor: req.admin?.username || '', postId: req.params.id, result: 'not_found' }));
      return res.status(404).json({ message: 'Post not found' });
    }

    const deleted = await Post.deleteOne({ _id: req.params.id });
    if (!deleted.deletedCount) {
      console.log(JSON.stringify({ at: new Date().toISOString(), event: 'post_delete', actor: req.admin?.username || '', postId: req.params.id, result: 'failed' }));
      return res.status(500).json({ message: 'Failed to delete post' });
    }

    // Fire-and-forget: clean up any uploads no longer referenced
    cleanupOrphanedUploads();

    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'post_delete', actor: req.admin?.username || '', postId: req.params.id, title: exists.title || '', subjectId: String(exists.subject_id || ''), result: 'deleted' }));
    res.json({ message: 'Post deleted permanently', deletedPostId: req.params.id });
  } catch (error) {
    if (error?.name === 'CastError') {
      console.log(JSON.stringify({ at: new Date().toISOString(), event: 'post_delete', actor: req.admin?.username || '', postId: req.params.id, result: 'invalid_id' }));
      return res.status(400).json({ message: 'Invalid post id' });
    }
    console.log(JSON.stringify({ at: new Date().toISOString(), event: 'post_delete', actor: req.admin?.username || '', postId: req.params.id, result: 'error', message: String(error?.message || error) }));
    res.status(500).json({ message: 'Failed to delete post' });
  }
});

export default router;
