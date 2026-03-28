import path from 'path';
const cloudinary = await import('cloudinary').then(m => m.v2);
import { 
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const trimTrailingSlashes = (value = '') => String(value).trim().replace(/\/+$/, '');

const R2_ACCOUNT_ID = String(process.env.R2_ACCOUNT_ID || '').trim();
const R2_ACCESS_KEY_ID = String(process.env.R2_ACCESS_KEY_ID || '').trim();
const R2_SECRET_ACCESS_KEY = String(process.env.R2_SECRET_ACCESS_KEY || '').trim();
const R2_BUCKET_NAME = String(process.env.R2_BUCKET_NAME || '').trim();
const R2_PUBLIC_URL = trimTrailingSlashes(process.env.R2_PUBLIC_URL || '');
const R2_BUCKET_FOLDER = String(process.env.R2_BUCKET_FOLDER || 'e-portfolio')
  .trim()
  .replace(/^\/+|\/+$/g, '');

let r2Client;

export const hasCloudinaryConfig = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

export const hasR2Config = () => Boolean(
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET_NAME &&
  R2_PUBLIC_URL,
);

export const hasObjectStorageConfig = () => hasCloudinaryConfig() || hasR2Config();


const getR2Client = () => {
  if (!hasR2Config()) return null;
  if (!r2Client) {
    r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return r2Client;
};

const buildObjectKey = (originalName = '') => {
  const ext = path.extname(originalName).toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  return R2_BUCKET_FOLDER ? `${R2_BUCKET_FOLDER}/${fileName}` : fileName;
};

const encodeObjectKey = (key) => key
  .split('/')
  .map((segment) => encodeURIComponent(segment))
  .join('/');

export const buildPublicObjectUrl = (key) => {
  if (!key || !R2_PUBLIC_URL) return '';
  return `${R2_PUBLIC_URL}/${encodeObjectKey(key)}`;
};

export const uploadBufferToCloudinary = (buffer, originalName, mimetype) => {
  return new Promise((resolve, reject) => {
    const safeExt = path.extname(originalName).slice(1).toLowerCase().replace(/[^a-z0-9]+/g, '');
    const safeBase = path.parse(originalName).name.replace(/[^\w.\- ()]+/g, '_').slice(0, 80) || 'upload';
    const resourceType = String(mimetype || '').startsWith('image/')
      ? 'image'
      : String(mimetype || '').startsWith('video/')
        ? 'video'
        : 'raw';

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: 'e-portfolio',
        public_id: `${safeBase}-${Date.now()}`,
        ...(safeExt ? { format: safeExt } : {}),
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({
          public_id: result.public_id,
          url: result.secure_url,
          downloadUrl: result.secure_url, // Frontend handles attachment
        });
      }
    );
    stream.end(buffer);
  });
};

export const uploadBufferToObjectStorage = async ({ buffer, originalName, mimetype }) => {
  if (hasCloudinaryConfig()) {
    return uploadBufferToCloudinary(buffer, originalName, mimetype);
  }
  const client = getR2Client();
  if (!client) {
    throw new Error('No storage configured (Cloudinary or R2)');
  }
  const key = buildObjectKey(originalName);
  await client.send(new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype || 'application/octet-stream',
  }));
  const url = buildPublicObjectUrl(key);
  return {
    key,
    url,
    downloadUrl: url,
  };
};

export const listManagedObjectKeys = async () => {
  const client = getR2Client();
  if (!client) return [];

  const prefix = R2_BUCKET_FOLDER ? `${R2_BUCKET_FOLDER}/` : undefined;
  const keys = [];
  let continuationToken;

  do {
    const result = await client.send(new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }));

    for (const item of (result.Contents || [])) {
      if (item.Key) {
        keys.push(item.Key);
      }
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
};

export const deleteManagedObjects = async (keys = []) => {
  const client = getR2Client();
  if (!client || !keys.length) return 0;

  let deleted = 0;
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    await client.send(new DeleteObjectsCommand({
      Bucket: R2_BUCKET_NAME,
      Delete: {
        Objects: chunk.map((Key) => ({ Key })),
        Quiet: true,
      },
    }));
    deleted += chunk.length;
  }

  return deleted;
};

export const extractManagedObjectKeyFromUrl = (url) => {
  if (!url || !R2_PUBLIC_URL) return '';

  try {
    const base = new URL(R2_PUBLIC_URL);
    const target = new URL(url);
    if (base.origin !== target.origin) return '';

    const basePath = trimTrailingSlashes(base.pathname);
    const targetPath = decodeURIComponent(target.pathname);
    const prefix = basePath ? `${basePath}/` : '/';

    if (!targetPath.startsWith(prefix)) return '';

    return targetPath.slice(prefix.length).replace(/^\/+/, '');
  } catch {
    return '';
  }
};
