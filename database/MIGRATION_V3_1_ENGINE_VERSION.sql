-- ============================================================================
-- MIGRATION: NexLearn V3.1 Stage 2 — V3 engine versioning (v3-econ-1.0 | v3-econ-1.1)
-- ============================================================================
-- Prerequisites, in order: MIGRATION_V2_PRODUCTION.sql, MIGRATION_V2_BATCH7_EXPERIENCE.sql,
-- MIGRATION_V2_BATCH7_5_COMMITMENT.sql, MIGRATION_V3_MARKET_PATHS.sql.
--
-- STATUS: prepared and tested ONLY on the disposable local database (scripts/v2-local/up.sh).
--         NOT applied to any shared or production Supabase project. Applying it requires approval.
-- Rollback: database/ROLLBACK_V3_1_ENGINE_VERSION.sql (refuses to run while any v3-econ-1.1 session exists).
--
-- Additive and idempotent. No existing row changes meaning:
--   sessions.econ_version   NULL for every existing session. On a V3 session NULL means '1.0' (v3-econ-1.0, the only
--                           V3 version that existed before this migration); V2 sessions always keep NULL.
--                           '1.0' | '1.1' when chosen explicitly at creation (V3 sessions only).
--
--   v3_engine_versions     server-side release registry: which V3 engine versions NEW sessions may use.
--                          Seeded '1.0' released, '1.1' NOT released. Not readable or writable with the public key.
--                          Releasing a version is a deliberate administrator action (requires approval):
--                            UPDATE v3_engine_versions SET released = true, released_at = now() WHERE econ_version = '1.1';
--                          Re-running this migration never changes the release state. Existing sessions keep their
--                          version whatever the registry says (they are pinned).
--   v3_create_session_v(email, team_names, participation, pacing, market_path, econ_version)  — new; explicit version,
--                          refused unless that version is released
--   v3_create_session      UNCHANGED (still creates v3-econ-1.0 sessions, econ_version NULL)
--   sessions trigger       econ_version, like econ_engine / market_path, is set only before any team has started; then
--                          immutable (existing sessions stay on their original engine version)
--   v3__check_snapshot_engine   a V3 session's snapshots must carry 'v3-econ-' || coalesce(econ_version, '1.0')
--                          (was the literal 'v3-econ-1.0' — identical for every existing session)
--   v2__game_json / v2_facilitator_overview   also return econ_version (MIGRATION_V3_MARKET_PATHS bodies otherwise)
-- v2_init_game and v2_resolve_quarter are not re-declared: they already call v3__check_snapshot_engine.
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS econ_version VARCHAR(8);
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_econ_version_check CHECK (
    econ_version IS NULL OR (econ_engine = 'v3' AND econ_version IN ('1.0', '1.1')));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Release registry (server-side enforcement: an unreleased version cannot be selected, whatever the client sends).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v3_engine_versions (
  econ_version VARCHAR(8) PRIMARY KEY CHECK (econ_version IN ('1.0', '1.1')),
  released BOOLEAN NOT NULL DEFAULT false,
  released_at TIMESTAMPTZ
);
INSERT INTO v3_engine_versions (econ_version, released, released_at) VALUES ('1.0', true, now()), ('1.1', false, NULL)
  ON CONFLICT (econ_version) DO NOTHING;
ALTER TABLE v3_engine_versions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE v3_engine_versions FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON TABLE v3_engine_versions FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Immutability: engine, path and engine version are chosen before the session starts and never change afterwards.
-- Allowed: V2 → V3 (with a path) and NULL → an explicit version, only while no team has started a game (creation).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v3__guard_session_economics()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
DECLARE v_started BOOLEAN := EXISTS (SELECT 1 FROM v2_team_games g WHERE g.session_id = OLD.id);
BEGIN
  IF NEW.econ_engine IS DISTINCT FROM OLD.econ_engine OR NEW.market_path IS DISTINCT FROM OLD.market_path THEN
    IF NOT (OLD.econ_engine = 'v2' AND OLD.market_path IS NULL AND NEW.econ_engine = 'v3' AND NOT v_started) THEN
      RAISE EXCEPTION 'The economic engine and market path of a session cannot be changed';
    END IF;
  END IF;
  IF NEW.econ_version IS DISTINCT FROM OLD.econ_version THEN
    IF NOT (OLD.econ_version IS NULL AND NEW.econ_engine = 'v3' AND NOT v_started) THEN
      RAISE EXCEPTION 'The engine version of a session cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS v3_guard_session_economics ON sessions;
CREATE TRIGGER v3_guard_session_economics BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION v3__guard_session_economics();

