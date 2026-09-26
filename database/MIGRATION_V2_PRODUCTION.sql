-- ============================================================================
-- MIGRATION: V2 Production Integration (Batch 5 · 5B)
-- ============================================================================
-- Prerequisite: schema.sql + MIGRATION_STRICT_RLS_RPC_ARCHITECTURE.sql (access_codes, block-all RLS, code RPCs).
-- Additive and idempotent: safe to run more than once. V1 tables/RPCs are untouched (V1 remains as a dev fallback).
--
-- STATE MODEL
--   v2_team_games           one row per team: versioned snapshot (schema v2-game-snapshot/1), phase, draft, headline
--   v2_quarter_resolutions  one row per (team, quarter): the committed economic input (replayable source of truth),
--                           the deliberation (belief/risks), the reflection. PRIMARY KEY (team_id, quarter) makes a
--                           second resolution of the same quarter impossible.
--   v2_votes                one row per (team, quarter, role). PRIMARY KEY prevents double voting; votes are only
--                           returned once all five are in. Votes are never read by resolution.
--
-- SECURITY
--   * Block-all RLS on every new table; the browser (anon key) can only call the SECURITY DEFINER RPCs below.
--   * Every RPC validates an active, non-expired access code (team_code, or session_code + admin_pin).
--   * Every RPC pins search_path = public, pg_temp.
--   * Defensive: removes the permissive policies from MIGRATION_FIX_RLS.sql if they were ever applied, and closes
--     access_log (no RLS in schema.sql).
--
-- RESOLUTION (idempotent, single)
--   v2_resolve_quarter locks the team row, returns the stored resolution unchanged if the quarter was already resolved,
--   and otherwise requires: next quarter, expected state_version (compare-and-set), phase 'commit', the quarter open
--   (facilitator pacing), all five votes (team-device mode), the committed input identical to the drafted input the
--   team voted on, and a structurally valid allocation.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Defensive hardening of pre-existing objects
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS sessions_select ON sessions;
DROP POLICY IF EXISTS sessions_insert ON sessions;
DROP POLICY IF EXISTS sessions_update ON sessions;
DROP POLICY IF EXISTS sessions_delete ON sessions;
DROP POLICY IF EXISTS teams_select ON teams;
DROP POLICY IF EXISTS teams_insert ON teams;
DROP POLICY IF EXISTS teams_update ON teams;
DROP POLICY IF EXISTS teams_delete ON teams;
DROP POLICY IF EXISTS decisions_select ON decisions;
DROP POLICY IF EXISTS decisions_insert ON decisions;
DROP POLICY IF EXISTS decisions_update ON decisions;
DROP POLICY IF EXISTS decisions_delete ON decisions;

ALTER TABLE access_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS access_log_block_all ON access_log;
CREATE POLICY access_log_block_all ON access_log FOR ALL USING (false) WITH CHECK (false);

-- ---------------------------------------------------------------------------
-- 1. Session columns
-- ---------------------------------------------------------------------------
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS engine_version VARCHAR(10) NOT NULL DEFAULT 'v1';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS participation_mode VARCHAR(50) DEFAULT 'team_device';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS v2_pacing VARCHAR(20) NOT NULL DEFAULT 'facilitator';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS v2_open_quarter INTEGER NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_engine_version_check CHECK (engine_version IN ('v1', 'v2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_v2_pacing_check CHECK (v2_pacing IN ('facilitator', 'self'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_v2_open_quarter_check CHECK (v2_open_quarter BETWEEN 1 AND 8);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 2. V2 tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS v2_team_games (
  team_id UUID PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL,
  engine_version TEXT NOT NULL,
  state_version INTEGER NOT NULL DEFAULT 0,
  completed_quarter INTEGER NOT NULL DEFAULT 0 CHECK (completed_quarter BETWEEN 0 AND 8),
  phase TEXT NOT NULL DEFAULT 'briefing'
    CHECK (phase IN ('briefing', 'decide', 'belief', 'risk', 'vote', 'commit', 'results', 'reflect', 'final')),
  snapshot JSONB NOT NULL,
  draft JSONB,
  headline JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_v2_team_games_session ON v2_team_games(session_id);

CREATE TABLE IF NOT EXISTS v2_quarter_resolutions (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 8),
  input JSONB NOT NULL,
  deliberation JSONB,
  reflection TEXT,
  state_version_after INTEGER NOT NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, quarter)
);

