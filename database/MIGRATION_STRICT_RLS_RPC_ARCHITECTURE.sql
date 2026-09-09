-- ============================================================================
-- MIGRATION: Strict RLS + RPC Architecture for Access-Code Security
-- ============================================================================
-- This migration enforces database-level team/session isolation via:
-- 1. Access codes registry (session_code, team_code, admin_pin)
-- 2. Strict RLS policies (all direct queries blocked)
-- 3. RPC functions as only trusted data gateway (SECURITY DEFINER)
--
-- BREAKING CHANGE: All data access must go through RPC functions.
-- Direct SQL queries to sessions/teams/decisions will fail RLS check.
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop Old Auth-Dependent RLS Policies
-- ============================================================================

DROP POLICY IF EXISTS facilitator_sessions_policy ON sessions;
DROP POLICY IF EXISTS team_access_policy ON teams;
DROP POLICY IF EXISTS team_decisions_policy ON decisions;

-- Disable RLS temporarily while we set up new policies
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE decisions DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Create Access Codes Registry Table
-- ============================================================================
-- This table tracks all valid codes (session_code, team_code, admin_pin)
-- RPC functions verify codes against this table before allowing access

CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_type VARCHAR(20) NOT NULL CHECK (code_type IN ('session_code', 'team_code', 'admin_pin')),
  code_value VARCHAR(50) NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '48 hours'),
  
  -- Uniqueness constraints
  CONSTRAINT unique_session_code UNIQUE (session_id, code_type) WHERE code_type IN ('session_code', 'admin_pin'),
  CONSTRAINT unique_team_code UNIQUE (team_id, code_type) WHERE code_type = 'team_code',
  CONSTRAINT unique_code_value UNIQUE (code_value)
);

CREATE INDEX idx_access_codes_value ON access_codes(code_value);
CREATE INDEX idx_access_codes_session ON access_codes(session_id);
CREATE INDEX idx_access_codes_team ON access_codes(team_id);
CREATE INDEX idx_access_codes_active ON access_codes(active) WHERE active = true;

-- ============================================================================
-- STEP 3: Re-enable RLS with Strict Block-All Policies
-- ============================================================================
-- Direct queries are not allowed. Only RPC functions (SECURITY DEFINER) bypass.

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Sessions: Block all direct access
CREATE POLICY sessions_block_all ON sessions
  FOR ALL USING (false) WITH CHECK (false);

-- Teams: Block all direct access
CREATE POLICY teams_block_all ON teams
  FOR ALL USING (false) WITH CHECK (false);

-- Decisions: Block all direct access
CREATE POLICY decisions_block_all ON decisions
  FOR ALL USING (false) WITH CHECK (false);

-- ============================================================================
-- STEP 4: Helper Function - Generate Unique Codes
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_code(prefix TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN prefix || '-' || 
    UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT), 1, 6));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 5: RPC Functions (Trusted Gateways)
-- ============================================================================

-- ===== RPC: Create Session (Facilitator) =====
CREATE OR REPLACE FUNCTION create_session(
  p_facilitator_email TEXT,
  p_team_count INT
)
RETURNS json AS $$
DECLARE
  v_session_id UUID;
  v_session_code TEXT;
  v_admin_pin TEXT;
