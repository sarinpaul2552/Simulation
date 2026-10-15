-- LOCAL DISPOSABLE DATABASE ONLY (scripts/v2-local/up.sh). Never run against a shared or production database.
-- Releases v3-econ-1.1 locally so the development and test suites can create 1.1 sessions. In production 1.1 stays
-- unreleased until an approved administrator change.
UPDATE v3_engine_versions SET released = true, released_at = now() WHERE econ_version = '1.1';
