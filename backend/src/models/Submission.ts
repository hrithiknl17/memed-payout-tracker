import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

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
  },
  { timestamps: true },
);

// The same post can't be submitted to the same campaign twice.
submissionSchema.index({ campaignId: 1, postUrl: 1 }, { unique: true });

export type Submission = InferSchemaType<typeof submissionSchema>;
export type SubmissionDoc = HydratedDocument<Submission>;
export const SubmissionModel = model('Submission', submissionSchema);
