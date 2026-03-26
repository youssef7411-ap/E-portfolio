import mongoose from 'mongoose';

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
    default: ''
  },
  grade: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['note', 'assignment', 'project', 'exam', 'other'],
    default: 'note'
  },
  files: [
    {
      name: String,
      url: String,
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
