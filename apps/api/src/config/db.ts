import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { env } from './env';
import { logger } from './logger';

let mongodInstance: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  let uri = env.MONGODB_URI;

  if (!uri) {
    if (process.env.VERCEL || (process.env.NODE_ENV === 'production' && !process.env.ALLOW_IN_MEMORY_DB)) {
      logger.warn('No MONGODB_URI provided in production/Vercel environment. Please configure MONGODB_URI in project environment variables.');
      return mongoose;
    }
    logger.info('No external MONGODB_URI provided. Initializing embedded MongoMemoryServer for zero-config local environment...');
    mongodInstance = await MongoMemoryServer.create();
    uri = mongodInstance.getUri();
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`MongoDB connected successfully [host=${conn.connection.host}, db=${conn.connection.name}]`);
    return conn;
  } catch (err) {
    logger.error({ err }, 'Failed to connect to MongoDB');
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  if (mongodInstance) {
    await mongodInstance.stop();
  }
  logger.info('MongoDB disconnected');
}
