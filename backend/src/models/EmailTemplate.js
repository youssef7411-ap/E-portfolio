import mongoose from 'mongoose';

const emailTemplateSchema = new mongoose.Schema({
  subject: {
    type: String,
    default: 'Portfolio Update',
  },
  body: {
    type: String,
    default: 'Dear Teacher,\n\nA new update is available for your subject. Visit: {{subjectLink}}',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
export default EmailTemplate;
