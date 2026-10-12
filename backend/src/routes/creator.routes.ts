import { Router } from 'express';
import { authOf, requireAuth, requireRole } from '../middleware/auth';
import { getCreatorEarnings } from '../services/submissionService';

export const creatorRouter = Router();

/** Creator: total earnings (paid) and anything earned but unpaid due to budget. */
creatorRouter.get('/me/earnings', requireAuth, requireRole('creator'), async (req, res) => {
  res.json(await getCreatorEarnings(authOf(req).userId));
});
