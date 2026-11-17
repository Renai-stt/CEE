import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { UserRepository } from '../db/repository.ts';
import { generateTokens, requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { config } from '../config.ts';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

function isHttpsRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
  return req.secure || proto === 'https' || config.nodeEnv === 'production';
}

function setAuthCookies(req: Request, res: Response, accessToken: string, refreshToken: string) {
  const isSecure = isHttpsRequest(req);
  // Access token cookie
  res.cookie('token', accessToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 hours
    path: '/',
  });
  // Refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

// POST /api/v1/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues?.[0]?.message || 'Validation error',
      });
    }

    const { email, password, name } = parseResult.data;
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await UserRepository.create({
      email,
      passwordHash,
      name,
    });

    return res.status(201).json({
      message: 'Registration successful. Please sign in.',
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/v1/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues?.[0]?.message || 'Validation error',
      });
    }

    const { email, password } = parseResult.data;
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(req, res, accessToken, refreshToken);

    return res.json({
      message: 'Login successful',
      token: accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
});

// POST /api/v1/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const isSecure = isHttpsRequest(req);
  res.clearCookie('token', {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
    path: '/',
  });
  return res.json({ message: 'Logged out successfully' });
});

// POST /api/v1/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;
    const user = await UserRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    const tokens = generateTokens(user);
    setAuthCookies(req, res, tokens.accessToken, tokens.refreshToken);

    return res.json({
      token: tokens.accessToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
});

// GET /api/v1/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await UserRepository.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

export default router;
