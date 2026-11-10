// Central, typed runtime configuration. Server-only values must never be
// imported into client components (see `server-only` guards where used).

function int(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const isProduction = process.env.NODE_ENV === 'production';

export const config = {
  isProduction,
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
  rating: {
    /** m in the Bayesian formula: how many "virtual" platform-average reviews each office starts with */
    confidenceThreshold: int(process.env.RATING_CONFIDENCE_M, 10),
    /** overall (Bayesian) rating is hidden below this many eligible reviews */
    minReviewsForOverall: int(process.env.RATING_MIN_REVIEWS_OVERALL, 10),
    /** category averages are hidden below this many eligible reviews */
    minReviewsForCategories: 3,
  },
  verification: {
    retentionDays: int(process.env.VERIFICATION_RETENTION_DAYS, 30),
    maxFileBytes: 8 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
  },
  session: {
    cookieName: 'irk_session',
    maxAgeDays: 30,
  },
  /** Fictional sample reviews are never shown by a production build. */
  sampleMode: process.env.SAMPLE_DATA === 'true' && !isProduction,
} as const;

export const RATING_DIMENSIONS = [
  'professionalism',
  'communication',
  'waiting',
  'appointment_process',
  'accessibility',
] as const;
export type RatingDimension = (typeof RATING_DIMENSIONS)[number];

export const SERVICE_CATEGORIES = [
  'visa_application',
  'residence_extension',
  'status_change',
  'residence_card',
  'document_submission',
  'nationality',
  'other',
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const OFFICE_TYPES = ['immigration_office', 'branch_office', 'airport_facility', 'other_facility'] as const;
export type OfficeType = (typeof OFFICE_TYPES)[number];

export const REVIEW_STATUSES = [
  'pending',
  'approved',
  'needs_clarification',
  'legal_review',
  'rejected',
  'hidden',
  'removed',
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REPORT_REASONS = [
  'personal_info',
  'harassment',
  'threats',
  'defamation',
  'misleading',
  'spam',
  'irrelevant',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REGIONS = [
  'seoul',
  'incheon',
  'gyeonggi',
  'gangwon',
  'chungbuk',
  'chungnam',
  'daejeon',
  'jeonbuk',
  'jeonnam',
  'gwangju',
  'gyeongbuk',
  'daegu',
  'gyeongnam',
  'busan',
  'ulsan',
  'jeju',
] as const;
export type Region = (typeof REGIONS)[number];

export const BODY_MIN = 50;
export const BODY_MAX = 5000;
