// Rating engine — pure functions, no I/O. See docs/RATING_METHODOLOGY.md.
//
//   R = (v / (v + m)) × C + (m / (v + m)) × G
//
//   v = eligible review count for the office
//   m = confidence threshold (configurable, RATING_CONFIDENCE_M)
//   C = the office's average review score
//   G = platform-wide average review score
//
// A review's score is the unweighted mean of its five dimension scores.
// Verified reviews carry exactly the same weight as unverified ones.

import { RATING_DIMENSIONS, type RatingDimension } from './config';

export type DimensionScores = Record<RatingDimension, number>;

export function reviewScore(scores: DimensionScores): number {
  const values = RATING_DIMENSIONS.map((d) => scores[d]);
  for (const v of values) {
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new RangeError(`Invalid dimension score: ${v}`);
  }
  return round2(values.reduce((a, b) => a + b, 0) / values.length);
}

export function bayesianAverage(v: number, C: number, m: number, G: number): number {
  if (v < 0 || m < 0) throw new RangeError('v and m must be non-negative');
  if (v + m === 0) return G;
  return (v / (v + m)) * C + (m / (v + m)) * G;
}

export type OfficeAggregate = {
  count: number;
  verifiedCount: number;
  sumScore: number;
  dimensionSums: DimensionScores;
  /** counts of review scores rounded to the nearest whole star, index 0 = 1 star */
  distribution: [number, number, number, number, number];
  firstVisit: string | null;
  lastVisit: string | null;
};

export type RatingSummary = {
  count: number;
  verifiedCount: number;
  unverifiedCount: number;
  /** simple mean, always disclosed next to the adjusted value */
  rawAverage: number | null;
  /** Bayesian-adjusted overall rating, null below the minimum sample */
  adjusted: number | null;
  categories: DimensionScores | null;
  distribution: [number, number, number, number, number];
  firstVisit: string | null;
  lastVisit: string | null;
  meetsOverallThreshold: boolean;
};

export type RatingOptions = { m: number; minForOverall: number; minForCategories: number };

export function summarize(agg: OfficeAggregate, platformAverage: number | null, opts: RatingOptions): RatingSummary {
  const v = agg.count;
  const raw = v > 0 ? agg.sumScore / v : null;
  const meets = v >= opts.minForOverall && raw !== null;
  const G = platformAverage ?? raw ?? 0;
  const categories =
    v >= opts.minForCategories
      ? (Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, round2(agg.dimensionSums[d] / v)])) as DimensionScores)
      : null;
  return {
    count: v,
    verifiedCount: agg.verifiedCount,
    unverifiedCount: v - agg.verifiedCount,
    rawAverage: raw === null ? null : round2(raw),
    adjusted: meets ? round2(bayesianAverage(v, raw!, opts.m, G)) : null,
    categories,
    distribution: agg.distribution,
    firstVisit: agg.firstVisit,
    lastVisit: agg.lastVisit,
    meetsOverallThreshold: meets,
  };
}

/** Bucket a review score (1.0–5.0) into a whole star for the distribution chart. */
export function starBucket(score: number): 1 | 2 | 3 | 4 | 5 {
  const b = Math.min(5, Math.max(1, Math.floor(score + 0.5)));
  return b as 1 | 2 | 3 | 4 | 5;
}

export function emptyAggregate(): OfficeAggregate {
  return {
    count: 0,
    verifiedCount: 0,
    sumScore: 0,
    dimensionSums: { professionalism: 0, communication: 0, waiting: 0, appointment_process: 0, accessibility: 0 },
    distribution: [0, 0, 0, 0, 0],
    firstVisit: null,
    lastVisit: null,
  };
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
