import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.ts';
import { ReceiptRepository } from '../db/repository.ts';

const router = Router();

router.use(requireAuth);

// GET /api/v1/dashboard/summary?from=&to=
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to } = req.query;
    const summary = await ReceiptRepository.getDashboardSummary(
      req.user!.id,
      from as string,
      to as string
    );
    return res.json(summary);
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

export default router;
