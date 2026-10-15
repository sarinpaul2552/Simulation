/**
 * V2 RPC CLIENT (Batch 5 · 5B)
 *
 * Typed wrapper over the SECURITY DEFINER RPCs in database/MIGRATION_V2_PRODUCTION.sql. The browser uses the anon key
 * only; every call is authorised by an access code (team_code, or session_code + admin_pin). No direct table access.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MarketPathId } from './snapshot';
import type { V2Phase, V2VoteValue, V2Headline, V2PlayerQuarterInput, V2Deliberation, V2Role } from './types';
import type { V2PresentationMode } from './content/modes';

export type V2ParticipationMode = 'team_device' | 'individual_device' | 'voting_disabled';
export type V2Pacing = 'facilitator' | 'self';
/** Batch 7.5: how a team commits a quarter. 'none' = legacy no-vote sessions (participation 'voting_disabled'). */
export type V2CommitmentMode = 'team_commitment' | 'private_vote' | 'none';
export type V2Agreement = 'agreed' | 'discussed' | 'leader';

/**
 * The effective commitment mode. Databases without MIGRATION_V2_BATCH7_5_COMMITMENT.sql have no commitment_mode:
 * they keep the original behaviour (private votes, or none for 'voting_disabled').
 */
export function commitmentModeOf(s: { commitment_mode?: V2CommitmentMode | null; participation_mode: V2ParticipationMode }): V2CommitmentMode {
  if (s.commitment_mode === 'team_commitment' || s.commitment_mode === 'private_vote' || s.commitment_mode === 'none') return s.commitment_mode;
  return s.participation_mode === 'voting_disabled' ? 'none' : 'private_vote';
}

export interface V2SessionInfo {
  session_code: string;
  engine_version: 'v1' | 'v2';
  participation_mode: V2ParticipationMode;
  pacing: V2Pacing;
  open_quarter: number;
  /** Batch 7 (absent before MIGRATION_V2_BATCH7_EXPERIENCE.sql — treat as 'mba'). */
  presentation_mode?: V2PresentationMode;
  /** Batch 7.5 (absent before MIGRATION_V2_BATCH7_5_COMMITMENT.sql — see commitmentModeOf). */
  commitment_mode?: V2CommitmentMode;
  /** NexLearn V3 (absent before MIGRATION_V3_MARKET_PATHS.sql — treat as 'v2'): the economic engine of the session. */
  econ_engine?: 'v2' | 'v3';
  /** NexLearn V3: the session's market path (V3 sessions only; fixed when the session is created). */
  market_path?: MarketPathId | null;
  /**
   * NexLearn V3.1 Stage 2 (absent before MIGRATION_V3_1_ENGINE_VERSION.sql): the V3 engine version of a V3 session,
   * fixed at creation. null/absent on a V3 session = '1.0' (sessions created before versioning). Always null for V2.
   */
  econ_version?: V3EconVersion | null;
}

/** A V3 engine version as stored on a session ('1.0' ↔ 'v3-econ-1.0', '1.1' ↔ 'v3-econ-1.1'). */
export type V3EconVersion = '1.0' | '1.1';
export const V3_ECON_VERSIONS: V3EconVersion[] = ['1.0', '1.1'];
/** The explicitly selected V3 engine version in a URL query (`?econ=1.1`), or undefined (= the default, 1.0). */
export function econVersionFlag(search: string): V3EconVersion | undefined {
  const v = new URLSearchParams(search).get('econ');
  return v && (V3_ECON_VERSIONS as string[]).includes(v) ? (v as V3EconVersion) : undefined;
}

/** The working-quarter draft persisted for refresh/reconnect. */
export interface V2Draft {
  quarter: number;
  input?: Partial<V2PlayerQuarterInput>;
  deliberation?: V2Deliberation;
  /** Roles that have viewed their private brief on the shared device (sequential private briefing). */
  briefed?: V2Role[];
  /** Batch 8: the team has read the NexLearn company introduction (Q1 only). */
  introSeen?: boolean;
}

export interface V2GameRecord {
  state_version: number;
  completed_quarter: number;
  phase: V2Phase;
  snapshot: unknown;
  draft: V2Draft | null;
  updated_at: string;
  /** Batch 7.5: the working quarter's team commitment, once confirmed. */
  commitment?: { agreement: V2Agreement; committed_by: V2Role | null } | null;
}

