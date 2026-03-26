import fs from 'fs';
import fsp from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import zlib from 'zlib';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const ensureDir = async (dir) => {
  await fsp.mkdir(dir, { recursive: true });
};

const nowStamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}-${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
};

const uri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
if (!uri) {
  console.error('Missing MONGO_URI (or MONGODB_URI / MONGO_URL).');
  process.exit(1);
}

const backupsDir = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.resolve(process.cwd(), 'backups');

const main = async () => {
  await ensureDir(backupsDir);

  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 5000 }).asPromise();
  try {
    const subjects = await conn.db.collection('subjects').find({}).toArray();
    const posts = await conn.db.collection('posts').find({}).toArray();

    const payload = {
      generatedAt: new Date().toISOString(),
      collections: {
        subjects,
        posts,
      },
    };

    const filename = `mongo-backup-posts-subjects-${nowStamp()}.json.gz`;
    const outPath = path.join(backupsDir, filename);

    await new Promise((resolve, reject) => {
      const gzip = zlib.createGzip({ level: 9 });
      const out = fs.createWriteStream(outPath, { flags: 'wx' });
      out.on('error', reject);
      gzip.on('error', reject);
      out.on('finish', resolve);
      gzip.end(JSON.stringify(payload));
      gzip.pipe(out);
    });

    console.log(JSON.stringify({ ok: true, outPath, subjects: subjects.length, posts: posts.length }));
  } finally {
    await conn.close();
  }
};

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
