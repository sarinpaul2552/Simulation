-- V4 Business Simulation Platform Schema
-- PostgreSQL on Supabase

-- Sessions (facilitator creates)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facilitator_email VARCHAR(255) NOT NULL,
  session_code VARCHAR(50) UNIQUE NOT NULL,
  admin_pin VARCHAR(10) NOT NULL,
  team_count INTEGER NOT NULL,
  current_quarter INTEGER DEFAULT 0,
  game_phase VARCHAR(50) DEFAULT 'setup', -- setup | q1-q8 | final-debrief
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams (facilitator assigns codes)
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  team_code VARCHAR(50) UNIQUE NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  
  -- Persistent Capabilities (0-100)
  capability_consumer INTEGER DEFAULT 55,
  capability_enterprise INTEGER DEFAULT 30,
  capability_ai INTEGER DEFAULT 10,
  capability_talent INTEGER DEFAULT 55,
  capability_credential INTEGER DEFAULT 40,
  capability_customer_success INTEGER DEFAULT 30,
  capability_growth INTEGER DEFAULT 55,
  capability_execution INTEGER DEFAULT 60,
  
  -- Financial State
  revenue DECIMAL(10,2) DEFAULT 200,
  operating_cost DECIMAL(10,2) DEFAULT 170,
  operating_profit DECIMAL(10,2) DEFAULT 30,
  cash DECIMAL(10,2) DEFAULT 60,
  stock_price DECIMAL(10,2) DEFAULT 100,
  
  -- Quality Metrics
  product_quality INTEGER DEFAULT 70,
  culture INTEGER DEFAULT 72,
  trust INTEGER DEFAULT 70,
  
  -- Strategic State
  q4_commitment_destination VARCHAR(100),
  q4_commitment_amount DECIMAL(10,2),
  model_mix_consumer DECIMAL(5,2) DEFAULT 70.0,
  model_mix_enterprise DECIMAL(5,2) DEFAULT 20.0,
  model_mix_university DECIMAL(5,2) DEFAULT 8.0,
  model_mix_ai DECIMAL(5,2) DEFAULT 2.0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Decisions (Q1-Q8, one per team per quarter)
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  quarter INTEGER NOT NULL,
  
  -- Allocation (JSON for flexibility)
  allocation_json JSONB NOT NULL, -- { consumer_growth, enterprise_sales, ai_product, instructor_people, university_credential, customer_success, marketing, cash }
  
  -- Belief & Risk
  belief_prompt VARCHAR(255),
  belief_response VARCHAR(255),
  
  risks_json JSONB, -- array of { identified, severity }
  
  -- Role Votes
  votes_json JSONB, -- { ceo: {vote, confidence, rationale}, cfο: {...}, product: {...}, people: {...}, growth: {...} }
  
  -- Team Check
  team_check_alignment VARCHAR(50), -- unanimous | broad | debate | split
  team_check_override BOOLEAN DEFAULT FALSE,
  team_check_dissenting_roles VARCHAR(255), -- comma-separated
  
  -- Outcome (calculated after commit)
  outcome_revenue_change DECIMAL(10,2),
  outcome_cash_change DECIMAL(10,2),
  outcome_capability_changes_json JSONB, -- { consumer: +5, enterprise: +2, ... }
  outcome_stock_price_change DECIMAL(10,2),
  outcome_narrative VARCHAR(500),
  outcome_callback_to_risk VARCHAR(500),
  
  -- Reflection
  reflection_prompt VARCHAR(255),
  reflection_response VARCHAR(255),
  
  submitted_at TIMESTAMP,
  calculated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access Log (for analytics/debugging)
CREATE TABLE access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(50),
  team_code VARCHAR(50),
  ip_address VARCHAR(45),
  role_accessed VARCHAR(50), -- facilitator | student
  accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_sessions_facilitator ON sessions(facilitator_email);
CREATE INDEX idx_sessions_code ON sessions(session_code);
CREATE INDEX idx_teams_session ON teams(session_id);
CREATE INDEX idx_teams_code ON teams(team_code);
CREATE INDEX idx_decisions_team_quarter ON decisions(team_id, quarter);

-- Row-Level Security (RLS)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Facilitators can only see their own sessions
CREATE POLICY facilitator_sessions_policy ON sessions
  FOR ALL USING (facilitator_email = auth.email());

-- Teams can only see decisions from their own session
CREATE POLICY team_access_policy ON teams
  FOR SELECT USING (session_id IN (SELECT id FROM sessions));

CREATE POLICY team_decisions_policy ON decisions
  FOR SELECT USING (team_id IN (SELECT id FROM teams));
