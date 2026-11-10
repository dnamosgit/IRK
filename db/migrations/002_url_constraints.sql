-- Defense in depth: links rendered on public pages must be http(s)
-- (official resources may also be tel: links). Application code validates
-- on input and sanitises on output as well.
ALTER TABLE public.offices
  ADD CONSTRAINT offices_website_url_http CHECK (website_url IS NULL OR website_url ~* '^https?://'),
  ADD CONSTRAINT offices_appointment_url_http CHECK (appointment_info_url IS NULL OR appointment_info_url ~* '^https?://');
ALTER TABLE public.office_sources
  ADD CONSTRAINT office_sources_url_http CHECK (url ~* '^https?://');
ALTER TABLE public.official_resources
  ADD CONSTRAINT official_resources_url_scheme CHECK (url ~* '^(https?://|tel:)');