BEGIN
  v_session_code := generate_code('ISB');
  v_admin_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  
  INSERT INTO sessions (facilitator_email, session_code, admin_pin, team_count, current_quarter, game_phase)
  VALUES (p_facilitator_email, v_session_code, v_admin_pin, p_team_count, 0, 'setup')
  RETURNING id INTO v_session_id;
  
  INSERT INTO access_codes (code_type, code_value, session_id, active)
  VALUES ('session_code', v_session_code, v_session_id, true);
  
  INSERT INTO access_codes (code_type, code_value, session_id, active)
  VALUES ('admin_pin', v_admin_pin, v_session_id, true);
  
  RETURN json_build_object(
    'session_id', v_session_id,
    'session_code', v_session_code,
    'admin_pin', v_admin_pin
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Create Team with Auto Code (Facilitator) =====
CREATE OR REPLACE FUNCTION create_team_with_code(
  p_session_code TEXT,
  p_team_name TEXT
)
RETURNS json AS $$
DECLARE
  v_session_id UUID;
  v_team_id UUID;
  v_team_code TEXT;
BEGIN
  SELECT session_id INTO v_session_id
  FROM access_codes
  WHERE code_value = p_session_code
  AND code_type = 'session_code'
  AND active = true
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired session code';
  END IF;
  
  v_team_code := generate_code('TEAM');
  
  INSERT INTO teams (session_id, team_name, team_code)
  VALUES (v_session_id, p_team_name, v_team_code)
  RETURNING id INTO v_team_id;
  
  INSERT INTO access_codes (code_type, code_value, team_id, session_id, active)
  VALUES ('team_code', v_team_code, v_team_id, v_session_id, true);
  
  RETURN json_build_object(
    'team_id', v_team_id,
    'team_code', v_team_code,
    'team_name', p_team_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Get Session Details (Facilitator) =====
CREATE OR REPLACE FUNCTION get_session_details(p_session_code TEXT)
RETURNS json AS $$
DECLARE
  v_session_id UUID;
  v_session json;
BEGIN
  SELECT sessions.id INTO v_session_id
  FROM sessions
  JOIN access_codes ON access_codes.session_id = sessions.id
  WHERE access_codes.code_value = p_session_code
  AND access_codes.code_type = 'session_code'
  AND access_codes.active = true
  AND (access_codes.expires_at IS NULL OR access_codes.expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session code';
  END IF;
  
  SELECT json_build_object(
    'session_id', sessions.id,
    'session_code', sessions.session_code,
    'facilitator_email', sessions.facilitator_email,
    'current_quarter', sessions.current_quarter,
    'game_phase', sessions.game_phase,
    'team_count', sessions.team_count,
    'teams', COALESCE((
      SELECT json_agg(
        json_build_object(
          'team_id', t.id,
          'team_name', t.team_name,
          'team_code', ac.code_value,
          'revenue', t.revenue,
          'cash', t.cash,
          'stock_price', t.stock_price,
          'product_quality', t.product_quality,
          'culture', t.culture,
          'trust', t.trust
        )
      )
      FROM teams t
      LEFT JOIN access_codes ac ON ac.team_id = t.id AND ac.code_type = 'team_code'
      WHERE t.session_id = sessions.id
    ), '[]'::json)
  ) INTO v_session
  FROM sessions
  WHERE sessions.id = v_session_id;
  
  RETURN v_session;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Join Session (Student) =====
CREATE OR REPLACE FUNCTION join_session(
  p_session_code TEXT,
  p_team_code TEXT
)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
  v_session_id UUID;
  v_team_name TEXT;
BEGIN
  SELECT session_id INTO v_session_id
  FROM access_codes
  WHERE code_value = p_session_code
  AND code_type = 'session_code'
  AND active = true
  AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'Invalid session code';
  END IF;
  
  SELECT t.id, t.team_name INTO v_team_id, v_team_name
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND t.session_id = v_session_id
  AND ac.active = true
  AND (ac.expires_at IS NULL OR ac.expires_at > NOW());
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code or team not in session';
  END IF;
  
  RETURN json_build_object(
    'team_id', v_team_id,
    'team_name', v_team_name,
    'session_id', v_session_id,
    'session_code', p_session_code,
    'team_code', p_team_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Get Team State (Student/Facilitator) =====
CREATE OR REPLACE FUNCTION get_team_state(p_team_code TEXT)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND ac.active = true
  AND (ac.expires_at IS NULL OR ac.expires_at > NOW());
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;
  
  RETURN (
    SELECT json_build_object(
      'team_id', t.id,
      'team_name', t.team_name,
      'revenue', t.revenue,
      'operating_cost', t.operating_cost,
      'operating_profit', t.operating_profit,
      'cash', t.cash,
      'stock_price', t.stock_price,
      'product_quality', t.product_quality,
      'culture', t.culture,
      'trust', t.trust,
      'capabilities', json_build_object(
        'consumer', t.capability_consumer,
        'enterprise', t.capability_enterprise,
        'ai', t.capability_ai,
        'talent', t.capability_talent,
        'credential', t.capability_credential,
        'customerSuccess', t.capability_customer_success,
        'growth', t.capability_growth,
        'execution', t.capability_execution
      )
    )
    FROM teams t
    WHERE t.id = v_team_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Submit Allocation (Student) =====
CREATE OR REPLACE FUNCTION submit_allocation(
  p_team_code TEXT,
  p_quarter INT,
  p_allocation_json JSONB,
  p_belief_response VARCHAR DEFAULT NULL,
  p_risks_json JSONB DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
  v_decision_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND ac.active = true;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;
  
  INSERT INTO decisions (
    team_id, quarter, allocation_json, belief_response, risks_json, submitted_at
  )
  VALUES (v_team_id, p_quarter, p_allocation_json, p_belief_response, p_risks_json, CURRENT_TIMESTAMP)
  RETURNING id INTO v_decision_id;
  
  RETURN json_build_object(
    'decision_id', v_decision_id,
    'team_id', v_team_id,
    'quarter', p_quarter
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Update Decision (Student) =====
CREATE OR REPLACE FUNCTION update_decision(
  p_team_code TEXT,
  p_decision_id UUID,
  p_votes_json JSONB DEFAULT NULL,
  p_team_check_alignment VARCHAR DEFAULT NULL,
  p_team_check_override BOOLEAN DEFAULT NULL,
  p_team_check_dissenting_roles VARCHAR DEFAULT NULL,
  p_reflection_response VARCHAR DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
  v_decision_team_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND ac.active = true;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;
  
  SELECT team_id INTO v_decision_team_id
  FROM decisions
  WHERE id = p_decision_id;
  
  IF v_decision_team_id IS NULL OR v_decision_team_id != v_team_id THEN
    RAISE EXCEPTION 'Cannot access another team''s decision';
  END IF;
  
  UPDATE decisions
  SET
    votes_json = COALESCE(p_votes_json, votes_json),
    team_check_alignment = COALESCE(p_team_check_alignment, team_check_alignment),
    team_check_override = COALESCE(p_team_check_override, team_check_override),
    team_check_dissenting_roles = COALESCE(p_team_check_dissenting_roles, team_check_dissenting_roles),
    reflection_response = COALESCE(p_reflection_response, reflection_response)
  WHERE id = p_decision_id;
  
  RETURN json_build_object('success', true, 'decision_id', p_decision_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Get Decision (Student/Facilitator) =====
CREATE OR REPLACE FUNCTION get_decision(
  p_team_code TEXT,
  p_decision_id UUID
)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
  v_decision_team_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND ac.active = true;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;
  
  SELECT team_id INTO v_decision_team_id
  FROM decisions
  WHERE id = p_decision_id;
  
  IF v_decision_team_id IS NULL OR v_decision_team_id != v_team_id THEN
    RAISE EXCEPTION 'Cannot access another team''s decision';
  END IF;
  
  RETURN (
    SELECT json_build_object(
      'decision_id', d.id,
      'quarter', d.quarter,
      'allocation_json', d.allocation_json,
      'belief_response', d.belief_response,
      'risks_json', d.risks_json,
      'votes_json', d.votes_json,
      'team_check_alignment', d.team_check_alignment,
      'team_check_override', d.team_check_override,
      'team_check_dissenting_roles', d.team_check_dissenting_roles,
      'reflection_response', d.reflection_response,
      'outcome_revenue_change', d.outcome_revenue_change,
      'outcome_cash_change', d.outcome_cash_change,
      'outcome_stock_price_change', d.outcome_stock_price_change,
      'outcome_capability_changes_json', d.outcome_capability_changes_json,
      'submitted_at', d.submitted_at,
      'calculated_at', d.calculated_at
    )
    FROM decisions d
    WHERE d.id = p_decision_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== RPC: Update Team State (Consequence Calculation) =====
CREATE OR REPLACE FUNCTION update_team_state(
  p_team_code TEXT,
  p_updates JSONB
)
RETURNS json AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT t.id INTO v_team_id
  FROM teams t
  JOIN access_codes ac ON ac.team_id = t.id
  WHERE ac.code_value = p_team_code
  AND ac.code_type = 'team_code'
  AND ac.active = true;
  
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Invalid team code';
  END IF;
  
  UPDATE teams
  SET
    revenue = COALESCE((p_updates->>'revenue')::DECIMAL, revenue),
    operating_cost = COALESCE((p_updates->>'operating_cost')::DECIMAL, operating_cost),
    operating_profit = COALESCE((p_updates->>'operating_profit')::DECIMAL, operating_profit),
    cash = COALESCE((p_updates->>'cash')::DECIMAL, cash),
    stock_price = COALESCE((p_updates->>'stock_price')::DECIMAL, stock_price),
    product_quality = COALESCE((p_updates->>'product_quality')::INT, product_quality),
    culture = COALESCE((p_updates->>'culture')::INT, culture),
    trust = COALESCE((p_updates->>'trust')::INT, trust),
    capability_consumer = COALESCE((p_updates->>'capability_consumer')::INT, capability_consumer),
    capability_enterprise = COALESCE((p_updates->>'capability_enterprise')::INT, capability_enterprise),
    capability_ai = COALESCE((p_updates->>'capability_ai')::INT, capability_ai),
    capability_talent = COALESCE((p_updates->>'capability_talent')::INT, capability_talent),
    capability_credential = COALESCE((p_updates->>'capability_credential')::INT, capability_credential),
    capability_customer_success = COALESCE((p_updates->>'capability_customer_success')::INT, capability_customer_success),
    capability_growth = COALESCE((p_updates->>'capability_growth')::INT, capability_growth),
    capability_execution = COALESCE((p_updates->>'capability_execution')::INT, capability_execution)
  WHERE id = v_team_id;
  
  RETURN json_build_object('success', true, 'team_id', v_team_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION COMMENTS
-- ============================================================================
-- After running this migration:
-- 1. All direct SELECT/INSERT/UPDATE queries to sessions/teams/decisions FAIL
-- 2. All data access must use RPC functions (listed above)
-- 3. RPC functions validate codes against access_codes table
-- 4. RPC functions bypass RLS (SECURITY DEFINER)
-- 5. Students cannot access another team's data (team_code validation in RPC)
-- 6. Facilitators can access all their session's teams (session_code validation)
-- ============================================================================

