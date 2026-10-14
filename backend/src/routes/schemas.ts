import { z } from 'zod';
import { PLATFORMS } from '../models/Campaign';
import { ROLES } from '../models/User';

const rupees = z.number({ invalid_type_error: 'Must be a number' }).int('Must be whole rupees').positive();

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(ROLES),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

/** Presentation fields a brand can set on create and change later. */
const objective = z.string().trim().max(1000, 'Objective is too long');
const thumbnailUrl = z
  .string()
  .trim()
  .url('Thumbnail must be a full image link')
  .refine((u) => u.startsWith('https://'), 'Thumbnail link must use https');
const endsAt = z
  .string()
  .datetime({ offset: true, message: 'Deadline must be an ISO date' })
  .refine((d) => new Date(d).getTime() > Date.now(), 'Deadline must be in the future');

export const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').max(120),
  platform: z.enum(PLATFORMS),
  budget: rupees.max(100_000_000, 'Budget is unrealistically large'),
  milestones: z
    .array(
      z.object({
        views: z.number().int('Views must be a whole number').positive(),
        payout: rupees,
      }),
    )
    .min(1, 'Add at least one milestone')
    .max(20, 'At most 20 milestones'),
  objective: objective.optional(),
  thumbnailUrl: thumbnailUrl.optional(),
  endsAt: endsAt.optional(),
});

/**
 * Brands can edit how a campaign is presented, not its money: budget and the
 * milestone ladder stay fixed because creators may already have posted against
 * them. Empty string clears objective/thumbnail; `endsAt: null` removes the deadline.
 */
export const updateCampaignSchema = z
  .object({
    name: z.string().trim().min(1, 'Campaign name is required').max(120).optional(),
    objective: objective.optional(),
    thumbnailUrl: thumbnailUrl.or(z.literal('')).optional(),
    endsAt: endsAt.or(z.null()).optional(),
  })
  .strict('Only name, objective, thumbnailUrl and endsAt can be edited');

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100).optional(),
    socials: z
      .array(
        z.object({
          platform: z.enum(PLATFORMS),
          handle: z
            .string()
            .trim()
            .transform((h) => h.replace(/^@/, ''))
            .pipe(z.string().min(1, 'Handle is required').max(60)),
        }),
      )
      .max(5, 'At most 5 social accounts')
      .optional(),
  })
  .strict();

export const createSubmissionSchema = z.object({
  campaignId: z.string().min(1),
  postUrl: z.string().trim().url('Enter a full link, e.g. https://www.instagram.com/reel/...'),
});

export const updateViewsSchema = z.object({
  views: z
    .number({ invalid_type_error: 'views must be a number' })
    .int('views must be a whole number')
    .min(0, 'views cannot be negative')
    .max(1e12),
});
