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
});

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
