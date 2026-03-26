import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const chunk = (items, size) => {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

const upsertMany = async (collection, docs) => {
  if (docs.length === 0) return;
  const batches = chunk(docs, 500);
  for (const batch of batches) {
    await collection.bulkWrite(
      batch.map((doc) => ({
        replaceOne: {
          filter: { _id: doc._id },
          replacement: doc,
          upsert: true,
        },
      })),
      { ordered: false }
    );
  }
};

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Missing MONGO_URI (or MONGODB_URI / MONGO_URL).');
  process.exit(1);
}

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
if (!inputPath) {
  console.error('Usage: node scripts/restore-posts-subjects.mjs /path/to/backup.json.gz');
  process.exit(1);
}

const wipeFirst = process.argv.includes('--wipe');

const readGzipJson = async (p) => {
  const gz = await fs.readFile(p);
  const jsonBuf = await new Promise((resolve, reject) => {
    zlib.gunzip(gz, (err, out) => (err ? reject(err) : resolve(out)));
  });
  return JSON.parse(jsonBuf.toString('utf8'));
};

const main = async () => {
  const payload = await readGzipJson(inputPath);
  const subjects = payload?.collections?.subjects || [];
  const posts = payload?.collections?.posts || [];

  const subjectIds = new Set(subjects.map((s) => String(s._id)));
  const invalidPost = posts.find((p) => !p?.subject_id || !subjectIds.has(String(p.subject_id)));
  if (invalidPost) {
    throw new Error('Backup contains posts with missing/invalid subject_id.');
  }

  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    if (wipeFirst) {
      await conn.db.collection('posts').deleteMany({});
      await conn.db.collection('subjects').deleteMany({});
    }
    await upsertMany(conn.db.collection('subjects'), subjects);
    await upsertMany(conn.db.collection('posts'), posts);
    console.log(JSON.stringify({ ok: true, restored: { subjects: subjects.length, posts: posts.length }, wipeFirst }));
  } finally {
    await conn.close();
  }
};

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
