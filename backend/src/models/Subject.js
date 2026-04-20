import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: ''
  },
  buttonImage: {
    type: String,
    default: ''
  },
  bgColor: {
    type: String,
    default: '#3b82f6'
  },
  preview: {
    badge: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    description: {
      type: String,
      default: '',
    },
    showImage: {
      type: Boolean,
      default: true,
    },
    showDescription: {
      type: Boolean,
      default: true,
    },
    showStats: {
      type: Boolean,
      default: true,
    },
    showCta: {
      type: Boolean,
      default: true,
    },
  },
  visible: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
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

const Subject = mongoose.model('Subject', subjectSchema);
export default Subject;
