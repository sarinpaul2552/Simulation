/**
 * Supabase Integration
 * Persistence layer: separate from simulation engine
 * Can be replaced without changing game logic
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SessionData {
  id: string;
  facilitator_email: string;
  session_code: string;
  admin_pin: string;
  team_count: number;
  current_quarter: number;
  game_phase: string;
  created_at: string;
  updated_at: string;
}

export interface TeamData {
  id: string;
  session_id: string;
  team_code: string;
  team_name: string;
  capability_consumer: number;
  capability_enterprise: number;
  capability_ai: number;
  capability_talent: number;
  capability_credential: number;
  capability_customer_success: number;
  capability_growth: number;
  capability_execution: number;
  revenue: number;
  operating_cost: number;
  operating_profit: number;
  cash: number;
  stock_price: number;
  product_quality: number;
  culture: number;
  trust: number;
  q4_commitment_destination: string | null;
  q4_commitment_amount: number | null;
  model_mix_consumer: number;
  model_mix_enterprise: number;
  model_mix_university: number;
  model_mix_ai: number;
  created_at: string;
  updated_at: string;
}

export interface DecisionData {
  id: string;
  team_id: string;
  quarter: number;
  allocation_json: Record<string, number>;
  belief_prompt: string | null;
  belief_response: string | null;
  risks_json: Array<{ identified: string; severity: number }> | null;
  votes_json: Record<string, unknown> | null;
  team_check_alignment: string | null;
  team_check_override: boolean;
  team_check_dissenting_roles: string | null;
  outcome_revenue_change: number | null;
  outcome_cash_change: number | null;
  outcome_capability_changes_json: Record<string, number> | null;
  outcome_stock_price_change: number | null;
  outcome_narrative: string | null;
  outcome_callback_to_risk: string | null;
  reflection_prompt: string | null;
  reflection_response: string | null;
  submitted_at: string | null;
  calculated_at: string | null;
  created_at: string;
}

// ============ SESSION OPERATIONS ============

export async function createSession(
  facilitatorEmail: string,
  teamCount: number
): Promise<SessionData> {
  const sessionCode = `ISB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const adminPin = Math.floor(1000 + Math.random() * 9000).toString();

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      facilitator_email: facilitatorEmail,
      session_code: sessionCode,
      admin_pin: adminPin,
      team_count: teamCount,
      current_quarter: 0,
      game_phase: 'setup',
    })
    .select()
    .single();

  if (error) throw error;
  return data as SessionData;
}

export async function getSession(sessionCode: string): Promise<SessionData> {
  const { data, error } = await supabase
    .from('sessions')
    .select()
    .eq('session_code', sessionCode)
    .single();

  if (error) throw error;
  return data as SessionData;
}

export async function updateSessionPhase(sessionId: string, phase: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ game_phase: phase, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function advanceQuarter(sessionId: string): Promise<void> {
  const session = await supabase
    .from('sessions')
    .select('current_quarter')
    .eq('id', sessionId)
    .single();

  if (session.error) throw session.error;

  const { error } = await supabase
    .from('sessions')
    .update({
      current_quarter: (session.data?.current_quarter || 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) throw error;
}

// ============ TEAM OPERATIONS ============

export async function createTeam(
  sessionId: string,
  teamName: string
): Promise<TeamData> {
  const teamCode = `ISB${Math.random().toString(36).substring(2, 7).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

  const { data, error } = await supabase
    .from('teams')
    .insert({
      session_id: sessionId,
      team_code: teamCode,
      team_name: teamName,
    })
    .select()
    .single();

  if (error) throw error;
  return data as TeamData;
}

export async function getTeam(teamId: string): Promise<TeamData> {
  const { data, error } = await supabase
    .from('teams')
    .select()
    .eq('id', teamId)
    .single();

  if (error) throw error;
  return data as TeamData;
}

export async function getTeamsBySession(sessionId: string): Promise<TeamData[]> {
  const { data, error } = await supabase
    .from('teams')
    .select()
    .eq('session_id', sessionId);

  if (error) throw error;
  return data as TeamData[];
}

export async function updateTeamState(teamId: string, updates: Partial<TeamData>): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', teamId);

  if (error) throw error;
}

// ============ DECISION OPERATIONS ============

export async function createDecision(
  teamId: string,
  quarter: number,
  allocation: Record<string, number>
): Promise<DecisionData> {
  const { data, error } = await supabase
    .from('decisions')
    .insert({
      team_id: teamId,
      quarter,
      allocation_json: allocation,
    })
    .select()
    .single();

  if (error) throw error;
  return data as DecisionData;
}

export async function updateDecision(decisionId: string, updates: Partial<DecisionData>): Promise<void> {
  const { error } = await supabase
    .from('decisions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', decisionId);

  if (error) throw error;
}

export async function getDecision(decisionId: string): Promise<DecisionData> {
  const { data, error } = await supabase
    .from('decisions')
    .select()
    .eq('id', decisionId)
    .single();

  if (error) throw error;
  return data as DecisionData;
}

export async function getTeamDecisions(teamId: string): Promise<DecisionData[]> {
  const { data, error } = await supabase
    .from('decisions')
    .select()
    .eq('team_id', teamId)
    .order('quarter', { ascending: true });

  if (error) throw error;
  return data as DecisionData[];
}

// ============ SUBSCRIBE TO TEAM CHANGES (Real-time Leaderboard) ============

export function subscribeToTeamUpdates(sessionId: string, callback: (teams: TeamData[]) => void): () => void {
  const subscription = supabase
    .from(`teams:session_id=eq.${sessionId}`)
    .on('*', async () => {
      const teams = await getTeamsBySession(sessionId);
      callback(teams);
    })
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
