import { Schema, model, type InferSchemaType } from 'mongoose';

/**
 * Append-only ledger: one row per credit made to a submission. Gives an audit
 * trail ("why was this creator paid ₹1,500 at 3pm?") and powers the wallet
 * history and brand analytics.
 *
 * `Submission.paidAmount` stays the source of truth for balances. The entry is
 * written straight after the credit succeeds; a crash in between would leave
 * one credit unlogged, which a reconciliation job can detect by comparing
 * sum(entries.amount) per submission with paidAmount.
 */
const payoutEntrySchema = new Schema(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
    creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Rupees credited by this entry. */
    amount: { type: Number, required: true, min: 1 },
    /** Peak views the payout was based on. */
    views: { type: Number, required: true, min: 0 },
    /** Threshold of the highest milestone reached (0 if none). */
    milestoneViews: { type: Number, required: true, min: 0 },
    /** What the ladder entitles the post to in total at this point. */
    entitled: { type: Number, required: true, min: 0 },
    /** Total credited to the submission after this entry. */
    totalPaid: { type: Number, required: true, min: 0 },
    /** True when the budget cut this payout short. */
    cappedByBudget: { type: Boolean, required: true },
    /** What caused the payout: a view update, or a brand approving a held spike. */
    reason: { type: String, enum: ['views', 'review-approved'], required: true },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { versionKey: false },
);

payoutEntrySchema.index({ creatorId: 1, createdAt: -1 });
payoutEntrySchema.index({ campaignId: 1, createdAt: 1 });

export type PayoutEntry = InferSchemaType<typeof payoutEntrySchema>;
export const PayoutEntryModel = model('PayoutEntry', payoutEntrySchema);
