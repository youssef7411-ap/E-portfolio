import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const PORT = process.env.PORT || 5002;

const [
  { default: app },
  { connectDB },
  { cleanupOrphanedUploads },
] = await Promise.all([
  import('./src/app.js'),
  import('./src/utils/database.js'),
  import('./src/utils/cleanupUploads.js'),
]);

(async () => {
  await connectDB();
  console.log('MongoDB Connected!');
  await cleanupOrphanedUploads();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ Server is running on port ${PORT}`);
  });
})();
