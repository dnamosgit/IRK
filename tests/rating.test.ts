import { describe, expect, it } from 'vitest';
import { bayesianAverage, emptyAggregate, reviewScore, starBucket, summarize, type OfficeAggregate } from '@/lib/rating';

const opts = { m: 10, minForOverall: 10, minForCategories: 3 };

function aggregateOf(reviews: { scores: [number, number, number, number, number]; verified?: boolean }[]): OfficeAggregate {
  const agg = emptyAggregate();
  for (const r of reviews) {
    const [p, c, w, a, x] = r.scores;
    const s = reviewScore({ professionalism: p, communication: c, waiting: w, appointment_process: a, accessibility: x });
    agg.count++;
    agg.sumScore += s;
    if (r.verified) agg.verifiedCount++;
    agg.dimensionSums.professionalism += p;
    agg.dimensionSums.communication += c;
    agg.dimensionSums.waiting += w;
    agg.dimensionSums.appointment_process += a;
    agg.dimensionSums.accessibility += x;
    agg.distribution[starBucket(s) - 1]++;
  }
  return agg;
}

describe('reviewScore', () => {
  it('is the unweighted mean of the five dimensions', () => {
    expect(reviewScore({ professionalism: 5, communication: 4, waiting: 3, appointment_process: 4, accessibility: 4 })).toBe(4);
  });
  it('rejects out-of-range scores', () => {
    expect(() => reviewScore({ professionalism: 6, communication: 4, waiting: 3, appointment_process: 4, accessibility: 4 })).toThrow();
    expect(() => reviewScore({ professionalism: 0, communication: 4, waiting: 3, appointment_process: 4, accessibility: 4 })).toThrow();
    expect(() => reviewScore({ professionalism: 2.5, communication: 4, waiting: 3, appointment_process: 4, accessibility: 4 })).toThrow();
  });
});

describe('bayesianAverage', () => {
  it('implements R = v/(v+m)·C + m/(v+m)·G', () => {
    expect(bayesianAverage(10, 5, 10, 3)).toBe(4);
    expect(bayesianAverage(30, 4, 10, 3)).toBeCloseTo(3.75, 10);
  });
  it('approaches C as v grows and G when v is 0', () => {
    expect(bayesianAverage(0, 5, 10, 3)).toBe(3);
    expect(bayesianAverage(100000, 5, 10, 3)).toBeCloseTo(5, 3);
  });
});

describe('summarize', () => {
  it('hides the overall rating below the minimum sample but discloses the count', () => {
    const agg = aggregateOf(Array.from({ length: 9 }, () => ({ scores: [5, 5, 5, 5, 5] as [number, number, number, number, number] })));
    const s = summarize(agg, 3.5, opts);
    expect(s.adjusted).toBeNull();
    expect(s.meetsOverallThreshold).toBe(false);
    expect(s.count).toBe(9);
    expect(s.categories).not.toBeNull();
  });

  it('shows a Bayesian-adjusted rating at 10 reviews, distinct from the raw mean', () => {
    const agg = aggregateOf(Array.from({ length: 10 }, () => ({ scores: [5, 5, 5, 5, 5] as [number, number, number, number, number] })));
    const s = summarize(agg, 3, opts);
    expect(s.rawAverage).toBe(5);
    expect(s.adjusted).toBe(4); // (10/20)*5 + (10/20)*3
  });

  it('gives verified reviews no extra weight', () => {
    const base = Array.from({ length: 10 }, (_, i) => ({ scores: [i % 2 ? 5 : 1, 3, 3, 3, 3] as [number, number, number, number, number] }));
    const a = summarize(aggregateOf(base.map((r) => ({ ...r, verified: false }))), 3, opts);
    const b = summarize(aggregateOf(base.map((r, i) => ({ ...r, verified: i % 2 === 1 }))), 3, opts);
    expect(a.adjusted).toBe(b.adjusted);
    expect(b.verifiedCount).toBe(5);
    expect(b.unverifiedCount).toBe(5);
  });

  it('hides categories below their own threshold and builds a distribution', () => {
    const agg = aggregateOf([{ scores: [1, 1, 1, 1, 1] }, { scores: [5, 5, 5, 5, 4] }]);
    const s = summarize(agg, null, opts);
    expect(s.categories).toBeNull();
    expect(s.distribution).toEqual([1, 0, 0, 0, 1]);
  });

  it('handles an office with no reviews', () => {
    const s = summarize(emptyAggregate(), 3.4, opts);
    expect(s.count).toBe(0);
    expect(s.rawAverage).toBeNull();
    expect(s.adjusted).toBeNull();
  });
});

describe('starBucket', () => {
  it('rounds half up and clamps', () => {
    expect(starBucket(4.5)).toBe(5);
    expect(starBucket(4.4)).toBe(4);
    expect(starBucket(1)).toBe(1);
  });
});