CREATE TABLE IF NOT EXISTS v2_votes (
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 8),
  role TEXT NOT NULL CHECK (role IN ('CEO', 'CFO', 'Product', 'People', 'Growth')),
  vote TEXT NOT NULL CHECK (vote IN ('support', 'concern', 'oppose')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (team_id, quarter, role)
);

ALTER TABLE v2_team_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_quarter_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE v2_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS v2_team_games_block_all ON v2_team_games;
DROP POLICY IF EXISTS v2_quarter_resolutions_block_all ON v2_quarter_resolutions;
DROP POLICY IF EXISTS v2_votes_block_all ON v2_votes;
CREATE POLICY v2_team_games_block_all ON v2_team_games FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY v2_quarter_resolutions_block_all ON v2_quarter_resolutions FOR ALL USING (false) WITH CHECK (false);
CREATE POLICY v2_votes_block_all ON v2_votes FOR ALL USING (false) WITH CHECK (false);
REVOKE ALL ON v2_team_games, v2_quarter_resolutions, v2_votes FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON v2_team_games, v2_quarter_resolutions, v2_votes FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 3. Internal helpers (not callable by clients)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2__team_id(p_team_code TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code AND ac.code_type = 'team_code' AND ac.active = true
    AND (ac.expires_at IS NULL OR ac.expires_at > NOW());
  IF v_team_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired team code'; END IF;
  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2__facilitator_session(p_session_code TEXT, p_admin_pin TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID;
BEGIN
  SELECT session_id INTO v_session_id FROM access_codes
  WHERE code_value = p_session_code AND code_type = 'session_code' AND active = true
    AND (expires_at IS NULL OR expires_at > NOW());
  IF v_session_id IS NULL THEN RAISE EXCEPTION 'Invalid or expired session code'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM access_codes WHERE session_id = v_session_id AND code_value = p_admin_pin AND code_type = 'admin_pin'
      AND active = true AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN RAISE EXCEPTION 'Invalid admin PIN'; END IF;
  RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

/** Strategic envelope ($M) — mirrors engineV2Final (30; Q8 scale 45 / raise 60). Pinned by a unit test. */
CREATE OR REPLACE FUNCTION v2__envelope(p_quarter INT, p_final_option TEXT)
RETURNS NUMERIC
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_quarter = 8 AND p_final_option = 'scale-independently' THEN 45
    WHEN p_quarter = 8 AND p_final_option = 'raise-growth-capital' THEN 60
    ELSE 30 END::NUMERIC;
$$ LANGUAGE sql IMMUTABLE;

/** Structural validation of an economic input (economic validity is the engine's; tampering is detectable by replay). */
CREATE OR REPLACE FUNCTION v2__check_input(p_quarter INT, p_input JSONB)
RETURNS VOID
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alloc JSONB := p_input->'allocation';
  v_bucket TEXT;
  v_total NUMERIC := 0;
  v_val NUMERIC;
BEGIN
  IF jsonb_typeof(p_input) <> 'object' OR (p_input->>'quarter')::INT IS DISTINCT FROM p_quarter THEN
    RAISE EXCEPTION 'Input quarter does not match Q%', p_quarter;
  END IF;
  IF v_alloc IS NULL OR jsonb_typeof(v_alloc) <> 'object' THEN RAISE EXCEPTION 'Allocation missing'; END IF;
  FOREACH v_bucket IN ARRAY ARRAY['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials', 'cashReserve'] LOOP
    IF jsonb_typeof(v_alloc->v_bucket) <> 'number' THEN RAISE EXCEPTION 'Allocation % must be a number', v_bucket; END IF;
    v_val := (v_alloc->>v_bucket)::NUMERIC;
    IF v_val < 0 THEN RAISE EXCEPTION 'Allocation % must be non-negative', v_bucket; END IF;
    v_total := v_total + v_val;
  END LOOP;
  IF abs(v_total - v2__envelope(p_quarter, p_input->>'finalOption')) > 0.01 THEN
    RAISE EXCEPTION 'Allocation must total the strategic envelope';
  END IF;
  IF p_quarter = 4 AND NOT (p_input->>'destination' = ANY (ARRAY['consumer-ai', 'enterprise-ai', 'premium-human-ai', 'university-infrastructure', 'balanced-marketplace'])) THEN
    RAISE EXCEPTION 'Q4 requires a strategic destination';
  END IF;
  IF p_quarter <> 4 AND p_input ? 'destination' THEN RAISE EXCEPTION 'A destination can only be chosen in Q4'; END IF;
  IF p_quarter = 5 AND jsonb_typeof(p_input->'opportunity'->'accept') <> 'boolean' THEN RAISE EXCEPTION 'Q5 requires accept/decline'; END IF;
  IF p_quarter = 7 AND NOT (p_input->>'crisisResponse' = ANY (ARRAY['remediate', 'contain', 'absorb'])) THEN RAISE EXCEPTION 'Q7 requires a crisis response'; END IF;
  IF p_quarter = 8 AND NOT (p_input->>'finalOption' = ANY (ARRAY['continue', 'scale-independently', 'raise-growth-capital', 'acquire-consolidate', 'strategic-sale', 'stabilize-restructure'])) THEN
    RAISE EXCEPTION 'Q8 requires a final strategic option';
  END IF;
END;
$$ LANGUAGE plpgsql;

REVOKE ALL ON FUNCTION v2__team_id(TEXT), v2__facilitator_session(TEXT, TEXT), v2__envelope(INT, TEXT), v2__check_input(INT, JSONB) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v2__team_id(TEXT), v2__facilitator_session(TEXT, TEXT), v2__envelope(INT, TEXT), v2__check_input(INT, JSONB) FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Shared read model returned by team RPCs (private: no role briefs, no other teams)
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
      'pacing', s.v2_pacing, 'open_quarter', s.v2_open_quarter),
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
REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 4. Facilitator RPCs
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
BEGIN
  IF p_participation_mode NOT IN ('team_device', 'individual_device', 'voting_disabled') THEN RAISE EXCEPTION 'Invalid participation mode'; END IF;
  IF p_pacing NOT IN ('facilitator', 'self') THEN RAISE EXCEPTION 'Invalid pacing'; END IF;
  IF p_team_names IS NULL OR array_length(p_team_names, 1) IS NULL OR array_length(p_team_names, 1) > 30 THEN RAISE EXCEPTION 'Between 1 and 30 teams required'; END IF;
  v_created := create_session(p_facilitator_email, array_length(p_team_names, 1));
  v_session_id := (v_created->>'session_id')::UUID;
  UPDATE sessions SET engine_version = 'v2', participation_mode = p_participation_mode, v2_pacing = p_pacing, v2_open_quarter = 1,
    game_phase = 'v2-play', current_quarter = 1
  WHERE id = v_session_id;
  FOREACH v_name IN ARRAY p_team_names LOOP
    v_teams := v_teams || create_team_with_code(v_created->>'session_code', v_created->>'admin_pin', left(v_name, 100));
  END LOOP;
  RETURN json_build_object('session_id', v_session_id, 'session_code', v_created->>'session_code', 'admin_pin', v_created->>'admin_pin',
    'engine_version', 'v2', 'participation_mode', p_participation_mode, 'pacing', p_pacing, 'teams', to_json(v_teams));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_facilitator_overview(p_session_code TEXT, p_admin_pin TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  -- Facilitator-safe: headline only. Never the snapshot, the draft (belief/risks in progress), role briefs or vote values.
  RETURN (
    SELECT json_build_object(
      'session_id', s.id, 'session_code', s.session_code, 'engine_version', s.engine_version,
      'participation_mode', s.participation_mode, 'pacing', s.v2_pacing, 'open_quarter', s.v2_open_quarter,
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

CREATE OR REPLACE FUNCTION v2_facilitator_set_open_quarter(p_session_code TEXT, p_admin_pin TEXT, p_quarter INT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  IF p_quarter < 1 OR p_quarter > 8 THEN RAISE EXCEPTION 'Quarter must be 1–8'; END IF;
  UPDATE sessions SET v2_open_quarter = p_quarter, current_quarter = p_quarter, updated_at = NOW() WHERE id = v_session_id AND engine_version = 'v2';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a V2 session'; END IF;
  RETURN json_build_object('open_quarter', p_quarter);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_facilitator_set_pacing(p_session_code TEXT, p_admin_pin TEXT, p_pacing TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_session_id UUID := v2__facilitator_session(p_session_code, p_admin_pin);
BEGIN
  IF p_pacing NOT IN ('facilitator', 'self') THEN RAISE EXCEPTION 'Invalid pacing'; END IF;
  UPDATE sessions SET v2_pacing = p_pacing, updated_at = NOW() WHERE id = v_session_id AND engine_version = 'v2';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not a V2 session'; END IF;
  RETURN json_build_object('pacing', p_pacing);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 5. Team RPCs
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v2_join(p_session_code TEXT, p_team_code TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_joined JSON := join_session(p_session_code, p_team_code);
BEGIN
  RETURN v2__game_json((v_joined->>'team_id')::UUID);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION v2_get_game(p_team_code TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN v2__game_json(v2__team_id(p_team_code));
END;
$$ LANGUAGE plpgsql;

/** Create the team's game from the initial snapshot. Idempotent: an existing game is returned unchanged. */
CREATE OR REPLACE FUNCTION v2_init_game(p_team_code TEXT, p_snapshot JSONB, p_headline JSONB)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_session RECORD;
BEGIN
  SELECT s.* INTO v_session FROM sessions s JOIN teams t ON t.session_id = s.id WHERE t.id = v_team_id;
  IF v_session.engine_version <> 'v2' THEN RAISE EXCEPTION 'Not a V2 session'; END IF;
  IF p_snapshot->>'schema' <> 'v2-game-snapshot' OR (p_snapshot->>'schemaVersion')::INT <> 1
     OR (p_snapshot->>'completedQuarter')::INT <> 0 OR jsonb_array_length(p_snapshot->'inputs') <> 0 THEN
    RAISE EXCEPTION 'Invalid initial snapshot';
  END IF;
  INSERT INTO v2_team_games (team_id, session_id, schema_version, engine_version, snapshot, headline)
  VALUES (v_team_id, v_session.id, 1, p_snapshot->>'engineVersion', p_snapshot, p_headline)
  ON CONFLICT (team_id) DO NOTHING;
  RETURN v2__game_json(v_team_id);
END;
$$ LANGUAGE plpgsql;

/** Save the working quarter's draft (decision in progress, deliberation, briefing progress). Locked from 'vote' on. */
CREATE OR REPLACE FUNCTION v2_save_draft(p_team_code TEXT, p_quarter INT, p_draft JSONB)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_game v2_team_games%ROWTYPE;
BEGIN
  SELECT * INTO v_game FROM v2_team_games WHERE team_id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not initialized'; END IF;
  IF p_quarter <> v_game.completed_quarter + 1 THEN RAISE EXCEPTION 'Draft is for Q%, working quarter is Q%', p_quarter, v_game.completed_quarter + 1; END IF;
  IF v_game.phase NOT IN ('briefing', 'decide', 'belief', 'risk') THEN RAISE EXCEPTION 'Decision is locked in phase %', v_game.phase; END IF;
  IF octet_length(p_draft::TEXT) > 200000 THEN RAISE EXCEPTION 'Draft too large'; END IF;
  UPDATE v2_team_games SET draft = p_draft || jsonb_build_object('quarter', p_quarter), updated_at = NOW() WHERE team_id = v_team_id;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql;

/**
 * Move through the classroom loop. Idempotent when the team is already in p_to. Moving back from 'vote'/'commit'
 * to an editing phase clears that quarter's votes (the team re-votes on the changed decision).
 */
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
      OR (p_to = 'vote' AND v_session.participation_mode <> 'voting_disabled')
      OR (p_to = 'commit' AND v_session.participation_mode = 'voting_disabled')
    WHEN p_from = 'vote' THEN p_to IN ('commit', 'decide', 'belief', 'risk')
    WHEN p_from = 'commit' THEN p_to IN ('decide', 'belief', 'risk')
    WHEN p_from = 'results' THEN p_to = 'reflect'
    WHEN p_from = 'reflect' THEN p_to IN ('briefing', 'final')
    ELSE false END;
  IF NOT v_ok THEN RAISE EXCEPTION 'Transition % → % not allowed', p_from, p_to; END IF;

  IF p_to IN ('vote', 'commit') AND (v_game.draft IS NULL OR v_game.draft->'input' IS NULL) THEN RAISE EXCEPTION 'Save the decision before voting or committing'; END IF;
  IF p_to = 'commit' AND v_session.participation_mode <> 'voting_disabled' THEN
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
  END IF;

  UPDATE v2_team_games SET phase = p_to, updated_at = NOW() WHERE team_id = v_team_id;
  RETURN json_build_object('phase', p_to, 'changed', true);
END;
$$ LANGUAGE plpgsql;

/** One private vote per role per quarter (no overwrite). */
CREATE OR REPLACE FUNCTION v2_submit_vote(p_team_code TEXT, p_quarter INT, p_role TEXT, p_vote TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_game v2_team_games%ROWTYPE;
  v_count INT;
BEGIN
  SELECT * INTO v_game FROM v2_team_games WHERE team_id = v_team_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Game not initialized'; END IF;
  IF v_game.phase <> 'vote' OR p_quarter <> v_game.completed_quarter + 1 THEN RAISE EXCEPTION 'Voting is not open'; END IF;
  BEGIN
    INSERT INTO v2_votes (team_id, quarter, role, vote) VALUES (v_team_id, p_quarter, p_role, p_vote);
  EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION '% has already voted', p_role;
  END;
  SELECT count(*) INTO v_count FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter;
  RETURN json_build_object('submitted', v_count);
END;
$$ LANGUAGE plpgsql;

/** Who has voted is visible; how anyone voted is returned only once all five votes are in. */
CREATE OR REPLACE FUNCTION v2_get_votes(p_team_code TEXT, p_quarter INT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_team_id UUID := v2__team_id(p_team_code);
  v_count INT;
BEGIN
  SELECT count(*) INTO v_count FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter;
  RETURN json_build_object(
    'quarter', p_quarter,
    'submitted_roles', COALESCE((SELECT json_agg(role ORDER BY created_at) FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter), '[]'::json),
    'revealed', v_count >= 5,
    'votes', CASE WHEN v_count >= 5 THEN (SELECT json_object_agg(role, vote) FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter) ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql;

/**
 * Commit and resolve the working quarter exactly once. The client computed the next snapshot with the frozen engine
 * (deterministic); the server enforces sequencing, compare-and-set versioning and single resolution.
 * Returns {status: 'resolved' | 'already_resolved', game}.
 */
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

  -- Idempotency: a quarter that is already resolved is returned unchanged (never resolved twice).
  IF EXISTS (SELECT 1 FROM v2_quarter_resolutions WHERE team_id = v_team_id AND quarter = p_quarter) THEN
    RETURN json_build_object('status', 'already_resolved', 'game', v2__game_json(v_team_id));
  END IF;

  SELECT s.* INTO v_session FROM sessions s WHERE s.id = v_game.session_id;
  IF p_quarter <> v_game.completed_quarter + 1 OR p_quarter > 8 THEN RAISE EXCEPTION 'Q% is not the working quarter', p_quarter; END IF;
  IF v_game.state_version <> p_expected_version THEN RAISE EXCEPTION 'Version conflict: expected %, found %', p_expected_version, v_game.state_version; END IF;
  IF v_game.phase <> 'commit' THEN RAISE EXCEPTION 'The team is not ready to commit (phase %)', v_game.phase; END IF;
  IF v_session.v2_pacing = 'facilitator' AND p_quarter > v_session.v2_open_quarter THEN RAISE EXCEPTION 'Q% is not open', p_quarter; END IF;
  IF v_session.participation_mode <> 'voting_disabled' THEN
    SELECT count(*) INTO v_votes FROM v2_votes WHERE team_id = v_team_id AND quarter = p_quarter;
    IF v_votes < 5 THEN RAISE EXCEPTION 'All five roles must vote before committing'; END IF;
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

CREATE OR REPLACE FUNCTION v2_save_reflection(p_team_code TEXT, p_quarter INT, p_reflection TEXT)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_team_id UUID := v2__team_id(p_team_code);
BEGIN
  UPDATE v2_quarter_resolutions SET reflection = left(p_reflection, 4000) WHERE team_id = v_team_id AND quarter = p_quarter;
  IF NOT FOUND THEN RAISE EXCEPTION 'Q% has not been resolved', p_quarter; END IF;
  RETURN json_build_object('ok', true);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 6. Grants: the public (anon) client may execute the RPCs only.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION
    v2_create_session(TEXT, TEXT[], TEXT, TEXT), v2_facilitator_overview(TEXT, TEXT), v2_facilitator_set_open_quarter(TEXT, TEXT, INT),
    v2_facilitator_set_pacing(TEXT, TEXT, TEXT), v2_join(TEXT, TEXT), v2_get_game(TEXT), v2_init_game(TEXT, JSONB, JSONB),
    v2_save_draft(TEXT, INT, JSONB), v2_set_phase(TEXT, INT, TEXT, TEXT), v2_submit_vote(TEXT, INT, TEXT, TEXT),
    v2_get_votes(TEXT, INT), v2_resolve_quarter(TEXT, INT, INT, JSONB, JSONB, JSONB), v2_save_reflection(TEXT, INT, TEXT)
  TO anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
