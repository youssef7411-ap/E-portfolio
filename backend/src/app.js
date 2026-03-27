import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import subjectRoutes from './routes/subjects.js';
import postRoutes from './routes/posts.js';
import visitorRoutes from './routes/visitors.js';
import authenticate from './middleware/authenticate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME
    && process.env.CLOUDINARY_API_KEY
    && process.env.CLOUDINARY_API_SECRET
);

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 250);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const looksLikeCloudinaryTransformation = (segment = '') => (
  segment.includes(',') || /(^|,)(?:[a-z]{1,3}|fl|fps|t)_[^/]+/i.test(segment)
);

const toCloudinaryAttachmentUrl = (url) => {
  if (!url) return url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  if (!/\.?res\.cloudinary\.com$/i.test(parsed.hostname)) return url;

  const segments = parsed.pathname.split('/').filter(Boolean);
  if (segments.length < 4) return url;

  const [cloudName, resourceType, deliveryType, ...rest] = segments;
  if (deliveryType !== 'upload' || !rest.length) return url;

  const [first, ...remaining] = rest;
  const firstParts = String(first || '').split(',');
  if (firstParts.some((part) => /^fl_attachment(?::|$)/i.test(part))) {
    return url;
  }

  const nextSegments = /^v\d+$/i.test(first) || !looksLikeCloudinaryTransformation(first)
    ? [cloudName, resourceType, deliveryType, 'fl_attachment', ...rest]
    : [cloudName, resourceType, deliveryType, `fl_attachment,${first}`, ...remaining];

  parsed.pathname = `/${nextSegments.join('/')}`;
  return parsed.toString();
};

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: hasCloudinaryConfig ? memoryStorage : diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => cb(null, true),
});

const corsOriginEnv = process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000';
const allowedOrigins = corsOriginEnv.split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*')) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MEDIA_EXT_RE = /\.(jpe?g|png|gif|webp|avif|svg|bmp|mp4|webm|mov|avi|mkv|ogg)$/i;
app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (MEDIA_EXT_RE.test(ext)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
  } else {
    res.setHeader('Content-Disposition', 'attachment');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  next();
}, express.static(uploadsDir, { maxAge: 0 }));

app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

app.post('/api/upload', authenticate, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  if (!hasCloudinaryConfig) {
    const port = process.env.PORT || 5002;
    const url = `${process.env.SERVER_URL || `http://localhost:${port}`}/uploads/${req.file.filename}`;
    return res.json({
      url,
      downloadUrl: url,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }

  const resourceType = req.file.mimetype?.toLowerCase().startsWith('video/') ? 'video' : 'auto';
  const ext = path.extname(req.file.originalname).toLowerCase();
  const publicId = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? '' : ''}`;

  cloudinary.uploader
    .upload_stream(
      {
        folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'e-portfolio',
        resource_type: resourceType,
        public_id: publicId,
      },
      (error, result) => {
        if (error || !result) {
          return res.status(500).json({ message: 'Upload failed' });
        }
        return res.json({
          url: result.secure_url,
          downloadUrl: toCloudinaryAttachmentUrl(result.secure_url),
          filename: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        });
      }
    )
    .end(req.file.buffer);
});

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/visitors', visitorRoutes);

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: `File too large. Max size is ${MAX_FILE_SIZE_MB}MB.` });
    }
    return res.status(400).json({ message: err.message });
  }
  res.status(500).json({ message: 'Internal server error' });
});

export default app;