export interface V2ResolutionRecord {
  quarter: number;
  input: V2PlayerQuarterInput;
  deliberation: V2Deliberation | null;
  reflection: string | null;
  state_version_after: number;
  /** Batch 7.5: the team agreement statement (team-commitment quarters only). */
  agreement?: V2Agreement | null;
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
  commitment_mode?: V2CommitmentMode;
  econ_engine?: 'v2' | 'v3';
  market_path?: MarketPathId;
  econ_version?: V3EconVersion | null;
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
  presentation_mode?: V2PresentationMode;
  commitment_mode?: V2CommitmentMode;
  /** NexLearn V3: economic engine and market path (absent before the V3 migration = V2). */
  econ_engine?: 'v2' | 'v3';
  market_path?: MarketPathId | null;
  econ_version?: V3EconVersion | null;
  teams: V2FacilitatorTeam[];
}

export interface V2DebriefRow {
  team_id: string;
  team_name: string;
  completed_quarter: number;
  inputs: V2PlayerQuarterInput[];
  deliberations: (V2Deliberation | null)[];
  reflections: (string | null)[];
  votes: Record<string, Partial<Record<V2Role, V2VoteValue>>>;
  /** Batch 7.5: team agreement statements of resolved quarters (absent before the migration). */
  agreements?: Record<string, { agreement: V2Agreement; committed_by: V2Role | null }>;
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
    /**
     * V2 session (original economics), or — with a market path — a NexLearn V3 session (requires the V3 migration).
     * V3.1 Stage 2: an explicit `econVersion` selects the V3 engine version (requires MIGRATION_V3_1_ENGINE_VERSION.sql);
     * without one the session is created exactly as before (v3_create_session → 'v3-econ-1.0').
     */
    createSession: (email: string, teamNames: string[], participationMode: V2ParticipationMode, pacing: V2Pacing, marketPath?: MarketPathId, econVersion?: V3EconVersion) => {
      if (econVersion && !marketPath) return Promise.reject(new Error('An engine version can only be chosen for a V3 session'));
      if (marketPath && econVersion) return call<V2CreatedSession>('v3_create_session_v', { p_facilitator_email: email, p_team_names: teamNames, p_participation_mode: participationMode, p_pacing: pacing, p_market_path: marketPath, p_econ_version: econVersion });
      return marketPath
        ? call<V2CreatedSession>('v3_create_session', { p_facilitator_email: email, p_team_names: teamNames, p_participation_mode: participationMode, p_pacing: pacing, p_market_path: marketPath })
        : call<V2CreatedSession>('v2_create_session', { p_facilitator_email: email, p_team_names: teamNames, p_participation_mode: participationMode, p_pacing: pacing });
    },
    facilitatorOverview: (sessionCode: string, adminPin: string) =>
      call<V2FacilitatorOverview>('v2_facilitator_overview', { p_session_code: sessionCode, p_admin_pin: adminPin }),
    setOpenQuarter: (sessionCode: string, adminPin: string, quarter: number) =>
      call<{ open_quarter: number }>('v2_facilitator_set_open_quarter', { p_session_code: sessionCode, p_admin_pin: adminPin, p_quarter: quarter }),
    setPacing: (sessionCode: string, adminPin: string, pacing: V2Pacing) =>
      call<{ pacing: V2Pacing }>('v2_facilitator_set_pacing', { p_session_code: sessionCode, p_admin_pin: adminPin, p_pacing: pacing }),
    facilitatorAudit: (sessionCode: string, adminPin: string) =>
      call<{ team_id: string; completed_quarter: number; headline: V2Headline; inputs: V2PlayerQuarterInput[] }[]>('v2_facilitator_audit', { p_session_code: sessionCode, p_admin_pin: adminPin }),
    setPresentationMode: (sessionCode: string, adminPin: string, mode: V2PresentationMode) =>
      call<{ presentation_mode: V2PresentationMode }>('v2_facilitator_set_presentation_mode', { p_session_code: sessionCode, p_admin_pin: adminPin, p_mode: mode }),
    setCommitmentMode: (sessionCode: string, adminPin: string, mode: Exclude<V2CommitmentMode, 'none'>) =>
      call<{ commitment_mode: V2CommitmentMode }>('v2_facilitator_set_commitment_mode', { p_session_code: sessionCode, p_admin_pin: adminPin, p_mode: mode }),
    confirmCommitment: (teamCode: string, quarter: number, agreement: V2Agreement, role?: V2Role) =>
      call<{ phase: V2Phase; changed: boolean }>('v2_confirm_commitment', { p_team_code: teamCode, p_quarter: quarter, p_agreement: agreement, p_role: role ?? null }),
    facilitatorDebrief: (sessionCode: string, adminPin: string) =>
      call<V2DebriefRow[]>('v2_facilitator_debrief', { p_session_code: sessionCode, p_admin_pin: adminPin }),
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
