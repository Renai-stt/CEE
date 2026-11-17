import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config.ts';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const unique = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    cb(null, unique);
  },
});

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: process.env.VERCEL ? 4 * 1024 * 1024 : 10 * 1024 * 1024,
    files: 10, // accept multiple files at once
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    if (allowedMimes.includes(file.mimetype.toLowerCase()) || file.originalname.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Allowed formats: JPG, PNG, WEBP, HEIC (Max 10MB).'));
    }
  },
});

/**
 * Validates file magic bytes to prevent masqueraded files
 */
export async function validateMagicBytes(filePath: string): Promise<boolean> {
  try {
    const buffer = Buffer.alloc(12);
    const fd = await fs.promises.open(filePath, 'r');
    await fd.read(buffer, 0, 12, 0);
    await fd.close();

    const hex = buffer.toString('hex').toLowerCase();

    // JPEG starts with ffd8ff
    if (hex.startsWith('ffd8ff')) return true;
    // PNG starts with 89504e47
    if (hex.startsWith('89504e47')) return true;
    // WEBP starts with RIFF (52494646) and has WEBP at offset 8 (57454250)
    if (hex.startsWith('52494646') && hex.includes('57454250')) return true;
    // HEIC contains 'ftyp' (66747970) at byte 4
    if (hex.substring(8, 16) === '66747970') return true;

    // Fallback: if file has image content
    return false;
  } catch {
    return false;
  }
}
