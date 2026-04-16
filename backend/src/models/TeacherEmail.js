import mongoose from 'mongoose';

const teacherEmailSchema = new mongoose.Schema({
  subject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    trim: true,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const TeacherEmail = mongoose.model('TeacherEmail', teacherEmailSchema);
export default TeacherEmail;
