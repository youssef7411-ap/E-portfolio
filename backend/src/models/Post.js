import mongoose from 'mongoose';

const SEMESTERS = ['first', 'second', 'third'];
const GRADES = Array.from({ length: 12 }, (_, i) => String(i + 1));
const POST_TYPES = ['note', 'summary', 'assignment', 'project', 'exam', 'other'];

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    default: ''
  },
  author: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  semester: {
    type: String,
    enum: SEMESTERS,
    required: true
  },
  grade: {
    type: String,
    enum: GRADES,
    required: true
  },
  type: {
    type: String,
    enum: POST_TYPES,
    default: 'note'
  },
  files: [
    {
      name: String,
      url: String,
      downloadUrl: String,
      mimetype: { type: String, default: '' },
      size: { type: Number, default: 0 },
    }
  ],
  images: [String],
  videos: [String],
  date_created: {
    type: Date,
    default: Date.now
  },
  published: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const Post = mongoose.model('Post', postSchema);
export default Post;
