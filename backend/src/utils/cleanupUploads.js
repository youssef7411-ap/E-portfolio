import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Post from '../models/Post.js';
import Subject from '../models/Subject.js';
import {
  deleteManagedObjects,
  extractManagedObjectKeyFromUrl,
  hasObjectStorageConfig,
  listManagedObjectKeys,
} from './objectStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../../../uploads');

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
    for (const f of (p.files || [])) {
      if (f.url) urls.add(f.url);
      if (f.downloadUrl) urls.add(f.downloadUrl);
    }
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

/** Remove R2 objects in the managed folder that are not referenced. */
async function cleanObjectStorageUploads(referencedUrls) {
  if (!hasObjectStorageConfig()) return 0;

  const referencedKeys = new Set();
  for (const url of referencedUrls) {
    const key = extractManagedObjectKeyFromUrl(url);
    if (key) {
      referencedKeys.add(key);
    }
  }

  const existingKeys = await listManagedObjectKeys();
  const toDelete = existingKeys.filter((key) => !referencedKeys.has(key));
  return deleteManagedObjects(toDelete);
}

/**
 * Delete every upload (local disk + object storage) that is not referenced by
 * any Subject or Post document in the database.
 *
 * Safe to call on startup and after destructive operations.
 */
export async function cleanupOrphanedUploads() {
  try {
    const referencedUrls = await getReferencedUrls();
    const localDeleted = await cleanLocalUploads(referencedUrls);
    const objectDeleted = hasObjectStorageConfig()
      ? await cleanObjectStorageUploads(referencedUrls)
      : 0;

    const total = localDeleted + objectDeleted;
    if (total > 0) {
      console.log(
        `✓ Cleanup: removed ${localDeleted} local + ${objectDeleted} object-storage orphaned uploads`,
      );
    }
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}
