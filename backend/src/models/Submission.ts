import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const REVIEW_STATES = ['none', 'pending', 'approved', 'rejected'] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];
/** Review states in which no money is paid out. */
export const HELD_REVIEW_STATES: readonly ReviewState[] = ['pending', 'rejected'];

const submissionSchema = new Schema(
  {
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postUrl: { type: String, required: true, trim: true },
    /** Latest view count reported by the platform (simulated via PATCH). */
    views: { type: Number, required: true, default: 0, min: 0 },
    viewsUpdatedAt: { type: Date, required: true, default: () => new Date() },
    /**
     * Highest view count ever reported. Payouts are based on this, so a
     * milestone once crossed stays crossed even if the platform later reports
     * fewer views (e.g. after removing bot views).
     */
    peakViews: { type: Number, required: true, default: 0, min: 0 },
    /** Highest milestone payout this post has reached. */
    entitledAmount: { type: Number, required: true, default: 0, min: 0 },
    /**
     * Rupees actually credited. Only ever changed by a compare-and-set
     * (`paidAmount === expected`) so it can't be double-incremented.
     */
    paidAmount: { type: Number, required: true, default: 0, min: 0 },
    /** True when the campaign budget ran out before paying everything earned. */
    cappedByBudget: { type: Boolean, required: true, default: false },
    /** Set when views jump unusually fast (see domain/spike.ts). */
    flagged: { type: Boolean, required: true, default: false },
    flagReason: { type: String },
    /**
     * Brand review of a view spike. `pending` and `rejected` hold all payouts
     * (see HELD_REVIEW_STATES); `approved` releases them.
     */
    review: { type: String, enum: REVIEW_STATES, required: true, default: 'none' },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
);

// The same post can't be submitted to the same campaign twice.
submissionSchema.index({ campaignId: 1, postUrl: 1 }, { unique: true });
// Lets us check whether a post already belongs to another creator.
submissionSchema.index({ postUrl: 1 });

export type Submission = InferSchemaType<typeof submissionSchema>;
export type SubmissionDoc = HydratedDocument<Submission>;
export const SubmissionModel = model('Submission', submissionSchema);
