import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let memoryServer;

const parseBool = (value) => {
  if (value === undefined || value === null) return undefined;
  const v = String(value).trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
};

const isProduction = process.env.NODE_ENV === 'production';
const allowMemoryFallback = (() => {
  const envValue = parseBool(process.env.ALLOW_MEMORY_FALLBACK);
  if (envValue !== undefined) return envValue;
  return !isProduction;
})();

export const connectDB = async () => {
  // Avoid indefinite buffering when DB is down.
  mongoose.set('bufferCommands', false);

  const persistentUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.MONGO_URL;
  if (isProduction && !persistentUri) {
    throw new Error('MONGO_URI is required in production.');
  }

  try {
    await mongoose.connect(persistentUri || 'mongodb://localhost:27017/eportfolio', {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 10),
    });
    console.log('✓ MongoDB connected');
  } catch (error) {
    console.error('✗ MongoDB connection failed:', error.message);

    if (!allowMemoryFallback) {
      throw new Error('Persistent MongoDB is required. Set ALLOW_MEMORY_FALLBACK=true only if you explicitly want temporary data.');
    }

    console.log('↻ Starting in-memory MongoDB fallback...');

    try {
      memoryServer = await MongoMemoryServer.create();
      const memoryUri = memoryServer.getUri();
      await mongoose.connect(memoryUri, { serverSelectionTimeoutMS: 5000 });
      console.log('✓ In-memory MongoDB connected (temporary data)');
    } catch (memoryError) {
      console.error('✗ In-memory MongoDB fallback failed:', memoryError.message);
      throw new Error('Database unavailable and memory fallback failed.');
    }
  }
};

export const closeDB = async () => {
  await mongoose.connection.close();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};
