import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/app.js';
import { connectDB } from './src/utils/database.js';
import { cleanupOrphanedUploads } from './src/utils/cleanupUploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5002;

(async () => {
  await connectDB();
  console.log('MongoDB Connected!');
  await cleanupOrphanedUploads();
  app.listen(PORT, () => {
    console.log(`✓ Server is running on http://localhost:${PORT}`);
  });
})();
