-- ============================================================================
-- ROLLBACK: NexLearn V3.1 Stage 2 — V3 engine versioning
-- ============================================================================
-- Restores the MIGRATION_V3_MARKET_PATHS.sql state exactly: the original guard trigger, snapshot check and reads;
-- drops v3_create_session_v, the v3_engine_versions release registry, the constraint and the econ_version column.
--
-- SAFETY: refuses to run while any session has econ_version = '1.1' — those games could no longer be saved or
-- verified after rollback. Sessions with econ_version NULL or '1.0' are v3-econ-1.0 games and are unaffected.
-- Run in one transaction:  psql ... -v ON_ERROR_STOP=1 -1 -f ROLLBACK_V3_1_ENGINE_VERSION.sql
-- STATUS: tested ONLY on the disposable local database. Not applied anywhere.
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'econ_version')
     AND EXISTS (SELECT 1 FROM sessions WHERE econ_version = '1.1') THEN
    RAISE EXCEPTION 'Rollback refused: v3-econ-1.1 sessions exist (they would become unplayable).';
  END IF;
END $$;

DROP FUNCTION IF EXISTS v3_create_session_v(TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT);

-- Original (MIGRATION_V3_MARKET_PATHS) definitions — must be restored before the column is dropped.
CREATE OR REPLACE FUNCTION v3__guard_session_economics()
RETURNS TRIGGER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.econ_engine IS DISTINCT FROM OLD.econ_engine OR NEW.market_path IS DISTINCT FROM OLD.market_path THEN
    IF NOT (OLD.econ_engine = 'v2' AND OLD.market_path IS NULL AND NEW.econ_engine = 'v3'
            AND NOT EXISTS (SELECT 1 FROM v2_team_games g WHERE g.session_id = OLD.id)) THEN
      RAISE EXCEPTION 'The economic engine and market path of a session cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v3__check_snapshot_engine(p_session_id UUID, p_snapshot JSONB)
RETURNS VOID
SET search_path = public, pg_temp
AS $$
DECLARE v_s RECORD;
BEGIN
  SELECT econ_engine, market_path INTO v_s FROM sessions WHERE id = p_session_id;
  IF v_s.econ_engine = 'v3' THEN
    IF p_snapshot->>'engineVersion' IS DISTINCT FROM 'v3-econ-1.0' OR p_snapshot->>'marketPath' IS DISTINCT FROM v_s.market_path THEN
      RAISE EXCEPTION 'Snapshot engine does not match this session';
    END IF;
  ELSE
    IF p_snapshot->>'engineVersion' IS DISTINCT FROM 'v2-econ-batch4-frozen' OR p_snapshot ? 'marketPath' THEN
      RAISE EXCEPTION 'Snapshot engine does not match this session';
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

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
      'commitment_mode', s.commitment_mode, 'econ_engine', s.econ_engine, 'market_path', s.market_path),
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
      'econ_engine', s.econ_engine, 'market_path', s.market_path,
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

DROP TABLE IF EXISTS v3_engine_versions;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_econ_version_check;
ALTER TABLE sessions DROP COLUMN IF EXISTS econ_version;

-- Make the API layer (PostgREST) see the changed functions immediately.
NOTIFY pgrst, 'reload schema';
