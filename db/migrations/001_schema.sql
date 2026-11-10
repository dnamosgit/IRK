-- Immigration Review Korea — core schema
-- Runs as the schema owner (irk_owner locally, `postgres` on Supabase).
--
-- Data separation:
--   public.*   application content. RLS + column grants restrict what the
--              read-only role (irk_reader) can see: only active offices and
--              PUBLISHED reviews, never author ids or moderation fields.
--   private.*  accounts, sessions, verification evidence, moderation, reports,
--              appeals, legal requests, audit logs. irk_reader has NO access.
--
-- Roles:
--   irk_app     server-side writer used by authenticated server actions.
--   irk_reader  read-only role used to render public pages.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'irk_app') THEN CREATE ROLE irk_app NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'irk_reader') THEN CREATE ROLE irk_reader NOLOGIN; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

-- ---------------------------------------------------------------- enums
CREATE TYPE office_type AS ENUM ('immigration_office', 'branch_office', 'airport_facility', 'other_facility');
CREATE TYPE office_data_status AS ENUM ('verified', 'unverified', 'outdated');
CREATE TYPE location_precision AS ENUM ('exact', 'approximate_city', 'unknown');
CREATE TYPE service_category AS ENUM ('visa_application', 'residence_extension', 'status_change', 'residence_card', 'document_submission', 'nationality', 'other');
CREATE TYPE yes_no_unsure AS ENUM ('yes', 'no', 'unsure');
CREATE TYPE service_outcome AS ENUM ('yes', 'partially', 'no', 'unsure');
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'needs_clarification', 'legal_review', 'rejected', 'hidden', 'removed');
CREATE TYPE public_verification AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE rating_dimension AS ENUM ('professionalism', 'communication', 'waiting', 'appointment_process', 'accessibility');
CREATE TYPE translation_status AS ENUM ('pending', 'completed', 'failed', 'needs_human_review', 'approved_manual', 'unavailable');

-- ---------------------------------------------------------------- private: identity
CREATE TABLE private.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  password_hash text NOT NULL,
  email_verified_at timestamptz,
  preferred_locale text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  signup_ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE private.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip_hash text,
  user_agent text
);
CREATE INDEX sessions_user_idx ON private.sessions(user_id);

CREATE TABLE private.email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email', 'reset_password')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- public pseudonymous profile (no email, no legal name)
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES private.users(id) ON DELETE CASCADE,
  display_name text NOT NULL UNIQUE CHECK (char_length(display_name) BETWEEN 3 AND 40),
  display_name_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- admin / RBAC
CREATE TABLE private.admin_roles (
  key text PRIMARY KEY,
  description text NOT NULL
);
INSERT INTO private.admin_roles (key, description) VALUES
  ('super_admin', 'Full access including role management and audit logs'),
  ('moderator', 'Review moderation, reports, appeals, translations. No identity or evidence access.'),
  ('verification_reviewer', 'Visit verification evidence only'),
  ('data_admin', 'Office directory, official resources, office translations');

