/**
 * Flags a submission whose views grow unusually fast between two updates.
 *
 * A spike needs BOTH:
 *  - a large absolute gain (so a tiny post going 10 -> 200 isn't flagged), and
 *  - a high rate (views per minute) since the previous reading.
 *
 * Flagging is informational: payouts still go through, and the brand sees the
 * flag on its dashboard. (In production you'd hold flagged payouts for review —
 * see README.)
 */
export interface SpikeConfig {
  minGain: number;
  viewsPerMinute: number;
}

export interface SpikeCheck {
  isSpike: boolean;
  gain: number;
  ratePerMinute: number;
}

export function detectSpike(params: {
  previousViews: number;
  previousAt: Date;
  newViews: number;
  now: Date;
  config: SpikeConfig;
}): SpikeCheck {
  const { previousViews, previousAt, newViews, now, config } = params;
  const gain = newViews - previousViews;
  if (gain <= 0) return { isSpike: false, gain, ratePerMinute: 0 };

  // Floor elapsed time at 1 second so two updates in the same millisecond
  // don't divide by zero.
  const elapsedMinutes = Math.max(now.getTime() - previousAt.getTime(), 1000) / 60_000;
  const ratePerMinute = gain / elapsedMinutes;

  return {
    isSpike: gain >= config.minGain && ratePerMinute >= config.viewsPerMinute,
    gain,
    ratePerMinute: Math.round(ratePerMinute),
  };
}
