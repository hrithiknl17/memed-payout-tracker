import {
  decidePayout,
  entitledPayout,
  normaliseLadder,
  validateLadder,
  type Milestone,
} from '../src/domain/payout';

// The ladder from the brief.
const ladder: Milestone[] = [
  { views: 10_000, payout: 500 },
  { views: 50_000, payout: 2_000 },
  { views: 100_000, payout: 5_000 },
];

describe('entitledPayout — highest milestone crossed', () => {
  it.each([
    [0, 0],
    [9_999, 0],
    [10_000, 500], // threshold is inclusive
    [49_999, 500],
    [50_000, 2_000],
    [99_999, 2_000],
    [100_000, 5_000],
    [10_000_000, 5_000], // beyond the top milestone still pays the top amount
  ])('%i views → ₹%i', (views, expected) => {
    expect(entitledPayout(ladder, views)).toBe(expected);
  });

  it('is not cumulative: crossing 10K then 50K pays ₹2,000 total, not ₹2,500', () => {
    expect(entitledPayout(ladder, 60_000)).toBe(2_000);
  });

  it('does not depend on the order milestones are stored in', () => {
    const shuffled = [ladder[2]!, ladder[0]!, ladder[1]!];
    expect(entitledPayout(shuffled, 75_000)).toBe(2_000);
  });

  it('pays nothing for an empty ladder', () => {
    expect(entitledPayout([], 1_000_000)).toBe(0);
  });
});

describe('decidePayout — incremental payouts', () => {
  const plenty = 1_000_000;

  it('crossing two milestones in one update pays the higher milestone once', () => {
    const d = decidePayout({ milestones: ladder, views: 55_000, alreadyPaid: 0, remainingBudget: plenty });
    expect(d).toEqual({ entitled: 2_000, owed: 2_000, grant: 2_000, cappedByBudget: false });
  });

  it('only pays the difference when moving up the ladder', () => {
    const d = decidePayout({ milestones: ladder, views: 120_000, alreadyPaid: 2_000, remainingBudget: plenty });
    expect(d.grant).toBe(3_000);
  });

  it('repeating the same update pays nothing the second time (idempotent)', () => {
    const d = decidePayout({ milestones: ladder, views: 55_000, alreadyPaid: 2_000, remainingBudget: plenty });
    expect(d.grant).toBe(0);
    expect(d.owed).toBe(0);
  });

  it('never claws back money when views drop', () => {
    const d = decidePayout({ milestones: ladder, views: 5_000, alreadyPaid: 2_000, remainingBudget: plenty });
    expect(d).toEqual({ entitled: 0, owed: 0, grant: 0, cappedByBudget: false });
  });
});

describe('decidePayout — budget cap', () => {
  it('pays in full when the budget covers it', () => {
    const d = decidePayout({ milestones: ladder, views: 100_000, alreadyPaid: 0, remainingBudget: 5_000 });
    expect(d).toEqual({ entitled: 5_000, owed: 5_000, grant: 5_000, cappedByBudget: false });
  });

  it('pays only what is left when the budget runs out mid-payout', () => {
    const d = decidePayout({ milestones: ladder, views: 100_000, alreadyPaid: 0, remainingBudget: 1_200 });
    expect(d).toEqual({ entitled: 5_000, owed: 5_000, grant: 1_200, cappedByBudget: true });
  });

  it('pays nothing when the budget is already exhausted', () => {
    const d = decidePayout({ milestones: ladder, views: 100_000, alreadyPaid: 500, remainingBudget: 0 });
    expect(d.grant).toBe(0);
    expect(d.cappedByBudget).toBe(true);
  });

  it('treats a negative remaining budget as zero (defensive)', () => {
    const d = decidePayout({ milestones: ladder, views: 100_000, alreadyPaid: 0, remainingBudget: -50 });
    expect(d.grant).toBe(0);
  });

  it('a capped submission picks up the rest if budget frees up later', () => {
    const d = decidePayout({ milestones: ladder, views: 100_000, alreadyPaid: 1_200, remainingBudget: 10_000 });
    expect(d.grant).toBe(3_800);
    expect(d.cappedByBudget).toBe(false);
  });
});

describe('validateLadder', () => {
  it('accepts the example ladder', () => {
    expect(validateLadder(ladder, 50_000)).toEqual([]);
  });

  it('rejects an empty ladder', () => {
    expect(validateLadder([], 1_000)).toContain('At least one milestone is required');
  });

  it('rejects duplicate thresholds and non-increasing payouts', () => {
    const errors = validateLadder(
      [
        { views: 10_000, payout: 500 },
        { views: 10_000, payout: 400 },
      ],
      10_000,
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        'Duplicate view threshold 10000',
        'Payouts must increase as view thresholds increase',
      ]),
    );
  });

  it('rejects a milestone that could never be paid in full by the budget', () => {
    expect(validateLadder([{ views: 1_000, payout: 2_000 }], 1_000)[0]).toMatch(/exceeds the campaign budget/);
  });

  it('rejects fractional rupees and non-positive values', () => {
    expect(validateLadder([{ views: 0, payout: 10.5 }], 1_000).length).toBe(2);
  });

  it('normaliseLadder sorts by view threshold', () => {
    expect(normaliseLadder([ladder[1]!, ladder[0]!]).map((m) => m.views)).toEqual([10_000, 50_000]);
  });
});