CREATE TABLE private.admin_users (
  user_id uuid NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
  role text NOT NULL REFERENCES private.admin_roles(key),
  granted_by uuid REFERENCES private.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE private.audit_logs (
  id bigserial PRIMARY KEY,
  actor_user_id uuid,
  action text NOT NULL,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_target_idx ON private.audit_logs(target_type, target_id);
CREATE INDEX audit_logs_created_idx ON private.audit_logs(created_at DESC);

-- ---------------------------------------------------------------- offices
CREATE TABLE public.offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  office_type office_type NOT NULL,
  official_name_ko text NOT NULL,
  city_key text NOT NULL,
  region_key text NOT NULL,
  address_ko text,
  latitude double precision,
  longitude double precision,
  location_precision location_precision NOT NULL DEFAULT 'unknown',
  phone text,
  website_url text,
  appointment_info_url text,
  services service_category[] NOT NULL DEFAULT '{}',
  data_status office_data_status NOT NULL DEFAULT 'unverified',
  last_verified_at date,
  data_source text,
  is_active boolean NOT NULL DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((latitude IS NULL) = (longitude IS NULL))
);
CREATE INDEX offices_name_ko_trgm ON public.offices USING gin (official_name_ko gin_trgm_ops);
CREATE INDEX offices_city_idx ON public.offices(city_key);
CREATE INDEX offices_region_idx ON public.offices(region_key);

CREATE TABLE public.office_translations (
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  locale text NOT NULL,
  name text NOT NULL,
  address text,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (office_id, locale)
);
CREATE INDEX office_translations_name_trgm ON public.office_translations USING gin (name gin_trgm_ops);

CREATE TABLE public.office_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL,
  source_type text NOT NULL DEFAULT 'official' CHECK (source_type IN ('official', 'other')),
  accessed_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.office_updates (
  id bigserial PRIMARY KEY,
  office_id uuid NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  actor_user_id uuid,
  change_type text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.official_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  url text NOT NULL,
  category text NOT NULL,
  title jsonb NOT NULL,        -- {"en": "...", "es": "...", "ko": "..."}
  description jsonb NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  last_checked_at date
);

-- ---------------------------------------------------------------- reviews
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.offices(id),
  user_id uuid REFERENCES private.users(id) ON DELETE SET NULL,
  service_category service_category NOT NULL,
  visit_month date NOT NULL CHECK (extract(day FROM visit_month) = 1),
  used_appointment yes_no_unsure NOT NULL,
  received_service service_outcome NOT NULL,
  original_language text NOT NULL,
  title text CHECK (title IS NULL OR char_length(title) <= 120),
  body text NOT NULL CHECK (char_length(body) BETWEEN 50 AND 5000),
  status review_status NOT NULL DEFAULT 'pending',
  verification public_verification NOT NULL DEFAULT 'unverified',
  overall_score numeric(3,2) NOT NULL CHECK (overall_score BETWEEN 1 AND 5),
  helpful_count int NOT NULL DEFAULT 0,
  is_redacted boolean NOT NULL DEFAULT false,
  is_sample boolean NOT NULL DEFAULT false,
  author_deleted boolean NOT NULL DEFAULT false,
  content_hash text NOT NULL,
  published_at timestamptz,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- one review per person, office, service and visit month (duplicate interaction guard)
CREATE UNIQUE INDEX reviews_dedupe_uidx ON public.reviews (user_id, office_id, service_category, visit_month)
  WHERE user_id IS NOT NULL AND status NOT IN ('rejected', 'removed');
CREATE INDEX reviews_office_status_idx ON public.reviews(office_id, status);
CREATE INDEX reviews_status_idx ON public.reviews(status);
CREATE INDEX reviews_language_idx ON public.reviews(original_language);
CREATE INDEX reviews_visit_month_idx ON public.reviews(visit_month);
CREATE INDEX reviews_score_idx ON public.reviews(overall_score);
CREATE INDEX reviews_verification_idx ON public.reviews(verification);
CREATE INDEX reviews_published_idx ON public.reviews(published_at DESC);
CREATE INDEX reviews_user_idx ON public.reviews(user_id);
CREATE INDEX reviews_body_trgm ON public.reviews USING gin (body gin_trgm_ops);

CREATE TABLE public.review_ratings (
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  dimension rating_dimension NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  PRIMARY KEY (review_id, dimension)
);
CREATE INDEX review_ratings_dimension_idx ON public.review_ratings(dimension, score);

CREATE TABLE public.review_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  source_language text NOT NULL,
  target_language text NOT NULL,
  translated_title text,
  translated_body text,
  engine text NOT NULL,
  status translation_status NOT NULL DEFAULT 'pending',
  source_hash text NOT NULL,
  error text,
  translated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, target_language)
);
CREATE INDEX review_translations_status_idx ON public.review_translations(status);

