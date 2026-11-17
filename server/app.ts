import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config.ts';
import { isConnectedToMongo, getMongoConnectionError, waitForDatabase } from './db/connection.ts';
import authRoutes from './routes/auth.routes.ts';
import receiptRoutes from './routes/receipt.routes.ts';
import dashboardRoutes from './routes/dashboard.routes.ts';
import exportRoutes from './routes/export.routes.ts';
import { authLimiter, uploadLimiter } from './middleware/rateLimiter.ts';

export function createApp() {
  const app = express();

  // Trust Cloud Run / reverse proxy headers (X-Forwarded-For, Forwarded)
  app.set('trust proxy', 1);

  // Security headers with permissive settings for AI Studio dev preview iframe
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS support
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Serve uploaded receipt images
  if (!process.env.VERCEL) {
    app.use('/uploads', express.static(config.uploadDir));
  }

  // Health check endpoint
  app.get('/api/v1/health', (_req, res) => {
    const mongoConnected = isConnectedToMongo();
    const mongoErr = getMongoConnectionError();
    return res.json({
      status: process.env.VERCEL && !mongoConnected ? 'error' : 'ok',
      service: 'ไหน Receipt API',
      database: mongoConnected
        ? 'MongoDB (Mongoose)'
        : process.env.VERCEL
          ? 'MongoDB unavailable'
          : 'Local File Persistence (Dev Mode)',
      mongoConnected,
      mongoNotice: !mongoConnected && mongoErr ? mongoErr : undefined,
      geminiModel: config.geminiModel,
      hasGeminiKey: Boolean(config.geminiApiKey || process.env.GEMINI_API_KEY),
      time: new Date().toISOString(),
    });
  });

  // Ensure initial DB handshake completes before serving data routes
  app.use('/api/v1', async (_req, res, next) => {
    await waitForDatabase();
    if (process.env.VERCEL) {
      const missingConfig = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'].filter(
        (name) => !process.env[name]
      );
      if (missingConfig.length > 0) {
        return res.status(503).json({
          error: `Missing required environment variables: ${missingConfig.join(', ')}`,
        });
      }
      if (!isConnectedToMongo()) {
        return res.status(503).json({ error: 'MongoDB is unavailable. Check MONGO_URI and Atlas network access.' });
      }
    }
    next();
  });

  // Mount API v1 routes
  app.use('/api/v1/auth', authLimiter, authRoutes);
  app.use('/api/v1/receipts/upload', uploadLimiter);
  app.use('/api/v1/receipts', receiptRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);
  app.use('/api/v1/export', exportRoutes);

  return app;
}
