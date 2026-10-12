import { Schema, model, type InferSchemaType, type HydratedDocument } from 'mongoose';

export const PLATFORMS = ['instagram', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

const milestoneSchema = new Schema(
  {
    views: { type: Number, required: true, min: 1 },
    payout: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const campaignSchema = new Schema(
  {
    brandId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    platform: { type: String, enum: PLATFORMS, required: true },
    /** Total budget in whole rupees. */
    budget: { type: Number, required: true, min: 1 },
    /**
     * Rupees reserved/paid out so far. Only ever changed with atomic `$inc`
     * guarded by `spent + amount <= budget` — see MongoSettlementStore.
     */
    spent: { type: Number, required: true, default: 0, min: 0 },
    /** Stored sorted by `views` ascending. */
    milestones: { type: [milestoneSchema], required: true },
  },
  { timestamps: true },
);

// "Live" campaigns are listed newest-first; this index serves that query.
campaignSchema.index({ createdAt: -1 });

export type Campaign = InferSchemaType<typeof campaignSchema>;
export type CampaignDoc = HydratedDocument<Campaign>;
export const CampaignModel = model('Campaign', campaignSchema);
