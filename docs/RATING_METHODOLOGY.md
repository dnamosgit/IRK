# Rating methodology

Implementation: `src/lib/rating.ts` (pure, unit-tested in `tests/rating.test.ts`) and `getOfficeRating` / `listOffices` in `src/lib/queries/offices.ts`.

## Inputs

Each review rates five dimensions on an integer 1–5 scale:

1. Staff professionalism and courtesy
2. Communication clarity
3. Waiting experience
4. Appointment and administrative process
5. Accessibility and assistance

A review's **score** is the unweighted mean of its five dimensions.

## Eligible reviews

- Status `approved` (published) only.
- Fictional sample reviews are excluded, except in development sample mode, where they are labelled.
- **Duplicates are blocked at the database level.** One review per person, office, service and visit month is enforced by a partial unique index.
- **Abuse signals do not change the score.** They raise moderation priority, and a moderator decides whether to publish.

## Overall rating (Bayesian)

```
R = (v / (v + m)) × C + (m / (v + m)) × G
```

| Symbol | Meaning |
|---|---|
| v | eligible review count for the office |
| m | confidence threshold, `RATING_CONFIDENCE_M` (default 10) |
| C | the office's mean review score |
| G | platform-wide mean review score over all eligible reviews |

- The overall rating is **hidden** until `v ≥ RATING_MIN_REVIEWS_OVERALL` (default 10). Until then the UI shows the actual count and how many more are needed.
- When shown, it is labelled "Bayesian-adjusted", and the **simple average and review count are always shown next to it**.
- **Verified reviews carry the same weight as unverified ones.** Verification is shown as a separate count.
- Directory sorting by rating ranks only offices that meet the threshold; the rest follow alphabetically, with a note in the UI.

## Category averages and distribution

- Category averages are plain means per dimension, shown from 3 eligible reviews.
- The distribution buckets each review score to the nearest whole star (half rounds up).
- The visit-month range and the verified/unverified split are shown.

## Auditability

Every input to the rating is stored: the per-dimension ratings, the review status history (`private.moderation_actions`) and the revisions (`private.review_revisions`). A rating can therefore be recomputed for any point in time. Changing `m` or the thresholds is a configuration change and should be announced on the methodology page.
