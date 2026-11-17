import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { ReceiptRepository } from '../db/repository.ts';
import { flattenReceiptsToRows, generateCsv, generateXlsxBuffer } from '../services/export.ts';

const router = Router();

router.use(requireAuth);

// GET /api/v1/export/csv
router.get('/csv', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, category } = req.query;
    const receipts = await ReceiptRepository.getAllForExport(
      req.user!.id,
      from as string,
      to as string,
      category as string
    );

    const rows = flattenReceiptsToRows(receipts as any);
    const csvContent = generateCsv(rows);

    const filename = `receipts_export_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Error generating CSV export:', err);
    return res.status(500).json({ error: 'Failed to generate CSV export' });
  }
});

// GET /api/v1/export/xlsx
router.get('/xlsx', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, category } = req.query;
    const receipts = await ReceiptRepository.getAllForExport(
      req.user!.id,
      from as string,
      to as string,
      category as string
    );

    const rows = flattenReceiptsToRows(receipts as any);
    const buffer = generateXlsxBuffer(rows);

    const filename = `receipts_export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (err: any) {
    console.error('Error generating XLSX export:', err);
    return res.status(500).json({ error: 'Failed to generate XLSX export' });
  }
});

// GET /api/v1/export/data
router.get('/data', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, category } = req.query;
    const receipts = await ReceiptRepository.getAllForExport(
      req.user!.id,
      from as string,
      to as string,
      category as string
    );
    const rows = flattenReceiptsToRows(receipts as any);
    return res.json({ rows, totalCount: receipts.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve export data' });
  }
});

export default router;
