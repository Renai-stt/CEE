import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';

function resolveGeminiConfig() {
  const rawModel = process.env.GEMINI_MODEL?.trim();
  let apiKey = process.env.GEMINI_API_KEY || '';
  let modelName = DEFAULT_GEMINI_MODEL;

  const isInvalidOrDeprecated =
    !rawModel ||
    rawModel.startsWith('AQ.') ||
    rawModel.startsWith('AIza') ||
    rawModel.startsWith('gemini-1.') ||
    rawModel.startsWith('gemini-2.0') ||
    rawModel.startsWith('gemini-3.8');

  if (rawModel && (rawModel.startsWith('AQ.') || rawModel.startsWith('AIza'))) {
    if (!apiKey) apiKey = rawModel;
    modelName = DEFAULT_GEMINI_MODEL;
  } else if (!isInvalidOrDeprecated && (rawModel.startsWith('gemini-') || rawModel.startsWith('models/'))) {
    modelName = rawModel;
  }

  return { apiKey, modelName };
}

const { apiKey, modelName } = resolveGeminiConfig();

export const config = {
  // AI Studio requires the dev server to run on port 3000
  port: process.env.PORT === '8080' && process.env.NODE_ENV !== 'production' ? 3000 : parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  geminiApiKey: apiKey,
  geminiModel: modelName,
  mongoUri: process.env.MONGO_URI || (process.env.VERCEL ? '' : 'mongodb://127.0.0.1:27017/receipt_tracker'),
  jwtSecret: process.env.JWT_SECRET || 'receipt_tracker_jwt_secret_dev_key_32chars',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'receipt_tracker_refresh_secret_dev_key_32chars',
  jwtExpiresIn: '2h',
  jwtRefreshExpiresIn: '7d',
  uploadDir: process.env.VERCEL
    ? path.resolve('/tmp/receipt-uploads')
    : path.resolve(process.cwd(), 'uploads'),
  appUrl: process.env.APP_URL || 'http://localhost:3000',
};
