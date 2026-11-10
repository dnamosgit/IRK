# Immigration Review Korea

[![CI](https://github.com/dnamosgit/IRK/actions/workflows/ci.yml/badge.svg)](https://github.com/dnamosgit/IRK/actions/workflows/ci.yml)

**Know Before You Go.** An independent, multilingual (EN · ES · 한국어) platform where people discover immigration offices across South Korea, read moderated anonymous visitor experiences, submit structured reviews, and privately verify their visits.

> Immigration Review Korea is an independent informational platform and is not affiliated with the Korean government.

This is a working full-stack application (Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL), not a mock-up. Every page, form and admin action listed below is wired to the database and covered by unit, database-permission or end-to-end tests.

---

## Status at a glance

| Area | Status |
|---|---|
| Homepage, directory (search / filters / sort / list + map), office profiles, reviews, guides, about, resources, legal pages | ✅ Operational |
| EN / ES / KO across the whole interface incl. admin; localized URLs (`/es/oficinas/...`); language switch keeps page + query; hreflang | ✅ Operational |
| Email + password accounts, random pseudonyms, email confirmation, password reset, account deletion (keep or delete reviews) | ✅ Operational |
| 7-step review wizard, live screening hints, controlled editing (edits return to moderation) | ✅ Operational |
| Bayesian rating engine (hidden below 10 eligible reviews, raw mean disclosed) | ✅ Operational |
| Helpful votes, reporting, appeals, complaints / takedown / right-of-reply requests | ✅ Operational |
| Private visit verification: metadata stripped, AES-256-GCM encrypted, audited access, retention purge | ✅ Operational (local encrypted storage or Supabase Storage) |
| Moderation dashboard with RBAC (4 roles), redaction, legal escalation, audit log, analytics | ✅ Operational |
| Machine translation of reviews | ⚙️ Provider-independent; **needs DeepL or Google credentials**. Default `none` shows originals only. `mock` exists for development and is refused in production. |
| Email delivery | ⚙️ **Needs Resend credentials** in production. Development writes to a private outbox at `/{locale}/dev/outbox`. |
| Kakao Maps | ⚙️ Optional (`NEXT_PUBLIC_KAKAO_MAP_KEY`). Without it Leaflet + OpenStreetMap is used. |
| Office directory data | ⚠️ **15 offices seeded as UNVERIFIED.** The build environment could not reach official sites, so only names are seeded; addresses, phones, hours and services are blank and the UI says "Information not yet verified". Coordinates are approximate city centres and labelled as such. See [docs/DATA_VERIFICATION.md](docs/DATA_VERIFICATION.md). |
| Hero photography | ⚠️ No licensed photos could be sourced; an original SVG illustration is used. Slot for licensed photography: `src/lib/media.ts`. |
| Legal texts (privacy, terms, guidelines, moderation policy), evidence retention period (30 days), legal-request deadline (14 days) | ⏳ **Drafts — pending legal review.** ES/KO legal texts are draft translations pending professional review and are labelled as such. |

Nothing fabricated is presented as real: fictional sample reviews exist only in development (`SAMPLE_DATA=true`), are badged "Fictional sample", are excluded from statistics and analytics, and are never shown by a production build.

---

## Quick start (local)

Requirements: Node 20+ (22 recommended), PostgreSQL 15+ (16 used in development).

```bash
git clone https://github.com/dnamosgit/IRK.git
cd IRK
npm install
```

Create the database and the three roles (owner / app writer / public reader) as a Postgres superuser:

```bash
sudo -u postgres psql -f db/setup-local.sql
```

```bash
cp .env.example .env.local
```

Generate secrets for `APP_SECRET` and `EVIDENCE_ENCRYPTION_KEY` and paste them into `.env.local`:

```bash
openssl rand -base64 32
```

Migrate and seed (offices, official resources and fictional samples when `SAMPLE_DATA=true`):

```bash
npm run db:reset
```

```bash
npm run dev
```

Open http://localhost:3000, create an account, then open the confirmation link from the dev outbox (http://localhost:3000/en/dev/outbox). Make yourself an administrator:

```bash
npm run admin:grant -- you@example.com super_admin
```

Then visit http://localhost:3000/admin.

### Tests

Unit tests (rating engine, screening, i18n completeness, routing, crypto, RBAC):

```bash
npm test
```

Database permission tests (needs a migrated, seeded DB):

```bash
npm run test:db
```

End-to-end tests (needs a running dev server):

```bash
npm run test:e2e
```

Typecheck:

```bash
npm run typecheck
```

---

## Architecture

```
src/
  app/[locale]/...        public site (SSR), one root layout per locale
  app/admin/...           separate root layout, role-gated, noindex
  app/api/...             search, helpful votes, audited evidence download, cron purge, health
  proxy.ts                locale detection + localized URL rewrites + admin cookie gate
  lib/
    db.ts                 two pools: appDb (irk_app writer) + readerDb (irk_reader, RLS)
    i18n/                 dictionaries (en is the source, es/ko type-checked against it), paths, formatting
    rating.ts             pure Bayesian rating engine
    screening.ts          pure pre-publication screening (flags only; never decides truth)
    abuse.ts              duplicate / spike / burst / shared-network / signup-cluster signals
    actions/              server actions (auth, reviews, verification, account, requests, admin)
    translation/          provider interface (none / deepl / google / mock-dev) + pipeline
    storage/              AES-256-GCM envelope + local or Supabase private storage
    evidence.ts           evidence deletion + retention purge (deliberately NOT server actions)
db/migrations/            SQL schema, roles, grants, RLS policies
db/seed/                  office list (unverified) + fictional samples
e2e/                      Playwright acceptance flow
tests/                    vitest unit + db permission tests
```

Key decisions:

- **Database least privilege.** Public pages query as `irk_reader`, which has **no access to the `private` schema**. Row Level Security limits it to active offices, approved reviews and approved translations. Column grants hide `reviews.user_id`, hashes and moderation fields. Author pseudonyms are resolved through a security-definer function. Writes go through `irk_app`, which cannot update or delete audit logs. All of this is enforced in `tests/db/permissions.test.ts`.
- **Private vs public data.** Accounts, sessions, verification evidence, moderation cases, reports, appeals, legal requests and audit logs live in the `private` schema.
- **Server-only privileged code.** No database or storage credentials reach the browser. Admin pages, admin actions and the evidence route re-check roles server-side; the proxy only does an optimistic cookie check.
- **No third-party trackers.** No analytics or ads scripts are loaded, and a strict CSP is set.

Detailed docs:

- [Deployment & production setup](docs/DEPLOYMENT.md)
- [Rating methodology](docs/RATING_METHODOLOGY.md)
- [Office data verification procedure](docs/DATA_VERIFICATION.md)
- [Security, privacy & moderation design](docs/SECURITY_PRIVACY.md)
