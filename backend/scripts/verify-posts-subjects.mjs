import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import Subject from '../src/models/Subject.js';
import Post from '../src/models/Post.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Missing MONGO_URI (or MONGODB_URI / MONGO_URL).');
  process.exit(1);
}

const main = async () => {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    const subjectCount = await Subject.countDocuments();
    const postCount = await Post.countDocuments();

    const samplePosts = await Post.find()
      .sort({ createdAt: -1 })
      .limit(25)
      .populate('subject_id', 'name description')
      .lean();

    const missingPopulation = samplePosts.filter((p) => !p.subject_id || !p.subject_id.name);
    if (missingPopulation.length > 0) {
      throw new Error('Populate check failed: some posts reference missing subjects.');
    }

    const sortedSubjects = await Subject.find().sort({ order: 1, createdAt: -1 }).limit(25).lean();

    console.log(
      JSON.stringify(
        {
          ok: true,
          counts: { subjects: subjectCount, posts: postCount },
          checks: {
            populate: { sampled: samplePosts.length, missing: missingPopulation.length },
            subjectSort: { sampled: sortedSubjects.length },
          },
        },
        null,
        2
      )
    );
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
