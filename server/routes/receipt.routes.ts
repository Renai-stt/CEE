import { Router, type Response } from 'express';
import fs from 'fs';
import { z } from 'zod';
import { get } from '@vercel/blob';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { uploadMiddleware, validateMagicBytes } from '../middleware/upload.ts';
import { extractReceiptData, validateReceiptMath } from '../services/gemini.ts';
import { ReceiptRepository } from '../db/repository.ts';
import { storageService } from '../services/storage.ts';
import { IReceipt } from '../../shared/types.ts';

const router = Router();

// Protect all receipt routes with authentication
router.use(requireAuth);

const lineItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Item name is required'),
  quantity: z.number().min(0.01).default(1),
  unitPrice: z.number().default(0),
  total: z.number().default(0),
});

const receiptSaveSchema = z.object({
  merchant: z.string().min(1, 'Merchant name is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().optional().default(''),
  items: z.array(lineItemSchema).default([]),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  discount: z.number().default(0),
  serviceCharge: z.number().default(0),
  total: z.number().min(0, 'Total must be non-negative'),
  currency: z.string().default('THB'),
  paymentMethod: z.string().optional().default(''),
  category: z.enum([
    'food',
    'transport',
    'groceries',
    'shopping',
    'bills',
    'health',
    'entertainment',
    'other',
  ]).default('other'),
  imageUrl: z.string().optional().default(''),
  rawAiResponse: z.any().optional(),
  status: z.enum(['pending_review', 'confirmed', 'failed']).default('confirmed'),
  notes: z.string().optional().default(''),
  confidence: z.number().optional().default(1),
});

router.get('/image', async (req: AuthenticatedRequest, res: Response) => {
  const pathname = typeof req.query.pathname === 'string' ? req.query.pathname : '';
  const [folder, ownerId, filename, ...extraSegments] = pathname.split('/');
  if (
    folder !== 'receipts' ||
    ownerId !== req.user!.id ||
    !filename ||
    filename.includes('..') ||
    extraSegments.length > 0
  ) {
    return res.status(404).json({ error: 'Receipt image not found.' });
  }

  try {
    const accessType = (process.env.VERCEL_BLOB_ACCESS as 'public' | 'private') || 'public';
    const blob = await get(pathname, { access: accessType });
    if (!blob || blob.statusCode !== 200) {
      return res.status(404).json({ error: 'Receipt image not found.' });
    }

    const image = Buffer.from(await new Response(blob.stream).arrayBuffer());
    return res
      .set('Content-Type', blob.blob.contentType)
      .set('Cache-Control', 'private, no-store')
      .set('X-Content-Type-Options', 'nosniff')
      .send(image);
  } catch (err) {
    console.error('Error retrieving receipt image:', err);
    return res.status(502).json({ error: 'Failed to retrieve receipt image.' });
  }
});

// POST /api/v1/receipts/upload (multipart, up to 10 files)
router.post('/upload', uploadMiddleware.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No receipt files uploaded.' });
  }

  const results = await Promise.allSettled(
    files.map(async (file) => {
      try {
        const isValidImage = await validateMagicBytes(file.path);
        if (!isValidImage) {
          throw new Error(`File ${file.originalname} does not appear to be a valid image format.`);
        }

        let result: Record<string, unknown>;
        try {
          const extraction = await extractReceiptData(file.path, file.mimetype);
          const mathCheck = validateReceiptMath(extraction);
          result = extraction.isReceipt
            ? { extraction, mathCheck, isReceipt: true }
            : {
              extraction,
              mathCheck,
              isReceipt: false,
              aiFailed: true,
              error:
                extraction.notes ||
                'Image appears blurry or not a receipt. Please retake a clearer photo or fill manually.',
            };
        } catch (geminiErr: any) {
          console.error(`Gemini extraction failed for ${file.originalname}:`, geminiErr);
          result = {
            aiFailed: true,
            error: geminiErr?.message || 'AI failed to read receipt data. Please retry.',
          };
        }

        const storedFile = await storageService.save(file, req.user!.id);
        return {
          filename: file.filename,
          originalName: file.originalname,
          imageUrl: storedFile.url,
          ...result,
        };
      } finally {
        if (process.env.VERCEL) {
          await fs.promises.rm(file.path, { force: true });
        }
      }
    })
  );

  const processed = results.map((r, idx) => {
    if (r.status === 'fulfilled') {
      const hasAiError = Boolean((r.value as any).aiFailed);
      return { success: !hasAiError, ...r.value };
    } else {
      return {
        success: false,
        originalName: files[idx].originalname,
        error: r.reason?.message || 'Processing failed',
      };
    }
  });

  return res.json({
    total: files.length,
    successful: processed.filter((p) => p.success).length,
    results: processed,
  });
});

// POST /api/v1/receipts (save confirmed receipt)
router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = receiptSaveSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues?.[0]?.message || 'Validation failed' });
    }

    const data = parse.data;
    const newReceipt = await ReceiptRepository.create({
      ...data,
      userId: req.user!.id,
      status: 'confirmed',
    });

    return res.status(201).json({
      message: 'Receipt saved successfully',
      receipt: newReceipt,
    });
  } catch (err: any) {
    console.error('Error saving receipt:', err);
    return res.status(500).json({ error: 'Failed to save receipt' });
  }
});

// GET /api/v1/receipts (list with search, filters, pagination, sort)
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, category, merchant, search, sort, page, limit } = req.query;

    const data = await ReceiptRepository.find({
      userId: req.user!.id,
      from: from as string,
      to: to as string,
      category: category as string,
      merchant: merchant as string,
      search: search as string,
      sort: sort as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 15,
    });

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching receipts:', err);
    return res.status(500).json({ error: 'Failed to retrieve receipts' });
  }
});

// GET /api/v1/receipts/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const receipt = await ReceiptRepository.findById(req.params.id, req.user!.id);
    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }
    return res.json({ receipt });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to get receipt' });
  }
});

// PUT /api/v1/receipts/:id
router.put('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parse = receiptSaveSchema.partial().safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.issues?.[0]?.message || 'Invalid update data' });
    }

    const updated = await ReceiptRepository.update(req.params.id, req.user!.id, parse.data);
    if (!updated) {
      return res.status(404).json({ error: 'Receipt not found or permission denied' });
    }

    return res.json({
      message: 'Receipt updated successfully',
      receipt: updated,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// DELETE /api/v1/receipts/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await ReceiptRepository.delete(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: 'Receipt not found or already deleted' });
    }
    return res.json({ message: 'Receipt deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

export default router;
