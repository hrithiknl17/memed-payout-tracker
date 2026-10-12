import { Router } from 'express';
import { authOf, requireAuth, requireRole } from '../middleware/auth';
import { parse } from '../middleware/validate';
import {
  createSubmission,
  getCreatorEarnings,
  listCreatorSubmissions,
  updateViews,
} from '../services/submissionService';
import { createSubmissionSchema, updateViewsSchema } from './schemas';

export const submissionRouter = Router();

/**
 * Simulates platform data. Per the brief there is deliberately no auth/role
 * check here — in production this would be an internal job or a signed webhook.
 */
submissionRouter.patch('/:id/views', async (req, res) => {
  const { views } = parse(updateViewsSchema, req.body);
  res.json(await updateViews(String(req.params.id), views));
});

/** Creator: submit a post link to a campaign. */
submissionRouter.post('/', requireAuth, requireRole('creator'), async (req, res) => {
  const input = parse(createSubmissionSchema, req.body);
  res.status(201).json({ submission: await createSubmission(authOf(req).userId, input) });
});

/** Creator: own submissions plus total earnings. */
submissionRouter.get('/mine', requireAuth, requireRole('creator'), async (req, res) => {
  const creatorId = authOf(req).userId;
  const [submissions, earnings] = await Promise.all([
    listCreatorSubmissions(creatorId),
    getCreatorEarnings(creatorId),
  ]);
  res.json({ submissions, earnings });
});
