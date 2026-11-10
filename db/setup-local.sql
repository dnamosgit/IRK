-- Local development bootstrap (run as a Postgres superuser):
--   sudo -u postgres psql -f db/setup-local.sql
-- Creates the database and three LOGIN roles with development passwords.
-- NEVER reuse these passwords anywhere else.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'irk_owner') THEN CREATE ROLE irk_owner LOGIN PASSWORD 'irk_owner_dev' CREATEROLE; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'irk_app') THEN CREATE ROLE irk_app LOGIN PASSWORD 'irk_app_dev'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'irk_reader') THEN CREATE ROLE irk_reader LOGIN PASSWORD 'irk_reader_dev'; END IF;
END $$;
SELECT 'CREATE DATABASE irk OWNER irk_owner' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'irk')\gexec
\c irk
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
