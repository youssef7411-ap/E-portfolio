import express from 'express';
import cors from 'cors';
import compression from 'compression';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import aiRoutes from './routes/ai.js';
import fileRoutes from './routes/files.js';
import subjectRoutes from './routes/subjects.js';
import postRoutes from './routes/posts.js';
import visitorRoutes from './routes/visitors.js';
import settingsRoutes from './routes/settings.js';
import authenticate from './middleware/authenticate.js';
import { hasObjectStorageConfig, uploadBufferToObjectStorage } from './utils/objectStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(compression());
app.set('trust proxy', 1);

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 250);
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

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
  storage: hasObjectStorageConfig() ? memoryStorage : diskStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => cb(null, true),
});

const corsOriginEnv = process.env.CORS_ORIGIN
  || process.env.CLIENT_URL
  || (process.env.NODE_ENV === 'production' ? '*' : 'http://localhost:3000');
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

const MEDIA_EXT_RE = /\.(pdf|jpe?g|png|gif|webp|avif|svg|bmp|mp4|webm|mov|avi|mkv|ogg)$/i;
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

  const rawOriginal = String(req.file.originalname || '');
  const safeOriginal = path.basename(rawOriginal)
    .replace(/\0/g, '')
    .replace(/[^\w.\- ()]+/g, '_')
    .slice(0, 120) || 'upload';
  const ext = path.extname(safeOriginal).slice(1).toLowerCase();
  const blockedExt = new Set(['exe', 'msi', 'dmg', 'pkg', 'app', 'dll', 'so', 'dylib', 'p12', 'pfx', 'pem', 'key', 'crt', 'cer', 'der', 'keystore']);
  if (blockedExt.has(ext)) {
    return res.status(400).json({ message: 'Blocked file type.' });
  }

  if (!hasObjectStorageConfig()) {
    const port = process.env.PORT || 5002;
    const inferredBaseUrl = `${req.protocol}://${req.get('host')}`;
    const baseUrl = process.env.SERVER_URL || inferredBaseUrl || `http://localhost:${port}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    return res.json({
      url,
      downloadUrl: url,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }

  uploadBufferToObjectStorage({
    buffer: req.file.buffer,
    originalName: safeOriginal,
    mimetype: req.file.mimetype,
  })
    .then((result) => res.json({
      url: result.url,
      downloadUrl: result.downloadUrl,
      filename: safeOriginal,
      mimetype: req.file.mimetype,
      size: req.file.size,
    }))
    .catch((error) => {
      console.error('Upload failed:', error);
      const message = String(error?.message || 'Upload failed').slice(0, 200);
      res.status(500).json({ message });
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/settings', settingsRoutes);

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
