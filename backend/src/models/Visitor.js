import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
  },
  visits: {
    type: Number,
    default: 0,
  },
  firstSeenAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
  lastPath: {
    type: String,
    default: '/',
  },
  userAgent: {
    type: String,
    default: '',
  },
  locationPermission: {
    type: String,
    enum: ['granted', 'denied', 'prompt', 'unsupported', 'unknown'],
    default: 'unknown',
  },
  location: {
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    accuracy: { type: Number, default: null },
  },
}, {
  timestamps: true,
});

const Visitor = mongoose.model('Visitor', visitorSchema);
export default Visitor;
