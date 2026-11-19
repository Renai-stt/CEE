import mongoose from 'mongoose';
import { config } from '../config.ts';

let isMongoConnected = false;
let mongoConnectionError: string | null = null;
let connectionPromise: Promise<boolean> | null = null;

// Suppress unhandled error warnings on the mongoose connection
mongoose.connection.on('error', (err) => {
  mongoConnectionError = err.message;
});

export function connectDatabase(): Promise<boolean> {
  if (mongoose.connection.readyState === 1) {
    isMongoConnected = true;
    return Promise.resolve(true);
  }
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    if (!config.mongoUri) {
      console.log('[Database] No MONGO_URI configured, operating with local file persistence.');
      return false;
    }

    // Mask credentials for logs
    const maskedUri = config.mongoUri.replace(/:([^:@]{3,})@/, ':***@');
    const isLocal =
      config.mongoUri.includes('127.0.0.1') || config.mongoUri.includes('localhost');
    const timeoutMs = isLocal ? 500 : 7000;

    try {
      console.log(`[Database] Attempting MongoDB connection to ${maskedUri}...`);

      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: timeoutMs,
        connectTimeoutMS: timeoutMs,
        autoIndex: false, // autoIndex should be false in production serverless for speed
      });

      isMongoConnected = true;
      mongoConnectionError = null;
      console.log('[Database] Successfully connected to MongoDB via Mongoose ODM.');
      return true;
    } catch (err: any) {
      isMongoConnected = false;
      mongoConnectionError = err.message;
      connectionPromise = null; // Reset so next invocation can retry connecting

      // Disconnect to prevent pending background socket retries
      try {
        await mongoose.disconnect();
      } catch {}

      const isAtlas =
        config.mongoUri.includes('mongodb.net') || config.mongoUri.includes('mongodb+srv');
      if (
        isAtlas &&
        (err.message.includes('whitelist') || err.message.includes('Could not connect to any servers'))
      ) {
        console.warn(
          `[Database] Notice: MongoDB Atlas cluster is unreachable from this cloud environment. ` +
            `To connect Atlas, add 0.0.0.0/0 to your Atlas Network Access IP Whitelist. ` +
            `The app is continuing seamlessly using local persistent storage.`
        );
      } else {
        console.warn(
          `[Database] MongoDB offline (${err.message}). Continuing seamlessly using local persistent storage.`
        );
      }

      return false;
    }
  })();

  return connectionPromise;
}

export async function waitForDatabase(maxWaitMs = 7500): Promise<void> {
  if (!connectionPromise) return;
  await Promise.race([
    connectionPromise.then(() => undefined),
    new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
  ]);
}

export function isConnectedToMongo(): boolean {
  return isMongoConnected;
}

export function getMongoConnectionError(): string | null {
  return mongoConnectionError;
}
