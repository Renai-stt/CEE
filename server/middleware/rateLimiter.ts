import rateLimit from 'express-rate-limit';

const getClientIp = (req: any): string => {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string') {
    return xForwardedFor.split(',')[0].trim();
  }
  if (Array.isArray(xForwardedFor) && xForwardedFor[0]) {
    return xForwardedFor[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // limit each IP to 60 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Suppress proxy header validation warnings behind Cloud Run reverse proxies
  keyGenerator: getClientIp,
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

export const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60, // 60 uploads per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  validate: false, // Suppress proxy header validation warnings behind Cloud Run reverse proxies
  keyGenerator: getClientIp,
  message: {
    error: 'Upload limit reached. Please wait a few moments before scanning more receipts.',
  },
});
