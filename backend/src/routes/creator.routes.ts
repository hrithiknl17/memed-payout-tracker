import { Router } from 'express';
import { authOf, requireAuth, requireRole } from '../middleware/auth';
import { getLeaderboard } from '../services/leaderboardService';
import { getCreatorEarnings } from '../services/submissionService';

export const creatorRouter = Router();

/** Creator: total earnings (paid) and anything earned but unpaid due to budget. */
creatorRouter.get('/me/earnings', requireAuth, requireRole('creator'), async (req, res) => {
  res.json(await getCreatorEarnings(authOf(req).userId));
});

/** Anyone logged in: creators ranked by real payouts, plus total disbursed platform-wide. */
creatorRouter.get('/leaderboard', requireAuth, async (req, res) => {
  res.json(await getLeaderboard(authOf(req).userId));
});
