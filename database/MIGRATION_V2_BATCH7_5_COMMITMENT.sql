-- ============================================================================
-- MIGRATION: V2 Batch 7.5 — Team Commitment (optional private voting)
-- ============================================================================
-- Prerequisites, in order: MIGRATION_V2_PRODUCTION.sql, MIGRATION_V2_BATCH7_EXPERIENCE.sql.
-- Additive and idempotent. Changes no economic data. Existing sessions KEEP their voting behaviour:
--   participation_mode = 'voting_disabled'  → commitment_mode 'none'          (unchanged: commit without votes)
--   any other existing session              → commitment_mode 'private_vote'  (unchanged: five private votes)
-- New sessions default to 'team_commitment'.
--
--   sessions.commitment_mode      'team_commitment' | 'private_vote' | 'none'   (facilitator-controlled)
--   v2_commitments                one row per (team, quarter): the team's agreement statement and who confirmed.
--                                 No individual votes are created for a team commitment. Block-all RLS.
--   v2_confirm_commitment(team_code, quarter, agreement, role)   risk|vote → commit (team_commitment only)
--   v2_set_phase                  enforces the mode: risk → vote only for private_vote, risk → commit only for 'none';
--                                 leaving vote/commit for an editing phase clears that quarter's votes AND commitment
--   v2_resolve_quarter            requires the commitment row (team_commitment) or five votes (private_vote)
--   v2_facilitator_set_commitment_mode(code, pin, mode)            facilitator only
--   v2__game_json / v2_facilitator_overview / v2_facilitator_debrief  also return commitment_mode and the
--                                 agreement of RESOLVED quarters (never another quarter's votes; never role briefs)
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS commitment_mode VARCHAR(20);
UPDATE sessions SET commitment_mode = CASE WHEN participation_mode = 'voting_disabled' THEN 'none' ELSE 'private_vote' END
WHERE commitment_mode IS NULL;
ALTER TABLE sessions ALTER COLUMN commitment_mode SET DEFAULT 'team_commitment';
ALTER TABLE sessions ALTER COLUMN commitment_mode SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_commitment_mode_check CHECK (commitment_mode IN ('team_commitment', 'private_vote', 'none'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS v2_commitments (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 8),
  agreement TEXT NOT NULL CHECK (agreement IN ('agreed', 'discussed', 'leader')),
  committed_by TEXT CHECK (committed_by IS NULL OR committed_by IN ('CEO', 'CFO', 'Product', 'People', 'Growth')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, quarter)
);
ALTER TABLE v2_commitments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_commitments_block_all ON v2_commitments;
CREATE POLICY v2_commitments_block_all ON v2_commitments FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON v2_commitments FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON v2_commitments FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Session creation: same signature; a 'voting_disabled' session keeps the legacy no-vote commit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2_create_session(
  p_facilitator_email TEXT, p_team_names TEXT[], p_participation_mode TEXT DEFAULT 'team_device', p_pacing TEXT DEFAULT 'facilitator'
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created JSON;
  v_session_id UUID;
  v_teams JSON[] := ARRAY[]::JSON[];
  v_name TEXT;
  v_commit TEXT := CASE WHEN p_participation_mode = 'voting_disabled' THEN 'none' ELSE 'team_commitment' END;
BEGIN
  IF p_participation_mode NOT IN ('team_device', 'individual_device', 'voting_disabled') THEN RAISE EXCEPTION 'Invalid participation mode'; END IF;
  IF p_pacing NOT IN ('facilitator', 'self') THEN RAISE EXCEPTION 'Invalid pacing'; END IF;
  IF p_team_names IS NULL OR array_length(p_team_names, 1) IS NULL OR array_length(p_team_names, 1) > 30 THEN RAISE EXCEPTION 'Between 1 and 30 teams required'; END IF;
  v_created := create_session(p_facilitator_email, array_length(p_team_names, 1));
  v_session_id := (v_created->>'session_id')::UUID;
  UPDATE sessions SET engine_version = 'v2', participation_mode = p_participation_mode, v2_pacing = p_pacing, v2_open_quarter = 1,
    game_phase = 'v2-play', current_quarter = 1, commitment_mode = v_commit
  WHERE id = v_session_id;
  FOREACH v_name IN ARRAY p_team_names LOOP
    v_teams := v_teams || create_team_with_code(v_created->>'session_code', v_created->>'admin_pin', left(v_name, 100));
  END LOOP;
  RETURN json_build_object('session_id', v_session_id, 'session_code', v_created->>'session_code', 'admin_pin', v_created->>'admin_pin',
    'engine_version', 'v2', 'participation_mode', p_participation_mode, 'pacing', p_pacing, 'commitment_mode', v_commit,
    'teams', to_json(v_teams));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_facilitator_set_commitment_mode(p_session_code TEXT, p_admin_pin TEXT, p_mode TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  IF p_mode NOT IN ('team_commitment', 'private_vote') THEN RAISE EXCEPTION 'Invalid commitment mode'; END IF;
  UPDATE sessions SET commitment_mode = p_mode,
    -- a legacy no-vote session that switches mode starts using the chosen commitment step
    participation_mode = CASE WHEN participation_mode = 'voting_disabled' THEN 'team_device' ELSE participation_mode END,
    updated_at = NOW()
  WHERE id = v_session_id AND engine_version = 'v2';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a V2 session'; END IF;
  RETURN json_build_object('commitment_mode', p_mode);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Phase machine with the commitment mode enforced on the server
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2_set_phase(p_team_code TEXT, p_quarter INT, p_from TEXT, p_to TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_game v2_team_games%ROWTYPE;
  v_session RECORD;
  v_working INT;
  v_votes INT;
  v_ok BOOLEAN := false;
BEGIN
  SELECT * INTO v_game FROM v2_team_games WHERE team_id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not initialized'; END IF;
  SELECT s.* INTO v_session FROM sessions s WHERE s.id = v_game.session_id;
  v_working := v_game.completed_quarter + 1;
  IF v_game.phase = p_to AND (
       (p_to IN ('results', 'reflect', 'final') AND p_quarter = v_game.completed_quarter) OR
       (p_to NOT IN ('results', 'reflect', 'final') AND p_quarter = v_working)) THEN
    RETURN json_build_object('phase', v_game.phase, 'changed', false);
  END IF;
  IF v_game.phase <> p_from THEN RAISE EXCEPTION 'Phase conflict: team is in %, not %', v_game.phase, p_from; END IF;

  IF p_from IN ('results', 'reflect') THEN
    IF p_quarter <> v_game.completed_quarter THEN RAISE EXCEPTION 'Wrong quarter'; END IF;
  ELSIF p_quarter <> v_working THEN RAISE EXCEPTION 'Wrong quarter';
  END IF;

  v_ok := CASE
    WHEN p_from = 'briefing' THEN p_to = 'decide'
    WHEN p_from = 'decide' THEN p_to IN ('belief', 'briefing')
    WHEN p_from = 'belief' THEN p_to IN ('risk', 'decide')
    WHEN p_from = 'risk' THEN p_to IN ('belief', 'decide')
      OR (p_to = 'vote' AND v_session.commitment_mode = 'private_vote')
      OR (p_to = 'commit' AND v_session.commitment_mode = 'none')
    WHEN p_from = 'vote' THEN p_to IN ('decide', 'belief', 'risk') OR (p_to = 'commit' AND v_session.commitment_mode = 'private_vote')
    WHEN p_from = 'commit' THEN p_to IN ('decide', 'belief', 'risk')
    WHEN p_from = 'results' THEN p_to = 'reflect'
    WHEN p_from = 'reflect' THEN p_to IN ('briefing', 'final')
    ELSE false END;
  IF NOT v_ok THEN
    IF p_to = 'commit' AND v_session.commitment_mode = 'team_commitment' THEN RAISE EXCEPTION 'Use the team commitment to commit this decision'; END IF;
    RAISE EXCEPTION 'Transition % → % not allowed', p_from, p_to;
  END IF;

  IF p_to IN ('vote', 'commit') AND (v_game.draft IS NULL OR v_game.draft->'input' IS NULL) THEN RAISE EXCEPTION 'Save the decision before voting or committing'; END IF;
  IF p_to = 'commit' AND v_session.commitment_mode = 'private_vote' THEN
    SELECT count(*) INTO v_votes FROM v2_votes WHERE team_id = v_team_id AND quarter = v_working;
    IF v_votes < 5 THEN RAISE EXCEPTION 'All five roles must vote before committing'; END IF;
  END IF;
  IF p_to = 'briefing' AND p_from = 'reflect' THEN
    IF v_game.completed_quarter >= 8 THEN RAISE EXCEPTION 'The game is complete'; END IF;
    IF v_session.v2_pacing = 'facilitator' AND v_game.completed_quarter + 1 > v_session.v2_open_quarter THEN
      RAISE EXCEPTION 'Q% has not been opened by the facilitator yet', v_game.completed_quarter + 1;
    END IF;
  END IF;
  IF p_to = 'final' AND v_game.completed_quarter < 8 THEN RAISE EXCEPTION 'The game is not complete'; END IF;
  IF p_from IN ('vote', 'commit') AND p_to IN ('decide', 'belief', 'risk') THEN
    DELETE FROM v2_votes WHERE team_id = v_team_id AND quarter = v_working;
    DELETE FROM v2_commitments WHERE team_id = v_team_id AND quarter = v_working;
  END IF;

  UPDATE v2_team_games SET phase = p_to, updated_at = NOW() WHERE team_id = v_team_id;
  RETURN json_build_object('phase', p_to, 'changed', true);
END;
$$ LANGUAGE plpgsql;

/**
 * Team Commitment: one authorized participant (holder of the team code) confirms the team's decision with an
 * agreement statement. Moves risk|vote → commit. Idempotent when already committed with the same agreement.
 * Any partial private votes left from a mode switch are discarded unrevealed. No individual votes are created.
 */
CREATE OR REPLACE FUNCTION v2_confirm_commitment(p_team_code TEXT, p_quarter INT, p_agreement TEXT, p_role TEXT DEFAULT NULL)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_game v2_team_games%ROWTYPE;
  v_session RECORD;
BEGIN
  SELECT * INTO v_game FROM v2_team_games WHERE team_id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not initialized'; END IF;
  SELECT s.* INTO v_session FROM sessions s WHERE s.id = v_game.session_id;
  IF v_session.commitment_mode <> 'team_commitment' THEN RAISE EXCEPTION 'This session uses % (team commitment is not enabled)', v_session.commitment_mode; END IF;
  IF p_agreement NOT IN ('agreed', 'discussed', 'leader') THEN RAISE EXCEPTION 'Invalid agreement'; END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('CEO', 'CFO', 'Product', 'People', 'Growth') THEN RAISE EXCEPTION 'Invalid role'; END IF;
  IF p_quarter <> v_game.completed_quarter + 1 THEN
    IF EXISTS (SELECT 1 FROM v2_quarter_resolutions WHERE team_id = v_team_id AND quarter = p_quarter) THEN
      RETURN json_build_object('phase', v_game.phase, 'changed', false);   -- already resolved: harmless repeat
    END IF;
    RAISE EXCEPTION 'Wrong quarter';
  END IF;
  IF v_game.phase = 'commit' THEN
    IF EXISTS (SELECT 1 FROM v2_commitments WHERE team_id = v_team_id AND quarter = p_quarter) THEN
      RETURN json_build_object('phase', 'commit', 'changed', false);
    END IF;
  ELSIF v_game.phase NOT IN ('risk', 'vote') THEN
    RAISE EXCEPTION 'Phase conflict: team is in %, not ready to commit', v_game.phase;
  END IF;
  IF v_game.draft IS NULL OR v_game.draft->'input' IS NULL THEN RAISE EXCEPTION 'Save the decision before committing'; END IF;
  DELETE FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter;
  INSERT INTO v2_commitments (team_id, quarter, agreement, committed_by) VALUES (v_team_id, p_quarter, p_agreement, p_role)
  ON CONFLICT (team_id, quarter) DO UPDATE SET agreement = EXCLUDED.agreement, committed_by = EXCLUDED.committed_by, created_at = NOW();
  UPDATE v2_team_games SET phase = 'commit', updated_at = NOW() WHERE team_id = v_team_id;
  RETURN json_build_object('phase', 'commit', 'changed', true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_resolve_quarter(
  p_team_code TEXT, p_quarter INT, p_expected_version INT, p_input JSONB, p_snapshot JSONB, p_headline JSONB
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_game v2_team_games%ROWTYPE;
  v_session RECORD;
  v_votes INT;
BEGIN
  SELECT * INTO v_game FROM v2_team_games WHERE team_id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not initialized'; END IF;

  IF EXISTS (SELECT 1 FROM v2_quarter_resolutions WHERE team_id = v_team_id AND quarter = p_quarter) THEN
    RETURN json_build_object('status', 'already_resolved', 'game', v2__game_json(v_team_id));
  END IF;

  SELECT s.* INTO v_session FROM sessions s WHERE s.id = v_game.session_id;
  IF p_quarter <> v_game.completed_quarter + 1 OR p_quarter > 8 THEN RAISE EXCEPTION 'Q% is not the working quarter', p_quarter; END IF;
  IF v_game.state_version <> p_expected_version THEN RAISE EXCEPTION 'Version conflict: expected %, found %', p_expected_version, v_game.state_version; END IF;
  IF v_game.phase <> 'commit' THEN RAISE EXCEPTION 'The team is not ready to commit (phase %)', v_game.phase; END IF;
  IF v_session.v2_pacing = 'facilitator' AND p_quarter > v_session.v2_open_quarter THEN RAISE EXCEPTION 'Q% is not open', p_quarter; END IF;
  IF v_session.commitment_mode = 'private_vote' THEN
    SELECT count(*) INTO v_votes FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter;
    IF v_votes < 5 THEN RAISE EXCEPTION 'All five roles must vote before committing'; END IF;
  ELSIF v_session.commitment_mode = 'team_commitment' THEN
    IF NOT EXISTS (SELECT 1 FROM v2_commitments WHERE team_id = v_team_id AND quarter = p_quarter) THEN
      RAISE EXCEPTION 'The team has not confirmed its commitment';
    END IF;
  END IF;
  IF v_game.draft IS NULL OR v_game.draft->'input' IS DISTINCT FROM p_input THEN
    RAISE EXCEPTION 'The committed decision differs from the decision the team voted on';
  END IF;
  PERFORM v2__check_input(p_quarter, p_input);
  IF p_snapshot->>'schema' <> 'v2-game-snapshot' OR (p_snapshot->>'schemaVersion')::INT <> 1
     OR (p_snapshot->>'completedQuarter')::INT <> p_quarter
     OR jsonb_array_length(p_snapshot->'inputs') <> p_quarter
     OR (p_snapshot->'inputs'->(p_quarter - 1)) IS DISTINCT FROM p_input
     OR (p_snapshot->'inputs') - (p_quarter - 1) IS DISTINCT FROM (v_game.snapshot->'inputs') THEN
    RAISE EXCEPTION 'Snapshot does not extend the stored game with this input';
  END IF;

  INSERT INTO v2_quarter_resolutions (team_id, quarter, input, deliberation, state_version_after)
  VALUES (v_team_id, p_quarter, p_input, v_game.draft->'deliberation', v_game.state_version + 1);
  UPDATE v2_team_games SET
    snapshot = p_snapshot, headline = p_headline, completed_quarter = p_quarter, state_version = state_version + 1,
    phase = 'results', draft = NULL, updated_at = NOW()
  WHERE team_id = v_team_id;
  RETURN json_build_object('status', 'resolved', 'game', v2__game_json(v_team_id));
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Reads: commitment mode + the agreement of resolved quarters (and of the working quarter once committed)
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
      'commitment_mode', s.commitment_mode),
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
          GROUP BY v.quarter) x), '{}'::json),
      'agreements', COALESCE((
        SELECT json_object_agg(c.quarter, json_build_object('agreement', c.agreement, 'committed_by', c.committed_by))
        FROM v2_commitments c
        WHERE c.team_id = t.id AND EXISTS (SELECT 1 FROM v2_quarter_resolutions r WHERE r.team_id = t.id AND r.quarter = c.quarter)), '{}'::json)
    ) ORDER BY t.team_name)
    FROM teams t LEFT JOIN v2_team_games g ON g.team_id = t.id
    WHERE t.session_id = v_session_id), '[]'::json);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION v2_facilitator_set_commitment_mode(TEXT, TEXT, TEXT), v2_confirm_commitment(TEXT, INT, TEXT, TEXT) TO anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
-- v2__game_json stays internal (CREATE OR REPLACE keeps privileges; re-asserted here defensively)
REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
