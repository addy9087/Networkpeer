\set ON_ERROR_STOP on

-- Run manually as the migration owner after migrations complete:
--   psql "$DATABASE_URL" -f scripts/provision-app-role.sql
-- Set the password interactively when prompted. Do not place it in this file.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'networkpeer_app') THEN
    CREATE ROLE networkpeer_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END;
$$;

ALTER ROLE networkpeer_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION;

\password networkpeer_app

SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC', current_database()) \gexec
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION accept_job(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_worker_verification(UUID, VARCHAR, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_job_subtask_media_upload(UUID, UUID, BIGINT, VARCHAR, VARCHAR, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION submit_job_with_evidence(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION enforce_job_submission_evidence() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION advance_worker_job_status(UUID, UUID, job_status) FROM PUBLIC;

SELECT format('GRANT CONNECT ON DATABASE %I TO networkpeer_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO networkpeer_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM networkpeer_app;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM networkpeer_app;

GRANT SELECT, INSERT, UPDATE (is_verified, last_login_at, updated_at) ON users TO networkpeer_app;
GRANT SELECT, INSERT ON worker_profiles TO networkpeer_app;
GRANT SELECT, INSERT, UPDATE (status, cancelled_at, cancellation_reason, updated_at) ON jobs TO networkpeer_app;
GRANT SELECT, INSERT ON job_subtasks TO networkpeer_app;
GRANT SELECT ON wallet_ledger TO networkpeer_app;
GRANT SELECT, INSERT, UPDATE (upload_expires_at) ON job_subtask_media TO networkpeer_app;
GRANT EXECUTE ON FUNCTION accept_job(UUID, UUID) TO networkpeer_app;
GRANT EXECUTE ON FUNCTION set_worker_verification(UUID, VARCHAR, BOOLEAN) TO networkpeer_app;
GRANT EXECUTE ON FUNCTION confirm_job_subtask_media_upload(UUID, UUID, BIGINT, VARCHAR, VARCHAR, TEXT, TEXT) TO networkpeer_app;
GRANT EXECUTE ON FUNCTION submit_job_with_evidence(UUID, UUID) TO networkpeer_app;
GRANT EXECUTE ON FUNCTION advance_worker_job_status(UUID, UUID, job_status) TO networkpeer_app;

-- Apply the same baseline to future tables created by the migration owner.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
