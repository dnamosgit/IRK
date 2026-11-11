# Setup checklist: from "Temporarily unavailable" to a working beta

Work through these in order. Each step says how to confirm it worked. Everything here takes about 45 minutes the first time. The example uses **Supabase** for Postgres (free tier is fine for a beta) and **Resend** for email; any Postgres 15+ host and any SMTP/API provider you wire into `src/lib/email/index.ts` would also do.

Keep a scratch text file open; you will collect six values to paste into Vercel.

---

## 1. Create the database (Supabase)

1. Sign in at supabase.com → **New project**. Pick a region close to Korea (for example Seoul or Tokyo), set a strong **database password** and save it in your scratch file as `POSTGRES_PASSWORD`.
2. Wait until the project status is "Healthy".
3. Open **Project Settings → Database**. Under *Connection string* choose **URI** and note two things:
   - the **direct** connection host (looks like `db.<ref>.supabase.co`, port `5432`), and
   - the **Session pooler** host (looks like `aws-0-<region>.pooler.supabase.com`, port `5432`, user `postgres.<ref>`).

   Use the **Session pooler (port 5432)** for the app: it is IPv4-reachable from Vercel. Do **not** use the Transaction pooler (port 6543); it breaks the prepared statements the app uses.
4. Open **SQL Editor → New query** and run the following, replacing the two placeholder passwords with long random ones (`openssl rand -base64 24`). Save them in your scratch file as `APP_PASSWORD` and `READER_PASSWORD`.

   ```sql
   CREATE ROLE irk_app LOGIN PASSWORD 'APP_PASSWORD_HERE';
   CREATE ROLE irk_reader LOGIN PASSWORD 'READER_PASSWORD_HERE';
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE EXTENSION IF NOT EXISTS citext;
   ```

   ✅ Confirm: the query returns "Success. No rows returned".

5. **Disable the Data API for the `public` schema** so Supabase's own REST layer never exposes the tables: **Project Settings → Data API** → remove `public` from *Exposed schemas* (or turn the Data API off). The app talks to Postgres directly and does not use it.

## 2. Build your connection strings

Using the pooler host and the `<ref>` from step 1.3, write these three lines in your scratch file (URL-encode any `@`, `:`, `/` or `#` in passwords, e.g. `@` → `%40`):

```
DATABASE_OWNER_URL=postgres://postgres.<ref>:POSTGRES_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_URL=postgres://irk_app.<ref>:APP_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
DATABASE_READER_URL=postgres://irk_reader.<ref>:READER_PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres
```

> On the pooler the username is `role.<ref>`. On the direct host it is just `role`. If you use the direct host instead, drop the `.<ref>` suffix.

## 3. Run the migrations from your computer

You need Node 20+ and the repository cloned locally.

```bash
git clone https://github.com/dnamosgit/IRK.git
cd IRK
npm install
```

Run the migrations as the owner (paste your real `DATABASE_OWNER_URL`):

```bash
DATABASE_OWNER_URL='postgres://postgres.<ref>:...' DATABASE_SSL=require npm run db:migrate
```

Then seed the office directory and official resources (no fictional reviews in production mode):

```bash
NODE_ENV=production DATABASE_OWNER_URL='postgres://postgres.<ref>:...' DATABASE_SSL=require npm run db:seed
```

✅ Confirm: the output ends with `Migrations complete.` and `Seeded 15 offices (all marked UNVERIFIED) and 5 official resources.`

Optional but recommended: prove the permission model on the real database.

```bash
DATABASE_URL='<DATABASE_URL>' DATABASE_READER_URL='<DATABASE_READER_URL>' DATABASE_SSL=require npm run test:db
```

✅ Confirm: `Tests 8 passed`.

## 4. Generate the secrets

Run each command once and save the output:

```bash
openssl rand -base64 32
```
→ `APP_SECRET`

```bash
openssl rand -base64 32
```
→ `EVIDENCE_ENCRYPTION_KEY` (**back this one up in a password manager; if it is lost, stored verification evidence can never be read again**)

```bash
openssl rand -hex 24
```
→ `CRON_SECRET`

## 5. Email (Resend)

1. Create an account at resend.com, add and verify your sending domain (DNS records they show you), then **API Keys → Create** with "Sending access". Save it as `RESEND_API_KEY`.
2. Decide the from address, e.g. `Immigration Review Korea <no-reply@yourdomain>`; it must be on the verified domain.

Until this is done, sign-up on the production site is refused with a clear message (accounts need a confirmation email).

## 6. Private storage for verification evidence (Supabase Storage)

