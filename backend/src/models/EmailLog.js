import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
  },
  teacherEmail: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['success', 'fail'],
    default: 'success',
  },
  error: {
    type: String,
    default: '',
  },
  message: {
    type: String,
    default: '',
  },
});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);
export default EmailLog;
