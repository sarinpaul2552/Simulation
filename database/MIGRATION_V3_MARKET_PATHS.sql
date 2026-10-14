-- ============================================================================
-- MIGRATION: NexLearn V3 — economic engine selection and market paths (Batch 10D)
-- ============================================================================
-- Prerequisites, in order: MIGRATION_V2_PRODUCTION.sql, MIGRATION_V2_BATCH7_EXPERIENCE.sql,
-- MIGRATION_V2_BATCH7_5_COMMITMENT.sql.
--
-- STATUS: prepared and tested ONLY on the disposable local database (scripts/v2-local/up.sh).
--         NOT applied to any shared or production Supabase project. Applying it requires approval.
--
-- Additive and idempotent. No existing row changes meaning:
--   sessions.econ_engine   'v2' (default; every existing session) | 'v3'
--   sessions.market_path   NULL for V2 sessions; 'A' | 'B' | 'C' for V3 sessions (exactly when econ_engine = 'v3')
-- A V3 session keeps engine_version = 'v2' (the V2 platform: same tables, same RPCs, same classroom loop); only its
-- economics (client engine 'v3-econ-1.0') and market path differ.
--
--   v3_create_session(email, team_names, participation, pacing, market_path)  — new; wraps v2_create_session
--   v2_create_session     same behaviour; retried on an access-code collision (defect fix, see below)
--   sessions trigger      econ_engine / market_path can be set only before any team has started; then immutable
--   v2_init_game          the initial snapshot's engineVersion (and marketPath) must match the session
--   v2_resolve_quarter    the snapshot's engineVersion and marketPath must match the session; V3 inputs are checked by
--                         v3__check_input (budget = base + financed expansion ≤ $10M, Q2–Q7; Q6 recession stance);
--                         V2 inputs may not carry V3-only fields. All other checks are unchanged.
--   v2__game_json / v2_facilitator_overview   also return econ_engine and market_path
-- Existing V2 sessions: unchanged behaviour (verified by the V2 database tests after this migration).
-- ============================================================================

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS econ_engine VARCHAR(4) NOT NULL DEFAULT 'v2';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS market_path CHAR(1);
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_econ_engine_check CHECK (econ_engine IN ('v2', 'v3'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE sessions ADD CONSTRAINT sessions_market_path_check CHECK (
    (econ_engine = 'v2' AND market_path IS NULL) OR (econ_engine = 'v3' AND market_path IN ('A', 'B', 'C') AND engine_version = 'v2'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Immutability: the engine and path are chosen before the session starts and never change afterwards.
-- The only allowed change is V2 → V3 (with a path) while no team has started a game (session creation).
-- ---------------------------------------------------------------------------
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
DROP TRIGGER IF EXISTS v3_guard_session_economics ON sessions;
CREATE TRIGGER v3_guard_session_economics BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION v3__guard_session_economics();

-- ---------------------------------------------------------------------------
-- Session creation. Defect fix (found in Batch 10F): admin PINs are four digits and every active access code must be
-- unique, so after a few hundred sessions a new session can fail with a duplicate-key error. The Batch 7.5 body is
-- unchanged; it is retried (up to 8 times, each attempt in its own sub-transaction) on a unique-key collision.
-- Authentication is unchanged: same codes, same PIN format, same checks.
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
  v_teams JSON[];
  v_name TEXT;
  v_commit TEXT := CASE WHEN p_participation_mode = 'voting_disabled' THEN 'none' ELSE 'team_commitment' END;
  v_attempt INT := 0;
BEGIN
  IF p_participation_mode NOT IN ('team_device', 'individual_device', 'voting_disabled') THEN RAISE EXCEPTION 'Invalid participation mode'; END IF;
  IF p_pacing NOT IN ('facilitator', 'self') THEN RAISE EXCEPTION 'Invalid pacing'; END IF;
  IF p_team_names IS NULL OR array_length(p_team_names, 1) IS NULL OR array_length(p_team_names, 1) > 30 THEN RAISE EXCEPTION 'Between 1 and 30 teams required'; END IF;
  LOOP
    v_attempt := v_attempt + 1;
    BEGIN
      v_teams := ARRAY[]::JSON[];
      v_created := create_session(p_facilitator_email, array_length(p_team_names, 1));
      v_session_id := (v_created->>'session_id')::UUID;
      UPDATE sessions SET engine_version = 'v2', participation_mode = p_participation_mode, v2_pacing = p_pacing, v2_open_quarter = 1,
        game_phase = 'v2-play', current_quarter = 1, commitment_mode = v_commit
      WHERE id = v_session_id;
      FOREACH v_name IN ARRAY p_team_names LOOP
        v_teams := v_teams || create_team_with_code(v_created->>'session_code', v_created->>'admin_pin', left(v_name, 100));
      END LOOP;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt >= 8 THEN RAISE; END IF;
    END;
  END LOOP;
  RETURN json_build_object('session_id', v_session_id, 'session_code', v_created->>'session_code', 'admin_pin', v_created->>'admin_pin',
    'engine_version', 'v2', 'participation_mode', p_participation_mode, 'pacing', p_pacing, 'commitment_mode', v_commit,
    'teams', to_json(v_teams));
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Session creation (V3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v3_create_session(
  p_facilitator_email TEXT, p_team_names TEXT[], p_participation_mode TEXT DEFAULT 'team_device', p_pacing TEXT DEFAULT 'facilitator',
  p_market_path TEXT DEFAULT 'A'
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_created JSON;
BEGIN
  IF p_market_path IS NULL OR p_market_path NOT IN ('A', 'B', 'C') THEN RAISE EXCEPTION 'Invalid market path'; END IF;
  v_created := v2_create_session(p_facilitator_email, p_team_names, p_participation_mode, p_pacing);
  UPDATE sessions SET econ_engine = 'v3', market_path = p_market_path WHERE id = (v_created->>'session_id')::UUID;
  RETURN (v_created::JSONB || jsonb_build_object('econ_engine', 'v3', 'market_path', p_market_path))::JSON;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- V3 structural input check (economic validity is the engine's; tampering is detectable by replay)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION v3__check_input(p_quarter INT, p_input JSONB)
RETURNS VOID
SET search_path = public, pg_temp
AS $$
DECLARE
  v_alloc JSONB := p_input->'allocation';
  v_bucket TEXT;
  v_total NUMERIC := 0;
  v_val NUMERIC;
  v_exp NUMERIC := 0;
BEGIN
  IF jsonb_typeof(p_input) <> 'object' OR (p_input->>'quarter')::INT IS DISTINCT FROM p_quarter THEN
    RAISE EXCEPTION 'Input quarter does not match Q%', p_quarter;
  END IF;
  IF p_input ? 'expansion' THEN
    IF jsonb_typeof(p_input->'expansion') <> 'number' THEN RAISE EXCEPTION 'Budget expansion must be a number'; END IF;
    v_exp := (p_input->>'expansion')::NUMERIC;
    IF v_exp <= 0 OR v_exp > 10 OR p_quarter NOT BETWEEN 2 AND 7 THEN RAISE EXCEPTION 'Budget expansion is not allowed here'; END IF;
  END IF;
  IF v_alloc IS NULL OR jsonb_typeof(v_alloc) <> 'object' THEN RAISE EXCEPTION 'Allocation missing'; END IF;
  FOREACH v_bucket IN ARRAY ARRAY['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials', 'cashReserve'] LOOP
    IF jsonb_typeof(v_alloc->v_bucket) <> 'number' THEN RAISE EXCEPTION 'Allocation % must be a number', v_bucket; END IF;
    v_val := (v_alloc->>v_bucket)::NUMERIC;
    IF v_val < 0 THEN RAISE EXCEPTION 'Allocation % must be non-negative', v_bucket; END IF;
    v_total := v_total + v_val;
  END LOOP;
  IF abs(v_total - (v2__envelope(p_quarter, p_input->>'finalOption') + v_exp)) > 0.01 THEN
    RAISE EXCEPTION 'Allocation must total the strategic budget';
  END IF;
  IF p_quarter = 4 AND NOT (p_input->>'destination' = ANY (ARRAY['consumer-ai', 'enterprise-ai', 'premium-human-ai', 'university-infrastructure', 'balanced-marketplace'])) THEN
    RAISE EXCEPTION 'Q4 requires a strategic destination';
  END IF;
  IF p_quarter <> 4 AND p_input ? 'destination' THEN RAISE EXCEPTION 'A destination can only be chosen in Q4'; END IF;
  IF p_quarter = 5 AND jsonb_typeof(p_input->'opportunity'->'accept') <> 'boolean' THEN RAISE EXCEPTION 'Q5 requires accept/decline'; END IF;
  IF p_quarter = 6 AND NOT (p_input->>'recessionStance' = ANY (ARRAY['protect', 'slow', 'cut'])) THEN RAISE EXCEPTION 'Q6 requires a recession stance'; END IF;
  IF p_quarter <> 6 AND p_input ? 'recessionStance' THEN RAISE EXCEPTION 'A recession stance is only chosen in Q6'; END IF;
  IF p_quarter = 7 AND NOT (p_input->>'crisisResponse' = ANY (ARRAY['remediate', 'contain', 'absorb'])) THEN RAISE EXCEPTION 'Q7 requires a crisis response'; END IF;
  IF p_quarter = 8 AND NOT (p_input->>'finalOption' = ANY (ARRAY['continue', 'scale-independently', 'raise-growth-capital', 'acquire-consolidate', 'strategic-sale', 'stabilize-restructure'])) THEN
    RAISE EXCEPTION 'Q8 requires a final strategic option';
  END IF;
END;
$$ LANGUAGE plpgsql;

/** The snapshot's engine must match the session: V2 sessions 'v2-econ-batch4-frozen' without a path; V3 sessions 'v3-econ-1.0' with the session's path. */
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

REVOKE ALL ON FUNCTION v3__check_input(INT, JSONB), v3__check_snapshot_engine(UUID, JSONB), v3__guard_session_economics() FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v3__check_input(INT, JSONB), v3__check_snapshot_engine(UUID, JSONB), v3__guard_session_economics() FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Game initialization: same as V2, plus the engine/path match.
-- ---------------------------------------------------------------------------
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
  PERFORM v3__check_snapshot_engine(v_session.id, p_snapshot);
  INSERT INTO v2_team_games (team_id, session_id, schema_version, engine_version, snapshot, headline)
  VALUES (v_team_id, v_session.id, 1, p_snapshot->>'engineVersion', p_snapshot, p_headline)
  ON CONFLICT (team_id) DO NOTHING;
  RETURN v2__game_json(v_team_id);
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Quarter resolution: the Batch 7.5 definition, plus the engine/path match and the V3 input check.
-- ---------------------------------------------------------------------------
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
  IF v_session.econ_engine = 'v3' THEN
    PERFORM v3__check_input(p_quarter, p_input);
  ELSE
    IF p_input ? 'expansion' OR p_input ? 'recessionStance' THEN RAISE EXCEPTION 'This decision is not available in this session'; END IF;
    PERFORM v2__check_input(p_quarter, p_input);
  END IF;
  PERFORM v3__check_snapshot_engine(v_session.id, p_snapshot);
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
-- Reads: the Batch 7.5 definitions plus econ_engine and market_path.
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

-- Grants: the new public RPC only; internal helpers stay private.
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION v3_create_session(TEXT, TEXT[], TEXT, TEXT, TEXT) TO anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION v2__game_json(UUID) FROM anon, authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
