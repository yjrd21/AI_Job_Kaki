-- Apply once to existing PostgreSQL user-service databases before deploying this change.
-- New accounts receive false, and existing accounts retain access to onboarding until completed.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;
