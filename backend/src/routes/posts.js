import express from 'express';
import Post from '../models/Post.js';
import Subject from '../models/Subject.js';
import authenticate from '../middleware/authenticate.js';
import { cleanupOrphanedUploads } from '../utils/cleanupUploads.js';

const router = express.Router();

const asNonEmptyString = (value) => {
  const v = String(value ?? '').trim();
  return v ? v : '';
};

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
    const semester = asNonEmptyString(req.body?.semester);
    const grade = asNonEmptyString(req.body?.grade);
    const type = asNonEmptyString(req.body?.type) || 'note';
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
