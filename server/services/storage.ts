import fs from 'fs';
import path from 'path';
import { del, put } from '@vercel/blob';
import { config } from '../config.ts';

export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string; // URL used to retrieve the stored file
  filepath?: string; // Absolute path on disk when using local storage
}

export interface IStorageService {
  save(file: Express.Multer.File, ownerId: string): Promise<StoredFile>;
  delete(filename: string): Promise<boolean>;
  getFilePath(filename: string): string;
}

export class LocalStorageService implements IStorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = config.uploadDir;
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async save(file: Express.Multer.File, _ownerId: string): Promise<StoredFile> {
    // Multer diskStorage or memoryStorage
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const destinationPath = path.join(this.baseDir, uniqueName);

    if (file.buffer) {
      await fs.promises.writeFile(destinationPath, file.buffer);
    } else if (file.path && file.path !== destinationPath) {
      await fs.promises.copyFile(file.path, destinationPath);
      // Clean up temp file if needed
      try {
        await fs.promises.unlink(file.path);
      } catch {}
    }

    const stats = await fs.promises.stat(destinationPath);

    return {
      filename: uniqueName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: stats.size,
      url: `/uploads/${uniqueName}`,
      filepath: destinationPath,
    };
  }

  async delete(filename: string): Promise<boolean> {
    const safeFilename = path.basename(filename);
    const filepath = path.join(this.baseDir, safeFilename);
    try {
      if (fs.existsSync(filepath)) {
        await fs.promises.unlink(filepath);
        return true;
      }
    } catch (e) {
      console.error('[Storage] Error deleting file:', e);
    }
    return false;
  }

  getFilePath(filename: string): string {
    const safeFilename = path.basename(filename);
    return path.join(this.baseDir, safeFilename);
  }
}

class VercelBlobStorageService implements IStorageService {
  async save(file: Express.Multer.File, ownerId: string): Promise<StoredFile> {
    const data = file.buffer || await fs.promises.readFile(file.path);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
    const accessType = (process.env.VERCEL_BLOB_ACCESS as 'public' | 'private') || 'public';
    const blob = await put(`receipts/${ownerId}/${filename}`, data, {
      access: accessType,
      contentType: file.mimetype,
    });

    return {
      filename: blob.pathname,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      url: accessType === 'private'
        ? `/api/v1/receipts/image?pathname=${encodeURIComponent(blob.pathname)}`
        : blob.url,
    };
  }

  async delete(filename: string): Promise<boolean> {
    try {
      await del(filename);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(_filename: string): string {
    throw new Error('Vercel Blob files do not have a local file path.');
  }
}

export const storageService: IStorageService =
  process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN
    ? new VercelBlobStorageService()
    : new LocalStorageService();
