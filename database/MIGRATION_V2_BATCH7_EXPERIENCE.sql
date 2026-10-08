-- ============================================================================
-- MIGRATION: V2 Batch 7 — Student experience (presentation mode + facilitator debrief)
-- ============================================================================
-- Prerequisite: MIGRATION_V2_PRODUCTION.sql. Additive and idempotent. Changes no economic data, no existing rows
-- except giving every session the default presentation mode 'mba' (a display preference).
--
--   sessions.presentation_mode         'undergraduate' | 'mba' (display only; never read by the economic engine)
--   v2__game_json                      now also returns session.presentation_mode (same signature, replaced)
--   v2_facilitator_overview            now also returns presentation_mode (same signature, replaced)
--   v2_facilitator_set_presentation_mode(code, pin, mode)                   facilitator only
--   v2_facilitator_debrief(code, pin)  per team: committed inputs, team-level deliberation, reflections and the
--                                      revealed votes of RESOLVED quarters only. Never role briefs, drafts or the
--                                      votes of a quarter still in progress.
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS presentation_mode VARCHAR(20) NOT NULL DEFAULT 'mba';
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_presentation_mode_check CHECK (presentation_mode IN ('undergraduate', 'mba'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
      'pacing', s.v2_pacing, 'open_quarter', s.v2_open_quarter, 'presentation_mode', s.presentation_mode),
    'game', CASE WHEN g.team_id IS NULL THEN NULL ELSE json_build_object(
      'state_version', g.state_version, 'completed_quarter', g.completed_quarter, 'phase', g.phase,
      'snapshot', g.snapshot, 'draft', g.draft, 'updated_at', g.updated_at) END,
    'resolutions', COALESCE((
      SELECT json_agg(json_build_object('quarter', r.quarter, 'input', r.input, 'deliberation', r.deliberation,
        'reflection', r.reflection, 'state_version_after', r.state_version_after) ORDER BY r.quarter)
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
      'presentation_mode', s.presentation_mode,
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

CREATE OR REPLACE FUNCTION v2_facilitator_set_presentation_mode(p_session_code TEXT, p_admin_pin TEXT, p_mode TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  IF p_mode NOT IN ('undergraduate', 'mba') THEN RAISE EXCEPTION 'Invalid presentation mode'; END IF;
  UPDATE sessions SET presentation_mode = p_mode, updated_at = NOW() WHERE id = v_session_id AND engine_version = 'v2';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a V2 session'; END IF;
  RETURN json_build_object('presentation_mode', p_mode);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_facilitator_debrief(p_session_code TEXT, p_admin_pin TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  RETURN COALESCE((
    SELECT json_agg(json_build_object(
      'team_id', t.id,
      'team_name', t.team_name,
      'completed_quarter', COALESCE(g.completed_quarter, 0),
      'inputs', COALESCE((SELECT json_agg(r.input ORDER BY r.quarter) FROM v2_quarter_resolutions r WHERE r.team_id = t.id), '[]'::json),
      'deliberations', COALESCE((SELECT json_agg(r.deliberation ORDER BY r.quarter) FROM v2_quarter_resolutions r WHERE r.team_id = t.id), '[]'::json),
      'reflections', COALESCE((SELECT json_agg(r.reflection ORDER BY r.quarter) FROM v2_quarter_resolutions r WHERE r.team_id = t.id), '[]'::json),
      'votes', COALESCE((
        SELECT json_object_agg(x.quarter, x.votes) FROM (
          SELECT v.quarter, json_object_agg(v.role, v.vote) AS votes
          FROM v2_votes v
          WHERE v.team_id = t.id AND EXISTS (SELECT 1 FROM v2_quarter_resolutions r WHERE r.team_id = t.id AND r.quarter = v.quarter)
          GROUP BY v.quarter) x), '{}'::json)
    ) ORDER BY t.team_name)
    FROM teams t LEFT JOIN v2_team_games g ON g.team_id = t.id
    WHERE t.session_id = v_session_id), '[]'::json);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION v2_facilitator_set_presentation_mode(TEXT, TEXT, TEXT), v2_facilitator_debrief(TEXT, TEXT) TO anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
