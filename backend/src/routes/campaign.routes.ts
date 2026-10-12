import { Router } from 'express';
import { authOf, requireAuth, requireRole } from '../middleware/auth';
import { parse } from '../middleware/validate';
import { createCampaign, listBrandCampaigns, listLiveCampaigns } from '../services/campaignService';
import { listCampaignSubmissions } from '../services/submissionService';
import { createCampaignSchema } from './schemas';

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

/** Brand: create a campaign. */
campaignRouter.post('/', requireRole('brand'), async (req, res) => {
  const input = parse(createCampaignSchema, req.body);
  res.status(201).json({ campaign: await createCampaign(authOf(req).userId, input) });
});

/** Brand: own campaigns with budget spent vs remaining. */
campaignRouter.get('/mine', requireRole('brand'), async (req, res) => {
  res.json({ campaigns: await listBrandCampaigns(authOf(req).userId) });
});

/** Creator (or anyone logged in): campaigns that still have budget. */
campaignRouter.get('/live', async (_req, res) => {
  res.json({ campaigns: await listLiveCampaigns() });
});

/** Brand: submissions on one of their campaigns. */
campaignRouter.get('/:id/submissions', requireRole('brand'), async (req, res) => {
  res.json({ submissions: await listCampaignSubmissions(String(req.params.id), authOf(req).userId) });
});
