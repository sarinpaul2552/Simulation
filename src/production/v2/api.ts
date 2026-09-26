/**
 * V2 RPC CLIENT (Batch 5 · 5B)
 *
 * Typed wrapper over the SECURITY DEFINER RPCs in database/MIGRATION_V2_PRODUCTION.sql. The browser uses the anon key
 * only; every call is authorised by an access code (team_code, or session_code + admin_pin). No direct table access.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { V2Phase, V2VoteValue, V2Headline, V2PlayerQuarterInput, V2Deliberation, V2Role } from './types';

export type V2ParticipationMode = 'team_device' | 'individual_device' | 'voting_disabled';
export type V2Pacing = 'facilitator' | 'self';

export interface V2SessionInfo {
  session_code: string;
  engine_version: 'v1' | 'v2';
  participation_mode: V2ParticipationMode;
  pacing: V2Pacing;
  open_quarter: number;
}

/** The working-quarter draft persisted for refresh/reconnect. */
export interface V2Draft {
  quarter: number;
  input?: Partial<V2PlayerQuarterInput>;
  deliberation?: V2Deliberation;
  /** Roles that have viewed their private brief on the shared device (sequential private briefing). */
  briefed?: V2Role[];
}

export interface V2GameRecord {
  state_version: number;
  completed_quarter: number;
  phase: V2Phase;
  snapshot: unknown;
  draft: V2Draft | null;
  updated_at: string;
}

export interface V2ResolutionRecord {
  quarter: number;
  input: V2PlayerQuarterInput;
  deliberation: V2Deliberation | null;
  reflection: string | null;
  state_version_after: number;
}

export interface V2TeamGameResponse {
  team_id: string;
  team_name: string;
  session: V2SessionInfo;
  game: V2GameRecord | null;
  resolutions: V2ResolutionRecord[];
}

export interface V2VotesResponse {
  quarter: number;
  submitted_roles: V2Role[];
  revealed: boolean;
  votes: Partial<Record<V2Role, V2VoteValue>> | null;
}

export interface V2CreatedSession {
  session_id: string;
  session_code: string;
  admin_pin: string;
  engine_version: 'v2';
  participation_mode: V2ParticipationMode;
  pacing: V2Pacing;
  teams: { team_id: string; team_code: string; team_name: string }[];
}

export interface V2FacilitatorTeam {
  team_id: string;
  team_name: string;
  team_code: string;
  started: boolean;
  completed_quarter: number;
  phase: V2Phase | null;
  votes_submitted: number;
  headline: V2Headline | null;
  updated_at: string | null;
}

export interface V2FacilitatorOverview {
  session_id: string;
  session_code: string;
  engine_version: 'v1' | 'v2';
  participation_mode: V2ParticipationMode;
  pacing: V2Pacing;
  open_quarter: number;
  teams: V2FacilitatorTeam[];
}

export class V2ApiError extends Error {
  constructor(message: string, public readonly code?: string) { super(message); }
}

export function createV2Api(client: SupabaseClient) {
  async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new V2ApiError(error.message, error.code);
    return data as T;
  }
  return {
    createSession: (email: string, teamNames: string[], participationMode: V2ParticipationMode, pacing: V2Pacing) =>
      call<V2CreatedSession>('v2_create_session', { p_facilitator_email: email, p_team_names: teamNames, p_participation_mode: participationMode, p_pacing: pacing }),
    facilitatorOverview: (sessionCode: string, adminPin: string) =>
      call<V2FacilitatorOverview>('v2_facilitator_overview', { p_session_code: sessionCode, p_admin_pin: adminPin }),
    setOpenQuarter: (sessionCode: string, adminPin: string, quarter: number) =>
      call<{ open_quarter: number }>('v2_facilitator_set_open_quarter', { p_session_code: sessionCode, p_admin_pin: adminPin, p_quarter: quarter }),
    setPacing: (sessionCode: string, adminPin: string, pacing: V2Pacing) =>
      call<{ pacing: V2Pacing }>('v2_facilitator_set_pacing', { p_session_code: sessionCode, p_admin_pin: adminPin, p_pacing: pacing }),
    join: (sessionCode: string, teamCode: string) =>
      call<V2TeamGameResponse>('v2_join', { p_session_code: sessionCode, p_team_code: teamCode }),
    getGame: (teamCode: string) => call<V2TeamGameResponse>('v2_get_game', { p_team_code: teamCode }),
    initGame: (teamCode: string, snapshot: unknown, headline: V2Headline) =>
      call<V2TeamGameResponse>('v2_init_game', { p_team_code: teamCode, p_snapshot: snapshot, p_headline: headline }),
    saveDraft: (teamCode: string, quarter: number, draft: V2Draft) =>
      call<{ ok: true }>('v2_save_draft', { p_team_code: teamCode, p_quarter: quarter, p_draft: draft }),
    setPhase: (teamCode: string, quarter: number, from: V2Phase, to: V2Phase) =>
      call<{ phase: V2Phase; changed: boolean }>('v2_set_phase', { p_team_code: teamCode, p_quarter: quarter, p_from: from, p_to: to }),
    submitVote: (teamCode: string, quarter: number, role: V2Role, vote: V2VoteValue) =>
      call<{ submitted: number }>('v2_submit_vote', { p_team_code: teamCode, p_quarter: quarter, p_role: role, p_vote: vote }),
    getVotes: (teamCode: string, quarter: number) => call<V2VotesResponse>('v2_get_votes', { p_team_code: teamCode, p_quarter: quarter }),
    resolveQuarter: (teamCode: string, quarter: number, expectedVersion: number, input: unknown, snapshot: unknown, headline: V2Headline) =>
      call<{ status: 'resolved' | 'already_resolved'; game: V2TeamGameResponse }>('v2_resolve_quarter', {
        p_team_code: teamCode, p_quarter: quarter, p_expected_version: expectedVersion, p_input: input, p_snapshot: snapshot, p_headline: headline,
      }),
    saveReflection: (teamCode: string, quarter: number, reflection: string) =>
      call<{ ok: true }>('v2_save_reflection', { p_team_code: teamCode, p_quarter: quarter, p_reflection: reflection }),
  };
}

export type V2Api = ReturnType<typeof createV2Api>;
