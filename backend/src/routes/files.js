import express from 'express';
import crypto from 'crypto';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
 
const cloudinary = await import('cloudinary').then(m => m.v2);
 
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  ...(process.env.CLOUDINARY_AUTH_TOKEN_KEY ? {
    auth_token: {
      key: process.env.CLOUDINARY_AUTH_TOKEN_KEY,
      duration: Number(process.env.CLOUDINARY_AUTH_TOKEN_DURATION || 300),
    },
  } : {}),
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
 
    const cloudName = parts[0] || '';
    const resourceType = parts[1] || '';
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
 
const buildCandidateUrls = ({ resourceType, publicId, format }) => {
  const base = {
    secure: true,
    resource_type: resourceType,
    sign_url: true,
    ...(format ? { format } : {}),
  };

  const types = ['upload', 'private', 'authenticated'];
  return types.map((type) => cloudinary.url(publicId, { ...base, type }));
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
 
const resolveCloudinaryOrOriginalUrl = async (originalUrl) => {
  if (!originalUrl || !isHttpUrl(originalUrl)) {
    return { ok: false, status: 400, message: 'Missing or invalid url', url: '' };
  }
 
  if (!isCloudinaryDeliveryUrl(originalUrl) || !ensureReady()) {
    return { ok: true, url: originalUrl };
  }
 
  const parsed = parseCloudinaryUrl(originalUrl);
  if (!parsed) {
    return { ok: true, url: originalUrl };
  }
 
  const candidates = buildCandidateUrls({
    resourceType: parsed.resourceType,
    publicId: parsed.publicId,
    format: parsed.format,
  });
 
  const resolved = await resolveAccessibleUrl(candidates);
  if (!resolved) {
    const fallbackId = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return { ok: false, status: 502, message: `Could not resolve file (${fallbackId})`, url: '' };
  }
 
  return { ok: true, url: resolved };
};
 
router.get('/preview', async (req, res) => {
  const originalUrl = String(req.query.url || '').trim();
  const resolved = await resolveCloudinaryOrOriginalUrl(originalUrl);
  if (!resolved.ok) {
    return res.status(resolved.status || 502).json({ message: resolved.message || 'Preview failed' });
  }
  return res.redirect(302, resolved.url);
});
 
router.get('/download', async (req, res) => {
  const originalUrl = String(req.query.url || '').trim();
  const name = sanitizeAttachmentName(req.query.name);
  const resolved = await resolveCloudinaryOrOriginalUrl(originalUrl);
  if (!resolved.ok) {
    return res.status(resolved.status || 502).json({ message: resolved.message || 'Download failed' });
  }
 
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
 
  try {
    const upstream = await fetch(resolved.url, { redirect: 'follow', signal: controller.signal });
    if (!upstream.ok || !upstream.body) {
      return res.status(upstream.status || 502).json({ message: `Upstream download failed (${upstream.status})` });
    }
 
    const contentType = upstream.headers.get('content-type');
    const contentLength = upstream.headers.get('content-length');
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
 
    const asciiName = name.replace(/[^\x20-\x7E]+/g, '').trim() || 'download';
    const encoded = encodeURIComponent(name);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`
    );
 
    res.setHeader('Cache-Control', 'private, max-age=0, no-cache');
    await pipeline(Readable.fromWeb(upstream.body), res);
  } catch {
    return res.status(502).json({ message: 'Download failed' });
  } finally {
    clearTimeout(timer);
  }
});
 
export default router;
