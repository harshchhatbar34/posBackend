import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

// Import all models to ensure they are registered before any queries run
import '@/models/User';
import '@/models/Category';
import '@/models/Section';
import '@/models/Product';
import '@/models/Table';
import '@/models/Order';
import '@/models/OrderItem';
import '@/models/OrderLog';
import '@/models/InventoryItem';
import '@/models/InventoryStockLog';
import '@/models/InventoryUsageLog';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    logger.info('Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    logger.info('Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
      logger.info('Connected to MongoDB successfully');
      return mongoose;
    });
  } else {
    logger.info('Awaiting existing MongoDB connection promise...');
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    logger.error('Error connecting to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