1. In Supabase: **Storage → New bucket**, name `verification-evidence`, **Public bucket: OFF**. Do not add any policies; the app uses the service-role key server-side only.
2. **Project Settings → API**: copy the **Project URL** (→ `SUPABASE_URL`) and the **service_role** key (→ `SUPABASE_SERVICE_ROLE_KEY`). Treat the service-role key like a root password; it is never sent to browsers.

## 7. Put the variables into Vercel

**Vercel → your project → Settings → Environment Variables.** Add each for the *Production* environment (and *Preview* if you want preview deployments to work):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<your-production-domain>` (no trailing slash) |
| `DATABASE_URL` | from step 2 |
| `DATABASE_READER_URL` | from step 2 |
| `DATABASE_SSL` | `require` |
| `APP_SECRET` | from step 4 |
| `EVIDENCE_ENCRYPTION_KEY` | from step 4 |
| `CRON_SECRET` | from step 4 |
| `EMAIL_PROVIDER` | `resend` |
| `RESEND_API_KEY` | from step 5 |
| `EMAIL_FROM` | from step 5 |
| `STORAGE_PROVIDER` | `supabase` |
| `SUPABASE_URL` | from step 6 |
| `SUPABASE_SERVICE_ROLE_KEY` | from step 6 |
| `SUPABASE_EVIDENCE_BUCKET` | `verification-evidence` |
| `VERIFICATION_RETENTION_DAYS` | `30` (pending legal approval) |

Do **not** set `DATABASE_OWNER_URL` or `SAMPLE_DATA` in Vercel.

Then **Deployments → ⋯ on the latest → Redeploy** (variables are read at build/boot, not live).

✅ Confirm: open `https://<your-domain>/api/health`. It must return `{"status":"ok", ...}`. If it says `degraded`, the JSON names exactly what is wrong (see `docs/DEPLOYMENT.md` → troubleshooting). Then open the homepage: it should render instead of "Temporarily unavailable".

## 8. Create your administrator account

1. On the live site: **Sign In → Create an account** with your email, then open the confirmation email.
2. On your computer, grant yourself the super-administrator role (uses the writer connection):

   ```bash
   DATABASE_URL='<DATABASE_URL>' DATABASE_SSL=require npm run admin:grant -- you@example.com super_admin
   ```

3. Open `https://<your-domain>/admin`.

✅ Confirm: the admin overview loads with its counters. Grant further roles from **Admin → Team & roles** (moderators cannot see evidence or emails; verification reviewers only see evidence).

## 9. Verify the office directory (before inviting anyone)

Every office is seeded **unverified** and shows no contact details until a data administrator confirms it against the official source. For each office in **Admin → Offices**:

1. Open the official Korea Immigration Service office page.
2. Enter the official name, address, phone, website, appointment URL and services exactly as published; add the source URL with today's date under *Source references*.
3. Click **Mark as verified today**.

The procedure and the rules are in `docs/DATA_VERIFICATION.md`. Budget roughly 10 minutes per office.

## 10. Before a limited beta

- [ ] Legal review of the four policy pages (`/legal/*`), the 30-day evidence retention and the 14-day legal-request deadline; professional ES/KO legal translation (currently labelled drafts).
- [ ] Designate the data-protection contact named in the privacy policy.
- [ ] Optional: licensed Seoul photography via `src/lib/media.ts` with credit.
- [ ] Optional: machine translation — set `TRANSLATION_PROVIDER=deepl` + `DEEPL_API_KEY` (or `google` + `GOOGLE_TRANSLATE_API_KEY`) and redeploy.
- [ ] Optional: Kakao Maps — `NEXT_PUBLIC_KAKAO_MAP_KEY` with your domain registered in Kakao Developers.
- [ ] Put Cloudflare (or Vercel's WAF) in front with rate limiting on `/*/auth/*` and `/api/*`.
- [ ] Known gaps still open: administrator two-factor login and a sign-up CAPTCHA. Keep the admin group small until these exist.
- [ ] Invite a small group, watch **Admin → Reviews** and `/api/health` for the first week.

## If something fails

| Symptom | Where to look |
|---|---|
| Pages say "Temporarily unavailable" | `/api/health` → `database.reason`, then step 2/3/7 |
| `auth_failed` | role passwords in step 1.4 vs connection strings in step 2 (check URL-encoding) |
| `tls` | `DATABASE_SSL=require` missing |
| `not_migrated` | step 3 was not run against this database |
| Sign-up says email is not configured | step 5 / step 7 `EMAIL_PROVIDER`, `RESEND_API_KEY` |
| Verification page says pending approval | `EVIDENCE_ENCRYPTION_KEY` missing or not 32 bytes base64 |
| Build fails on Vercel | Vercel → Deployment → Build Logs; CI on GitHub runs the same build on every push |