-- ---------------------------------------------------------------------------
-- Session creation with an explicit V3 engine version. Same as v3_create_session (which is left unchanged), plus the
-- version, recorded in the same statement that marks the session V3.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v3_create_session_v(
  p_facilitator_email TEXT, p_team_names TEXT[], p_participation_mode TEXT DEFAULT 'team_device', p_pacing TEXT DEFAULT 'facilitator',
  p_market_path TEXT DEFAULT 'A', p_econ_version TEXT DEFAULT '1.0'
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created JSON;
BEGIN
  IF p_market_path IS NULL OR p_market_path NOT IN ('A', 'B', 'C') THEN RAISE EXCEPTION 'Invalid market path'; END IF;
  IF p_econ_version IS NULL OR p_econ_version NOT IN ('1.0', '1.1') THEN RAISE EXCEPTION 'Invalid engine version'; END IF;
  IF NOT EXISTS (SELECT 1 FROM v3_engine_versions WHERE econ_version = p_econ_version AND released) THEN
    RAISE EXCEPTION 'Engine version % is not available', p_econ_version;
  END IF;
  v_created := v2_create_session(p_facilitator_email, p_team_names, p_participation_mode, p_pacing);
  UPDATE sessions SET econ_engine = 'v3', market_path = p_market_path, econ_version = p_econ_version WHERE id = (v_created->>'session_id')::UUID;
  RETURN (v_created::JSONB || jsonb_build_object('econ_engine', 'v3', 'market_path', p_market_path, 'econ_version', p_econ_version))::JSON;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- The snapshot's engine must match the session: V2 sessions 'v2-econ-batch4-frozen' without a path; V3 sessions
-- 'v3-econ-<version>' (NULL version = 1.0) with the session's path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v3__check_snapshot_engine(p_session_id UUID, p_snapshot JSONB)
RETURNS VOID
SET search_path = public, pg_temp
AS $$
DECLARE v_s RECORD;
BEGIN
  SELECT econ_engine, market_path, econ_version INTO v_s FROM sessions WHERE id = p_session_id;
  IF v_s.econ_engine = 'v3' THEN
    IF p_snapshot->>'engineVersion' IS DISTINCT FROM ('v3-econ-' || COALESCE(v_s.econ_version, '1.0'))
       OR p_snapshot->>'marketPath' IS DISTINCT FROM v_s.market_path THEN
      RAISE EXCEPTION 'Snapshot engine does not match this session';
    END IF;
  ELSE
    IF p_snapshot->>'engineVersion' IS DISTINCT FROM 'v2-econ-batch4-frozen' OR p_snapshot ? 'marketPath' THEN
      RAISE EXCEPTION 'Snapshot engine does not match this session';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION v3__check_snapshot_engine(UUID, JSONB), v3__guard_session_economics() FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v3__check_snapshot_engine(UUID, JSONB), v3__guard_session_economics() FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Reads: the MIGRATION_V3_MARKET_PATHS definitions plus econ_version.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2__game_json(p_team_id UUID)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT json_build_object(
    'team_id', t.id,
    'team_name', t.team_name,
    'session', json_build_object(
      'session_code', s.session_code, 'engine_version', s.engine_version, 'participation_mode', s.participation_mode,
      'pacing', s.v2_pacing, 'open_quarter', s.v2_open_quarter, 'presentation_mode', s.presentation_mode,
      'commitment_mode', s.commitment_mode, 'econ_engine', s.econ_engine, 'market_path', s.market_path, 'econ_version', s.econ_version),
    'game', CASE WHEN g.team_id IS NULL THEN NULL ELSE json_build_object(
      'state_version', g.state_version, 'completed_quarter', g.completed_quarter, 'phase', g.phase,
      'snapshot', g.snapshot, 'draft', g.draft, 'updated_at', g.updated_at,
      'commitment', (SELECT json_build_object('agreement', c.agreement, 'committed_by', c.committed_by)
                     FROM v2_commitments c WHERE c.team_id = t.id AND c.quarter = g.completed_quarter + 1)) END,
    'resolutions', COALESCE((
      SELECT json_agg(json_build_object('quarter', r.quarter, 'input', r.input, 'deliberation', r.deliberation,
        'reflection', r.reflection, 'state_version_after', r.state_version_after,
        'agreement', (SELECT c.agreement FROM v2_commitments c WHERE c.team_id = r.team_id AND c.quarter = r.quarter)) ORDER BY r.quarter)
      FROM v2_quarter_resolutions r WHERE r.team_id = t.id), '[]'::json)
  )
  FROM teams t JOIN sessions s ON s.id = t.session_id LEFT JOIN v2_team_games g ON g.team_id = t.id
  WHERE t.id = p_team_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION v2_facilitator_overview(p_session_code TEXT, p_admin_pin TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  RETURN (
    SELECT json_build_object(
      'session_id', s.id, 'session_code', s.session_code, 'engine_version', s.engine_version,
      'participation_mode', s.participation_mode, 'pacing', s.v2_pacing, 'open_quarter', s.v2_open_quarter,
      'presentation_mode', s.presentation_mode, 'commitment_mode', s.commitment_mode,
      'econ_engine', s.econ_engine, 'market_path', s.market_path, 'econ_version', s.econ_version,
      'teams', COALESCE((
        SELECT json_agg(json_build_object(
          'team_id', t.id, 'team_name', t.team_name, 'team_code', ac.code_value,
          'started', g.team_id IS NOT NULL,
          'completed_quarter', COALESCE(g.completed_quarter, 0),
          'phase', g.phase,
          'votes_submitted', (SELECT count(*) FROM v2_votes v WHERE v.team_id = t.id AND v.quarter = COALESCE(g.completed_quarter, 0) + 1),
          'headline', g.headline,
          'updated_at', g.updated_at
        ) ORDER BY t.team_name)
        FROM teams t
        LEFT JOIN access_codes ac ON ac.team_id = t.id AND ac.code_type = 'team_code' AND ac.active = true
        LEFT JOIN v2_team_games g ON g.team_id = t.id
        WHERE t.session_id = s.id), '[]'::json)
    ) FROM sessions s WHERE s.id = v_session_id);
END;
$$ LANGUAGE plpgsql;

-- Grants: the new public RPC only; internal helpers stay private.
REVOKE ALL ON FUNCTION v3_create_session_v(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION v3_create_session_v(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT) TO anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Make the API layer (PostgREST) see the changed functions immediately.
NOTIFY pgrst, 'reload schema';
