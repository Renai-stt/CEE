import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.ts';
import { UserRepository } from '../db/repository.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function generateTokens(user: { _id: string; email: string; name: string }) {
  const payload = { id: user._id, email: user.email, name: user.name };
  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '2h' });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.accessToken || req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
    const user = await UserRepository.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User account not found.' });
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid or expired session. Please login again.' });
  }
}
