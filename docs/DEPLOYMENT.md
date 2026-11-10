# Production deployment

The app is a standard Next.js 16 server application backed by PostgreSQL. It runs on Vercel, AWS (ECS/App Runner), Fly.io or any Node 20+ host. The steps below use **Vercel + Supabase Postgres**, but nothing is Supabase-specific except the optional storage provider.

## 1. Database

1. Create a Postgres 15+ database (for example a Supabase project).
2. As the `postgres` / owner role, create login roles with strong, unique passwords:
   ```sql
   CREATE ROLE irk_app LOGIN PASSWORD '<strong-random>';
   CREATE ROLE irk_reader LOGIN PASSWORD '<strong-random>';
   ```
   On Supabase, connect these roles through the pooler using `role.project-ref` usernames, or run the app on the direct connection string.
3. Run migrations with the owner connection string. The migration creates schemas, RLS policies and grants for `irk_app` / `irk_reader`.
   ```bash
   DATABASE_OWNER_URL=postgres://postgres:...@.../postgres DATABASE_SSL=require npm run db:migrate
   ```
4. Seed offices and resources. `SAMPLE_DATA` must be unset or `false` in production; the seeder refuses sample data when `NODE_ENV=production`.
   ```bash
   NODE_ENV=production DATABASE_OWNER_URL=... npm run db:seed
   ```
5. **Verify the office directory before launch.** See [DATA_VERIFICATION.md](DATA_VERIFICATION.md).
6. Optional hardening: run `npm run test:db` against a staging copy to confirm role permissions.

> If you use Supabase, the app does **not** use the Supabase JS client or the anon key. Do not expose the `public` schema through PostgREST: disable the Data API or remove `public` from the exposed schemas. The app's own RLS policies target `irk_reader` / `irk_app`, not `anon` / `authenticated`.

## 2. Environment variables

The build itself needs no database or secrets: every page is rendered on request. The variables below are needed at **runtime**; on Vercel set them under Project → Settings → Environment Variables and redeploy. Without `DATABASE_URL` the deployment builds but pages return an error.

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://your-domain` — used for canonical URLs, hreflang, sitemap and email links |
| `DATABASE_URL` | ✅ | `irk_app` connection string |
| `DATABASE_READER_URL` | ✅ | `irk_reader` connection string (public pages) |
| `DATABASE_SSL` | ✅ managed DB | `require` |
| `APP_SECRET` | ✅ | ≥ 32 random chars (`openssl rand -base64 32`). Keys the IP hashes. |
| `EVIDENCE_ENCRYPTION_KEY` | ✅ | 32 bytes, base64. **Back it up in a secrets manager; losing it makes stored evidence unreadable.** Without it, verification uploads are disabled (the UI says so). |
| `STORAGE_PROVIDER` | ✅ | `supabase` on serverless hosts (local disk is ephemeral). `local` only with a persistent private volume. |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_EVIDENCE_BUCKET` | if `supabase` | Create a **private** bucket (no public access, no policies for `anon`). Server-side only. |
| `VERIFICATION_RETENTION_DAYS` | | Default 30 — **pending legal approval** |
| `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `EMAIL_FROM` | ✅ | Production refuses to start email flows without a provider; it never silently drops mail. |
| `TRANSLATION_PROVIDER` | | `deepl` (+ `DEEPL_API_KEY`, `DEEPL_API_URL`) or `google` (+ `GOOGLE_TRANSLATE_API_KEY`). `none` shows originals with a "translation not available" note. |
| `NEXT_PUBLIC_KAKAO_MAP_KEY` | | Optional; register the production domain in Kakao Developers. The CSP adds Kakao domains automatically. |
| `RATING_CONFIDENCE_M`, `RATING_MIN_REVIEWS_OVERALL` | | Defaults 10 / 10 |
| `CRON_SECRET` | ✅ | Protects `/api/cron/purge` |
| `SAMPLE_DATA` | | Must be unset in production (ignored anyway) |

## 3. Scheduled jobs

Call `GET /api/cron/purge` daily with `Authorization: Bearer $CRON_SECRET`. It deletes verification evidence past retention plus expired sessions and tokens. A `vercel.json` with a daily cron is included; Vercel sends the header automatically when `CRON_SECRET` is set.

## 4. Edge security (Cloudflare / WAF)

- Put Cloudflare (or AWS WAF) in front with the managed OWASP rules.
- Add an edge rate limit on `POST` to `/*/auth/*`, `/*/write-review` and `/api/*`. The app also rate-limits in Postgres per IP hash and per account.
- Forward the real client IP in `X-Forwarded-For` (Vercel does this by default).
- Turn on Bot Fight Mode / Turnstile for sign-up if you see automated registrations. A Turnstile hook is not yet implemented.

## 5. First administrator

1. Sign up through the website with the administrator's email and confirm it.
2. Run `npm run admin:grant -- admin@your-org super_admin` with `DATABASE_URL` pointing at production.
3. Grant other roles from **/admin/team**, using the least privilege needed:
   - Moderators: no evidence, no emails.
   - Verification reviewers: evidence only.
   - Data administrators: offices only.

MFA for administrators is **not yet implemented**. Add it (e.g. WebAuthn or TOTP) before granting roles to more than a small trusted group.

## 6. Launch checklist

- [ ] Every office record verified against an official source (`/admin/offices`, status "verified", source with access date)
- [ ] Legal review of privacy policy, terms, community guidelines, moderation policy, retention periods and the 14-day legal-request deadline; professional ES/KO legal translation
- [ ] Data protection contact designated (privacy policy placeholder)
- [ ] Licensed hero photography (optional) configured in `src/lib/media.ts` with credit
- [ ] Translation provider configured; spot-check translations in `/admin/translations`
- [ ] `npm test`, `npm run test:db` (staging) and `npm run test:e2e` (staging) green
- [ ] Lighthouse / axe checks on home, directory, office profile and write-review in all three languages
- [ ] Backups and point-in-time recovery enabled on the database; `EVIDENCE_ENCRYPTION_KEY` stored in a secrets manager
- [ ] Limited beta invite list
