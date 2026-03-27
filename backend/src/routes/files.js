import express from 'express';
import crypto from 'crypto';
import path from 'path';
 
const cloudinary = await import('cloudinary').then(m => m.v2);
 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
 
const router = express.Router();
 
const isHttpUrl = (value) => {
  try {
    const u = new URL(String(value));
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
};
 
const isCloudinaryDeliveryUrl = (value) => /(^|\/\/)res\.cloudinary\.com\//i.test(String(value || ''));
 
const parseCloudinaryUrl = (value) => {
  try {
    const u = new URL(String(value));
    const parts = u.pathname.split('/').filter(Boolean);
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return null;
 
    const cloudName = parts[1] || '';
    const resourceType = parts[2] || '';
    if (!cloudName || !['image', 'raw', 'video'].includes(resourceType)) return null;
 
    const afterUpload = parts.slice(uploadIndex + 1);
    const versionIndex = afterUpload.findIndex((p) => /^v\d+$/.test(p));
    const fileParts = (versionIndex === -1 ? afterUpload : afterUpload.slice(versionIndex + 1)).filter(Boolean);
    if (!fileParts.length) return null;
 
    const joined = fileParts.join('/');
    const ext = path.extname(joined).slice(1).toLowerCase();
    const publicId = joined.replace(/\.[^.]+$/, '');
    return { cloudName, resourceType, publicId, format: ext || undefined };
  } catch {
    return null;
  }
};
 
const sanitizeAttachmentName = (value) => String(value || 'download')
  .trim()
  .replace(/[/\\]/g, '-')
  .replace(/[^\w.\- ]+/g, '')
  .slice(0, 120) || 'download';
 
const headOk = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (res.status === 401 || res.status === 403) return false;
    if (res.status === 404) return false;
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
 
const buildCandidateUrls = ({ resourceType, publicId, format, forDownload, attachmentName }) => {
  const base = {
    secure: true,
    resource_type: resourceType,
    sign_url: true,
    ...(format ? { format } : {}),
  };
 
  const flags = forDownload
    ? { flags: attachmentName ? `attachment:${attachmentName}` : 'attachment' }
    : {};
 
  const types = ['upload', 'private', 'authenticated'];
  return types.map((type) => cloudinary.url(publicId, { ...base, type, ...flags }));
};
 
const resolveAccessibleUrl = async (candidates) => {
  for (const u of candidates) {
    const ok = await headOk(u);
    if (ok) return u;
  }
  return candidates[0] || '';
};
 
const ensureReady = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET
);
 
const handleRedirect = async (req, res, { forDownload }) => {
  const originalUrl = String(req.query.url || '').trim();
  const name = sanitizeAttachmentName(req.query.name);
 
  if (!originalUrl || !isHttpUrl(originalUrl)) {
    return res.status(400).json({ message: 'Missing or invalid url' });
  }
 
  if (!isCloudinaryDeliveryUrl(originalUrl) || !ensureReady()) {
    return res.redirect(302, originalUrl);
  }
 
  const parsed = parseCloudinaryUrl(originalUrl);
  if (!parsed) {
    return res.redirect(302, originalUrl);
  }
 
  const candidates = buildCandidateUrls({
    resourceType: parsed.resourceType,
    publicId: parsed.publicId,
    format: parsed.format,
    forDownload,
    attachmentName: name,
  });
 
  const resolved = await resolveAccessibleUrl(candidates);
  if (!resolved) {
    const fallbackId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return res.status(502).json({ message: `Could not resolve file (${fallbackId})` });
  }
 
  return res.redirect(302, resolved);
};
 
router.get('/preview', async (req, res) => {
  return handleRedirect(req, res, { forDownload: false });
});
 
router.get('/download', async (req, res) => {
  return handleRedirect(req, res, { forDownload: true });
});
 
export default router;

