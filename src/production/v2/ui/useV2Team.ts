import { useCallback, useEffect, useRef, useState } from 'react';
import type { V2Api, V2Draft, V2VotesResponse } from '../api';
import { V2ApiError } from '../api';
import { loadTeamGame, saveDecisionDraft, commitQuarter, V2LoadedGame, V2IntegrityError } from '../gameService';
import { workingQuarter, envelopeFor } from '../adapter';
import type { V2Phase, V2PlayerQuarterInput, V2Role, V2VoteValue } from '../types';

export type V2TeamStatus = 'loading' | 'ready' | 'error' | 'integrity-error';

const EDITABLE: V2Phase[] = ['briefing', 'decide', 'belief', 'risk'];
const COMPLETED_PHASES: V2Phase[] = ['results', 'reflect', 'final'];

export function defaultInput(quarter: number): V2PlayerQuarterInput {
  return { quarter, allocation: { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: envelopeFor(quarter) } };
}

export function phaseQuarter(game: V2LoadedGame): number {
  return COMPLETED_PHASES.includes(game.record.phase) ? game.record.completed_quarter : game.record.completed_quarter + 1;
}

/**
 * Team game controller. The server is the source of truth for phase, draft, votes and resolutions; this hook only
 * mirrors it, so a refresh, a reconnect or another device always lands on exactly the same step.
 */
export function useV2Team(api: V2Api, teamCode: string) {
  const [status, setStatus] = useState<V2TeamStatus>('loading');
  const [game, setGame] = useState<V2LoadedGame | null>(null);
  const [draft, setDraft] = useState<V2Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDraft = useRef<V2Draft | null>(null);

  const adopt = useCallback((g: V2LoadedGame) => {
    setGame(g);
    const q = workingQuarter(g.snapshot);
    const server = g.record.draft;
    // Local edits not yet saved (debounce window) win over a background refresh of the same quarter.
    if (pendingDraft.current && q !== null && pendingDraft.current.quarter === q && EDITABLE.includes(g.record.phase)) { setStatus('ready'); return; }
    setDraft(q === null ? null : server && server.quarter === q ? { ...server, input: server.input ?? defaultInput(q) } : { quarter: q, input: defaultInput(q), briefed: [] });
    setStatus('ready');
  }, []);

  const reload = useCallback(async () => {
    try {
      adopt(await loadTeamGame(api, teamCode));
      setError(null);
    } catch (e) {
      if (e instanceof V2IntegrityError) { setStatus('integrity-error'); setError(e.message); return; }
      setStatus(s => (s === 'ready' ? s : 'error'));
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [api, teamCode, adopt]);

  useEffect(() => { void reload(); }, [reload]);

  const flushDraft = useCallback(async () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
    const d = pendingDraft.current;
    pendingDraft.current = null;
    if (d && game && EDITABLE.includes(game.record.phase)) {
      await saveDecisionDraft(api, game, { input: d.input, deliberation: d.deliberation, briefed: d.briefed });
    }
  }, [api, game]);

  const draftRef = useRef<V2Draft | null>(null);
  draftRef.current = draft;

  /** Update the local draft and persist it shortly after (debounced), or at once for progress that must survive a refresh. */
  const updateDraft = useCallback((patch: Partial<V2Draft>, opts: { immediate?: boolean } = {}) => {
    const next = { ...(draftRef.current ?? { quarter: patch.quarter ?? 1 }), ...patch } as V2Draft;
    draftRef.current = next;
    setDraft(next);
    pendingDraft.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const save = () => { void flushDraft().catch(err => setError(String(err?.message ?? err))); };
    if (opts.immediate) save();
    else saveTimer.current = setTimeout(save, 400);
  }, [flushDraft]);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      if (e instanceof V2ApiError && /Phase conflict|Wrong quarter|working quarter/.test(e.message)) await reload();
    } finally {
      setBusy(false);
    }
  }, [reload]);

  /** Persist the current draft (explicitly), then move to the next phase. */
  const go = useCallback((to: V2Phase, draftOverride?: V2Draft) => run(async () => {
    if (!game) return;
    const from = game.record.phase;
    if (EDITABLE.includes(from)) {
      if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
      pendingDraft.current = null;
      const d = draftOverride ?? draft;
      if (d) await saveDecisionDraft(api, game, { input: d.input, deliberation: d.deliberation, briefed: d.briefed });
    }
    await api.setPhase(teamCode, phaseQuarter(game), from, to);
    await reload();
  }), [api, game, draft, teamCode, reload, run]);

  const submitVote = useCallback((role: V2Role, vote: V2VoteValue) => run(async () => {
    if (!game) return;
    await api.submitVote(teamCode, phaseQuarter(game), role, vote);
  }), [api, game, teamCode, run]);

  const getVotes = useCallback(async (): Promise<V2VotesResponse | null> => {
    if (!game) return null;
    return api.getVotes(teamCode, phaseQuarter(game));
  }, [api, game, teamCode]);

  const commit = useCallback(() => run(async () => {
    if (!game || !draft?.input) return;
    const out = await commitQuarter(api, game, draft.input as V2PlayerQuarterInput);
    adopt(out.game);
  }), [api, game, draft, adopt, run]);

  const saveReflection = useCallback((text: string) => run(async () => {
    if (!game) return;
    await api.saveReflection(teamCode, game.record.completed_quarter, text);
  }), [api, game, teamCode, run]);

  return { status, game, draft, error, busy, reload, updateDraft, flushDraft, go, submitVote, getVotes, commit, saveReflection, setError };
}

export type V2TeamController = ReturnType<typeof useV2Team>;