-- published institutional responses (right of reply)
CREATE TABLE public.review_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  organization_name text NOT NULL,
  body text NOT NULL,
  language text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.helpful_votes (
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES private.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (review_id, user_id)
);

-- full history of what authors submitted and what moderators changed
CREATE TABLE private.review_revisions (
  id bigserial PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('submission', 'author_edit', 'redaction')),
  title text,
  body text NOT NULL,
  actor_user_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- verification (private)
CREATE TABLE private.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES private.users(id) ON DELETE SET NULL,
  method text NOT NULL CHECK (method IN ('appointment_confirmation', 'redacted_evidence', 'manual_alternative')),
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'withdrawn')),
  user_note text CHECK (user_note IS NULL OR char_length(user_note) <= 2000),
  decision_reason text,
  decided_by uuid,
  decided_at timestamptz,
  retention_until timestamptz NOT NULL,
  evidence_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_events_status_idx ON private.verification_events(status);
CREATE INDEX verification_events_retention_idx ON private.verification_events(retention_until) WHERE evidence_deleted_at IS NULL;

CREATE TABLE private.private_verification_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_event_id uuid NOT NULL REFERENCES private.verification_events(id) ON DELETE CASCADE,
  storage_provider text NOT NULL,
  storage_key text NOT NULL UNIQUE,      -- random, never derived from the original filename
  content_type text NOT NULL,
  byte_size int NOT NULL,
  ciphertext_sha256 text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ---------------------------------------------------------------- moderation (private)
CREATE TABLE private.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL UNIQUE REFERENCES public.reviews(id) ON DELETE CASCADE,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  screening_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  abuse_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  submission_ip_hash text,              -- keyed hash, never the raw IP
  is_open boolean NOT NULL DEFAULT true,
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_cases_open_idx ON private.moderation_cases(is_open, priority);

CREATE TABLE private.moderation_actions (
  id bigserial PRIMARY KEY,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  actor_user_id uuid,
  action text NOT NULL,
  from_status review_status,
  to_status review_status,
  reason_code text,
  note text,
  message_to_author text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX moderation_actions_review_idx ON private.moderation_actions(review_id, created_at DESC);

CREATE TABLE private.review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  review_id uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  reporter_user_id uuid REFERENCES private.users(id) ON DELETE SET NULL,
  reporter_ip_hash text,
  reason text NOT NULL CHECK (reason IN ('personal_info', 'harassment', 'threats', 'defamation', 'misleading', 'spam', 'irrelevant', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'actioned', 'dismissed')),
  resolution_note text,
  handled_by uuid,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX review_reports_status_idx ON private.review_reports(status, created_at);

CREATE TABLE private.appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  user_id uuid REFERENCES private.users(id) ON DELETE SET NULL,
  contact_email citext,
  appeal_type text NOT NULL CHECK (appeal_type IN ('moderation_decision', 'report_outcome', 'verification_decision')),
  review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  related_reference text,
  message text NOT NULL CHECK (char_length(message) BETWEEN 20 AND 3000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'overturned')),
  decision_note text,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- takedown requests, right of reply, legal notices
