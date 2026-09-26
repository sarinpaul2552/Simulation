/**
 * V2 GAME SERVICE (Batch 5 · 5B)
 *
 * Joins the pure adapter to the persistence RPCs. Restoration is never trusted blindly: a loaded snapshot must satisfy
 * the schema contract, replay exactly from its own input log, and agree with the server's per-quarter resolution rows.
 */
import {
  initializeGame, headlineOf, resolveQuarter, storedInput, verifySnapshot, workingQuarter, validateQuarterInput, replayInputs,
} from './adapter';
import { V2GameSnapshot, toStorable, fromStorable, encodeLossless, firstDifference } from './snapshot';
import type { V2Api, V2GameRecord, V2ResolutionRecord, V2SessionInfo, V2TeamGameResponse, V2Draft } from './api';
import type { V2PlayerQuarterInput } from './types';

export class V2IntegrityError extends Error {}

export interface V2LoadedGame {
  teamCode: string;
  teamId: string;
  teamName: string;
  session: V2SessionInfo;
  record: V2GameRecord;
  snapshot: V2GameSnapshot;
  resolutions: V2ResolutionRecord[];
}

/** Stored (jsonb) form of an input — exactly what the snapshot logs, so the server can compare them. */
export function storableInput(input: V2PlayerQuarterInput): V2PlayerQuarterInput {
  return JSON.parse(encodeLossless(storedInput(input))) as V2PlayerQuarterInput;
}

export function fromResponse(teamCode: string, resp: V2TeamGameResponse): V2LoadedGame {
  if (!resp.game) throw new V2IntegrityError('Game not initialized');
  let snapshot: V2GameSnapshot;
  try {
    snapshot = fromStorable(resp.game.snapshot);
  } catch (e) {
    throw new V2IntegrityError(`Stored game could not be restored: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (snapshot.completedQuarter !== resp.game.completed_quarter) throw new V2IntegrityError('Stored quarter does not match the snapshot');
  const logged = resp.resolutions.map(r => r.input);
  const diff = firstDifference(JSON.parse(encodeLossless(snapshot.inputs)), logged);
  if (diff) throw new V2IntegrityError(`Snapshot input log disagrees with the resolution log (${diff})`);
  const v = verifySnapshot(snapshot);
  if (!v.ok) throw new V2IntegrityError(`Stored game does not replay exactly (${v.difference})`);
  return { teamCode, teamId: resp.team_id, teamName: resp.team_name, session: resp.session, record: resp.game, snapshot, resolutions: resp.resolutions };
}

/** Load (or idempotently create) a team's V2 game and verify it. */
export async function loadTeamGame(api: V2Api, teamCode: string): Promise<V2LoadedGame> {
  let resp = await api.getGame(teamCode);
  if (resp.session.engine_version !== 'v2') throw new V2IntegrityError('This session does not use the V2 engine');
  if (!resp.game) {
    const init = initializeGame();
    resp = await api.initGame(teamCode, toStorable(init), headlineOf(init));
  }
  return fromResponse(teamCode, resp);
}

/** Persist the decision as the team's draft (must be done before voting / committing; the server locks it). */
export async function saveDecisionDraft(api: V2Api, game: V2LoadedGame, draft: Omit<V2Draft, 'quarter'>): Promise<void> {
  const q = workingQuarter(game.snapshot);
  if (q === null) throw new Error('The game is complete');
  const input = draft.input && isCompleteInput(draft.input) ? storableInput(draft.input) : draft.input;
  await api.saveDraft(game.teamCode, q, { ...draft, input, quarter: q });
}

export function isCompleteInput(i: Partial<V2PlayerQuarterInput>): i is V2PlayerQuarterInput {
  return typeof i.quarter === 'number' && !!i.allocation;
}

/**
 * Commit the working quarter. The next snapshot is computed with the frozen engine; the server accepts it exactly once.
 * A duplicate commit (double click, second device, retry after a dropped response) returns the stored resolution.
 */
export async function commitQuarter(api: V2Api, game: V2LoadedGame, input: V2PlayerQuarterInput): Promise<{ status: 'resolved' | 'already_resolved'; game: V2LoadedGame }> {
  const q = workingQuarter(game.snapshot);
  if (q === null) throw new Error('The game is complete');
  const errors = validateQuarterInput(game.snapshot, input);
  if (errors.length) throw new Error(errors.join('; '));
  const res = resolveQuarter(game.snapshot, input);
  const out = await api.resolveQuarter(game.teamCode, q, game.record.state_version, storableInput(input), toStorable(res.snapshot), headlineOf(res.snapshot));
  return { status: out.status, game: fromResponse(game.teamCode, out.game) };
}

/**
 * Facilitator integrity audit: replay each team's committed decisions with the frozen engine and compare the result
 * with the headline the team's client stored. 'mismatch' means the stored state cannot be reproduced.
 */
export function auditTeam(entry: { completed_quarter: number; headline: unknown; inputs: V2PlayerQuarterInput[] }): { status: 'verified' | 'mismatch'; detail: string | null } {
  try {
    const snap = replayInputs(entry.inputs);
    if (snap.completedQuarter !== entry.completed_quarter) return { status: 'mismatch', detail: 'quarter count differs' };
    const d = firstDifference(JSON.parse(JSON.stringify(headlineOf(snap))), entry.headline); // as sent by the client (plain JSON)
    return d ? { status: 'mismatch', detail: d } : { status: 'verified', detail: null };
  } catch (e) {
    return { status: 'mismatch', detail: e instanceof Error ? e.message : String(e) };
  }
}
