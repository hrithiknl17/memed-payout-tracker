import { detectSpike } from '../src/domain/spike';

const config = { minGain: 10_000, viewsPerMinute: 2_000 };
const t0 = new Date('2026-01-01T00:00:00Z');
const minutes = (n: number) => new Date(t0.getTime() + n * 60_000);

describe('detectSpike', () => {
  it('flags a large, fast jump', () => {
    const r = detectSpike({ previousViews: 1_000, previousAt: t0, newViews: 51_000, now: minutes(5), config });
    expect(r.isSpike).toBe(true);
    expect(r.ratePerMinute).toBe(10_000);
  });

  it('does not flag the same gain spread over a day', () => {
    const r = detectSpike({ previousViews: 1_000, previousAt: t0, newViews: 51_000, now: minutes(24 * 60), config });
    expect(r.isSpike).toBe(false);
  });

  it('does not flag a fast but small gain', () => {
    const r = detectSpike({ previousViews: 0, previousAt: t0, newViews: 5_000, now: minutes(0.1), config });
    expect(r.isSpike).toBe(false);
  });

  it('ignores drops in views', () => {
    expect(detectSpike({ previousViews: 50_000, previousAt: t0, newViews: 1_000, now: minutes(1), config }).isSpike).toBe(false);
  });

  it('handles two updates at the same instant without dividing by zero', () => {
    const r = detectSpike({ previousViews: 0, previousAt: t0, newViews: 20_000, now: t0, config });
    expect(Number.isFinite(r.ratePerMinute)).toBe(true);
    expect(r.isSpike).toBe(true);
  });
});