CREATE TABLE private.legal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('takedown', 'right_of_reply', 'legal_notice', 'other')),
  review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  requester_name text NOT NULL,
  requester_organization text,
  requester_email citext NOT NULL,
  legal_basis text,
  message text NOT NULL CHECK (char_length(message) BETWEEN 20 AND 5000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'declined')),
  deadline_at timestamptz,
  resolution_note text,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE private.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('contact', 'problem', 'deletion_request')),
  email citext,
  message text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 3000),
  page_url text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.translation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id uuid NOT NULL REFERENCES public.review_translations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES private.users(id) ON DELETE SET NULL,
  note text CHECK (note IS NULL OR char_length(note) <= 1000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------- infrastructure
CREATE TABLE private.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

CREATE TABLE private.email_outbox (
  id bigserial PRIMARY KEY,
  to_address citext NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  provider text NOT NULL,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE private.schema_migrations (
  name text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ================================================================ permissions
-- irk_app: full DML on application tables (audit logs are append-only)
GRANT USAGE ON SCHEMA public, private TO irk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO irk_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO irk_app;
REVOKE UPDATE, DELETE ON private.audit_logs FROM irk_app;
REVOKE INSERT, UPDATE, DELETE ON private.admin_roles FROM irk_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public, private TO irk_app;

-- irk_reader: public schema only, selected columns only, published rows only
REVOKE ALL ON SCHEMA private FROM irk_reader;
GRANT USAGE ON SCHEMA public TO irk_reader;
GRANT SELECT ON public.offices, public.office_translations, public.office_sources,
  public.official_resources, public.review_ratings, public.review_responses TO irk_reader;
GRANT SELECT (user_id, display_name) ON public.user_profiles TO irk_reader;
GRANT SELECT (id, office_id, service_category, visit_month, used_appointment, received_service,
  original_language, title, body, status, verification, overall_score, helpful_count,
  is_redacted, is_sample, author_deleted, published_at, edited_at) ON public.reviews TO irk_reader;
GRANT SELECT (id, review_id, source_language, target_language, translated_title, translated_body,
  engine, status, translated_at) ON public.review_translations TO irk_reader;
-- the reader may resolve the author's pseudonym through a security-definer function only
-- (user_id column is not granted)

ALTER TABLE public.offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpful_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- app role sees everything (server-side, authorization enforced in application code)
CREATE POLICY app_all ON public.offices FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.office_translations FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.office_sources FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.official_resources FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.reviews FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.review_ratings FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.review_translations FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.review_responses FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.helpful_votes FOR ALL TO irk_app USING (true) WITH CHECK (true);
CREATE POLICY app_all ON public.user_profiles FOR ALL TO irk_app USING (true) WITH CHECK (true);

-- reader policies
CREATE POLICY reader_active ON public.offices FOR SELECT TO irk_reader USING (archived_at IS NULL);
CREATE POLICY reader_active ON public.office_translations FOR SELECT TO irk_reader
  USING (EXISTS (SELECT 1 FROM public.offices o WHERE o.id = office_id AND o.archived_at IS NULL));
CREATE POLICY reader_active ON public.office_sources FOR SELECT TO irk_reader USING (true);
CREATE POLICY reader_active ON public.official_resources FOR SELECT TO irk_reader USING (is_active);
CREATE POLICY reader_published ON public.reviews FOR SELECT TO irk_reader USING (status = 'approved');
CREATE POLICY reader_published ON public.review_ratings FOR SELECT TO irk_reader
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.status = 'approved'));
CREATE POLICY reader_published ON public.review_translations FOR SELECT TO irk_reader
  USING (status IN ('completed', 'approved_manual')
     AND EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.status = 'approved'));
CREATE POLICY reader_published ON public.review_responses FOR SELECT TO irk_reader
  USING (EXISTS (SELECT 1 FROM public.reviews r WHERE r.id = review_id AND r.status = 'approved'));
CREATE POLICY reader_public ON public.user_profiles FOR SELECT TO irk_reader USING (true);

-- pseudonym lookup for a published review without exposing reviews.user_id
CREATE FUNCTION public.review_author_name(p_review_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN r.author_deleted OR p.display_name IS NULL THEN NULL ELSE p.display_name END
  FROM public.reviews r LEFT JOIN public.user_profiles p ON p.user_id = r.user_id
  WHERE r.id = p_review_id AND r.status = 'approved'
$$;
REVOKE ALL ON FUNCTION public.review_author_name(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_author_name(uuid) TO irk_reader, irk_app;

-- user_profiles.user_id is granted to the reader only so that pseudonyms can be
-- joined; reviews.user_id is not granted, so author linkage is never exposed.
REVOKE SELECT (user_id) ON public.user_profiles FROM irk_reader;
GRANT SELECT (display_name) ON public.user_profiles TO irk_reader;
