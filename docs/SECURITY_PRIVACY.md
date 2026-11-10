# Security, privacy and moderation design

## Identity and anonymity

- Accounts require only an email address and a password. Passwords use scrypt (N=16384, r=8, p=1) with per-user salts and timing-safe comparison, plus a dummy hash for unknown emails.
- Sessions use random 256-bit tokens in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production). Only the SHA-256 of each token is stored. A password change or reset revokes other sessions.
- Public identity is a random pseudonym that the user can change. Email, legal name, immigration status and document numbers are never displayed.
- The UI and privacy policy state plainly that anonymity is public-facing only, and that information may be disclosed when legally required.
- IP addresses are stored only as HMAC-SHA256 hashes keyed by `APP_SECRET`, for rate limiting and abuse signals.
- Account deletion immediately deletes verification evidence. The user chooses to delete or keep their reviews; kept reviews show "Former member" and lose the author link.

## Verification evidence

1. **Upload:** JPEG, PNG or WebP only, 8 MB maximum, decoded and re-encoded with `sharp`. This drops EXIF/GPS/camera metadata and rejects non-images. The original filename is discarded.
2. **Encryption:** AES-256-GCM. The random storage key is bound as associated data, so ciphertexts cannot be swapped between records.
3. **Storage:** under a random 256-bit key, in a local directory outside `public/` (mode 0600) or a private Supabase bucket. The database stores the hash, size and type, not the filename.
4. **Access:** only `super_admin` and `verification_reviewer`, only via `/api/admin/evidence/{id}`, served `no-store`, and each view logged as `verification.evidence_viewed`. Moderators cannot open evidence.
5. **Retention:** 90 days while pending. After a decision, `VERIFICATION_RETENTION_DAYS` (30, pending legal approval) before the daily purge deletes it. Users can delete their evidence at any time from their account.
6. **Labels:** the only public labels are "Verified visit" and "Unverified visit", with a tooltip saying verification does not prove the review's content. There are no "verified complaint" labels.
7. **Manual alternative:** users without documents can describe their visit. Nobody is rejected solely for lacking standard documents.

## Moderation

- All reviews start as `pending`. Statuses: pending, approved, needs clarification, escalated for legal review, rejected, temporarily hidden, removed.
- **Automated screening** (`src/lib/screening.ts`) flags emails, phone numbers, registration/passport/reference numbers, links, employee names and identifying descriptions (EN/KO/ES patterns), threats, criminal allegations, harassment and hateful generalisations. It only flags and prioritises. It never publishes, rejects or judges truth.
- **Abuse signals** (`src/lib/abuse.ts`): new accounts, bursts, near-duplicate text (pg_trgm), office review spikes, several accounts on one network, and sign-up clusters.
- **Moderator tools:**
  - View the original submission and full revision history.
  - Use flag highlighting.
  - Request clarification (the author is emailed and sees the message in their account).
  - Redact a passage to `[redacted]` (the original stays in private history, and readers see a "redacted" note).
  - Escalate to legal review.
  - Hide or remove.
  - Every decision requires a recorded reason, except approve/restore, and is written to the audit log.
- Reports never auto-remove content. Threat and personal-information reports bump the case to `urgent`. Reporters' identities are never shown to authors.
- **Appeals:** authors, reporters and verification applicants can appeal, and admins uphold or overturn with a recorded rationale. Institutions use `/legal-requests` for takedowns, legal notices and **right of reply**; approved replies are published under the review.
- Machine translations of sensitive (escalated or seriously flagged) reviews are held as `needs_human_review` and hidden until approved.
- There are no employee profiles, rankings or searchable employee names anywhere.

## Application security

- Server actions get Next.js origin checking. The one JSON POST route (`/helpful`) checks `Origin` explicitly. Cookies are `SameSite=Lax`.
- Inputs are validated with zod on the server. Client validation is only a convenience.
- Rate limits are Postgres-backed fixed windows (per IP hash, plus per account where relevant) for sign-up, sign-in, reset, reviews, reports, appeals, contact, search and votes.
- Headers: CSP (no third-party scripts unless Kakao is enabled), HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy. `/admin` and account pages send `no-store` and `noindex`.
- No secrets in client bundles: only `NEXT_PUBLIC_SITE_URL` and the optional Kakao key are public.
- **Known gaps before public launch:**
  - Administrator MFA.
  - CAPTCHA/Turnstile on sign-up.
  - Malware scanning of uploads (mitigated by image re-encoding).
  - The CSP uses `'unsafe-inline'` for scripts; move to nonces.
  - Automated backups and key rotation runbooks.
  - An external penetration test.
