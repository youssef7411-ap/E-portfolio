import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 as cloudinary } from 'cloudinary';
import Post from '../models/Post.js';
import Subject from '../models/Subject.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../../uploads');

const hasCloudinaryConfig = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET,
);

/** Collect every upload URL currently referenced in the database. */
async function getReferencedUrls() {
  const [subjects, posts] = await Promise.all([
    Subject.find().select('image').lean(),
    Post.find().select('files images videos').lean(),
  ]);

  const urls = new Set();
  for (const s of subjects) {
    if (s.image) urls.add(s.image);
  }
  for (const p of posts) {
    for (const f of (p.files || [])) if (f.url) urls.add(f.url);
    for (const img of (p.images || [])) if (img) urls.add(img);
    for (const vid of (p.videos || [])) if (vid) urls.add(vid);
  }
  return urls;
}

/** Remove files from the local uploads directory that are not referenced. */
async function cleanLocalUploads(referencedUrls) {
  if (!fs.existsSync(uploadsDir)) return 0;

  // Extract just the filename segment from every local /uploads/<name> URL
  const refFilenames = new Set();
  for (const url of referencedUrls) {
    const match = url.match(/\/uploads\/([^/?#]+)$/);
    if (match) refFilenames.add(match[1]);
  }

  const files = fs.readdirSync(uploadsDir);
  let deleted = 0;
  for (const filename of files) {
    if (!refFilenames.has(filename)) {
      try {
        fs.unlinkSync(path.join(uploadsDir, filename));
        deleted++;
      } catch (err) {
        console.error(`Cleanup: could not delete local file ${filename}:`, err.message);
      }
    }
  }
  return deleted;
}

/** Remove Cloudinary resources in the portfolio folder that are not referenced. */
async function cleanCloudinaryUploads(referencedUrls) {
  if (!hasCloudinaryConfig()) return 0;

  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'e-portfolio';
  let deleted = 0;
  let nextCursor;

  do {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder + '/',
      max_results: 500,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    });

    const toDelete = result.resources
      .filter(r => !referencedUrls.has(r.secure_url))
      .map(r => r.public_id);

    if (toDelete.length) {
      await cloudinary.api.delete_resources(toDelete);
      deleted += toDelete.length;
    }

    nextCursor = result.next_cursor;
  } while (nextCursor);

  return deleted;
}

/**
 * Delete every upload (local disk + Cloudinary) that is not referenced by
 * any Subject or Post document in the database.
 *
 * Safe to call on startup and after destructive operations.
 */
export async function cleanupOrphanedUploads() {
  try {
    const referencedUrls = await getReferencedUrls();
    const localDeleted = await cleanLocalUploads(referencedUrls);
    const cloudDeleted = hasCloudinaryConfig()
      ? await cleanCloudinaryUploads(referencedUrls)
      : 0;

    const total = localDeleted + cloudDeleted;
    if (total > 0) {
      console.log(
        `✓ Cleanup: removed ${localDeleted} local + ${cloudDeleted} Cloudinary orphaned uploads`,
      );
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}
