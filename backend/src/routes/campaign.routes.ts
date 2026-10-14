import { Router } from 'express';
import { authOf, requireAuth, requireRole } from '../middleware/auth';
import { parse } from '../middleware/validate';
import {
  createCampaign,
  listBrandCampaigns,
  listEndedCampaigns,
  listLiveCampaigns,
  updateCampaign,
} from '../services/campaignService';
import { listCampaignSubmissions } from '../services/submissionService';
import { createCampaignSchema, updateCampaignSchema } from './schemas';

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

/** Anyone logged in: campaigns creators can still join (budget left, not past deadline). */
campaignRouter.get('/live', async (_req, res) => {
  res.json({ campaigns: await listLiveCampaigns() });
});

/** Anyone logged in: recently ended campaigns (budget used up or deadline passed). */
campaignRouter.get('/ended', async (_req, res) => {
  res.json({ campaigns: await listEndedCampaigns() });
});

/** Brand: edit name, objective, thumbnail or deadline. Budget and milestones are fixed. */
campaignRouter.patch('/:id', requireRole('brand'), async (req, res) => {
  const input = parse(updateCampaignSchema, req.body);
  res.json({ campaign: await updateCampaign(authOf(req).userId, String(req.params.id), input) });
});

/** Brand: submissions on one of their campaigns. */
campaignRouter.get('/:id/submissions', requireRole('brand'), async (req, res) => {
  res.json({ submissions: await listCampaignSubmissions(String(req.params.id), authOf(req).userId) });
});
