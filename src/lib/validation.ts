import { z } from 'zod';
import { BODY_MAX, BODY_MIN, RATING_DIMENSIONS, SERVICE_CATEGORIES } from './config';

export { BODY_MAX, BODY_MIN };

/** 'YYYY-MM' within the last 24 months and not in the future. */
export function isValidVisitMonth(value: string, now = new Date()): boolean {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  if (!m) return false;
  const months = (now.getUTCFullYear() - Number(m[1])) * 12 + (now.getUTCMonth() + 1 - Number(m[2]));
  return months >= 0 && months <= 24;
}

const score = z.coerce.number().int().min(1).max(5);

export const reviewSchema = z.object({
  officeId: z.string().uuid(),
  service: z.enum(SERVICE_CATEGORIES),
  visitMonth: z.string().refine((v) => isValidVisitMonth(v)),
  usedAppointment: z.enum(['yes', 'no', 'unsure']),
  receivedService: z.enum(['yes', 'partially', 'no', 'unsure']),
  language: z.enum(['en', 'es', 'ko']),
  title: z.string().trim().max(120).optional().transform((v) => (v ? v : null)),
  body: z.string().trim().min(BODY_MIN).max(BODY_MAX),
  ratings: z.object(Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, score])) as Record<(typeof RATING_DIMENSIONS)[number], typeof score>),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

export function reviewInputFromForm(fd: FormData) {
  return {
    officeId: fd.get('officeId'),
    service: fd.get('service'),
    visitMonth: fd.get('visitMonth'),
    usedAppointment: fd.get('usedAppointment'),
    receivedService: fd.get('receivedService'),
    language: fd.get('language'),
    title: fd.get('title') ?? undefined,
    body: fd.get('body'),
    ratings: Object.fromEntries(RATING_DIMENSIONS.map((d) => [d, fd.get(`rating_${d}`)])),
  };
}

/** Normalised text hash input (whitespace/case-insensitive) for duplicate detection. */
export function normaliseForHash(text: string): string {
  return text.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}
