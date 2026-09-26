import { useCallback, useEffect, useState } from 'react';
import { V2_ROLES, workingQuarter, envelopeFor } from '../adapter';
import type { V2PlayerQuarterInput, V2Role, V2VoteValue } from '../types';
import type { V2VotesResponse } from '../api';
import type { V2TeamController } from './useV2Team';
import { Panel } from './common';
import { BUCKET_LABELS, FINAL_LABELS, destinationName, money } from './format';

const RISKS = [
  'We misread demand', 'Execution capacity is overstretched', 'Cash runs short', 'Competitors move faster',
  'Customer trust is damaged', 'Key talent leaves', 'AI product is not ready', 'Strategy is too diffuse',
];

export function BeliefPhase({ ctl }: { ctl: V2TeamController }) {
  const d = ctl.draft?.deliberation ?? {};
  return (
    <div className="v2-phase" data-testid="v2-phase-belief">
      <Panel title="What does the team believe?">
        <p>State the thesis behind this quarter's decision: what you expect to happen and why.</p>
        <textarea data-testid="v2-belief" rows={4} value={d.belief ?? ''} maxLength={1000}
          onChange={e => ctl.updateDraft({ deliberation: { ...d, belief: e.target.value } })} />
        <label>Confidence
          <select data-testid="v2-confidence" value={d.confidence ?? 3} onChange={e => ctl.updateDraft({ deliberation: { ...d, confidence: parseInt(e.target.value, 10) } })}>
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {['very low', 'low', 'medium', 'high', 'very high'][n - 1]}</option>)}
          </select>
        </label>
        <p className="v2-muted">Your belief is recorded for reflection. It does not change the simulation.</p>
      </Panel>
      <div className="v2-actions">
        <button className="btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>Back</button>
        <button className="btn-primary" data-testid="v2-to-risk" disabled={ctl.busy || !(d.belief ?? '').trim()} onClick={() => void ctl.go('risk')}>Continue: risks</button>
      </div>
    </div>
  );
}

export function RiskPhase({ ctl }: { ctl: V2TeamController }) {
  const d = ctl.draft?.deliberation ?? {};
  const risks = d.risks ?? [];
  const toggle = (r: string) => ctl.updateDraft({ deliberation: { ...d, risks: risks.includes(r) ? risks.filter(x => x !== r) : [...risks, r] } });
  const voting = ctl.game!.session.participation_mode !== 'voting_disabled';
  return (
    <div className="v2-phase" data-testid="v2-phase-risk">
      <Panel title="What could go wrong?">
        <div className="v2-chips">
          {RISKS.map(r => <button key={r} data-testid="v2-risk-chip" className={`v2-chip ${risks.includes(r) ? 'on' : ''}`} onClick={() => toggle(r)}>{r}</button>)}
        </div>
        <p className="v2-muted">Name at least one risk. Risks are recorded for reflection; they do not change the simulation.</p>
      </Panel>
      <div className="v2-actions">
        <button className="btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('belief')}>Back</button>
        <button className="btn-primary" data-testid="v2-to-vote" disabled={ctl.busy || risks.length === 0} onClick={() => void ctl.go(voting ? 'vote' : 'commit')}>
          {voting ? 'Continue: leadership vote' : 'Continue: commit'}
        </button>
      </div>
    </div>
  );
}

export function DecisionSummary({ input }: { input: V2PlayerQuarterInput }) {
  const env = envelopeFor(input.quarter, input.finalOption);
  return (
    <div className="v2-summary" data-testid="v2-decision-summary">
      <ul>
        {(Object.keys(BUCKET_LABELS) as (keyof typeof BUCKET_LABELS)[]).map(b => <li key={b}>{BUCKET_LABELS[b]}: <b>{money(input.allocation[b])}</b></li>)}
        <li className="v2-muted">Envelope {money(env, 0)}</li>
        {input.destination && <li>Destination: <b>{destinationName(input.destination)}</b></li>}
        {input.opportunity && <li>Contract: <b>{input.opportunity.accept ? 'Accept' : 'Decline'}</b></li>}
        {input.management && Object.keys(input.management).length > 0 && <li>Recession response: <b>{describeManagement(input.management)}</b></li>}
        {input.crisisResponse && <li>Crisis response: <b>{input.crisisResponse}</b></li>}
        {input.finalOption && <li>Final decision: <b>{FINAL_LABELS[input.finalOption]}</b></li>}
        {(input.financing ?? []).map((f, i) => <li key={i}>Financing: <b>{f.kind}{'amount' in f ? ` ${money(f.amount)}` : ''}{'depth' in f ? ` (${f.depth})` : ''}</b></li>)}
      </ul>
    </div>
  );
}

function describeManagement(m: NonNullable<V2PlayerQuarterInput['management']>): string {
  const parts: string[] = [];
  if (m.workforceReduction) parts.push(`${m.workforceReduction.depth} workforce reduction${m.workforceReduction.protectRnD ? ' (R&D protected)' : ''}`);
  if (m.hiringFreeze) parts.push('hiring freeze');
  if (m.pricing) parts.push(m.pricing === 'raise' ? 'raise prices' : 'discount');
  if (m.closeWeakOfferings) parts.push('close weak offerings');
  if (m.marketingLevel !== undefined) parts.push(`marketing ${m.marketingLevel.toFixed(1)}×`);
  return parts.join(', ');
}

const VOTE_LABEL: Record<V2VoteValue, string> = { support: 'Support', concern: 'Concern', oppose: 'Oppose' };

/**
 * Leadership vote. Team device: roles vote one after another, privately; the screen never shows an earlier vote.
 * Votes are revealed together once all five are in (the server withholds them until then). Votes are advisory: they
 * never change the economics and nobody can override them — the team either commits or goes back to revise.
 */
export function VotePhase({ ctl, deviceRole }: { ctl: V2TeamController; deviceRole?: V2Role }) {
  const [votes, setVotes] = useState<V2VotesResponse | null>(null);
  const [voter, setVoter] = useState<V2Role | null>(null);
  const individual = ctl.game!.session.participation_mode === 'individual_device';
  const q = workingQuarter(ctl.game!.snapshot)!;
  const { getVotes, setError } = ctl;
  const refresh = useCallback(async () => { try { setVotes(await getVotes()); } catch (e) { setError(String((e as Error).message)); } }, [getVotes, setError]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    if (!individual || votes?.revealed) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [individual, votes?.revealed, refresh]);
  const submitted = votes?.submitted_roles ?? [];
  const next = V2_ROLES.find(r => !submitted.includes(r)) ?? null;
  const cast = async (role: V2Role, v: V2VoteValue) => { await ctl.submitVote(role, v); setVoter(null); await refresh(); };

  return (
    <div className="v2-phase" data-testid="v2-phase-vote">
      <Panel title={`Q${q} proposal`}>
        {ctl.draft?.input && <DecisionSummary input={ctl.draft.input as V2PlayerQuarterInput} />}
      </Panel>
      <Panel title="Leadership vote" testId="v2-vote-panel">
        {!votes ? <p>Loading votes…</p> : votes.revealed ? (
          <div data-testid="v2-votes-revealed">
            <p>All five roles have voted. Votes are revealed together:</p>
            <ul>{V2_ROLES.map(r => <li key={r} data-testid={`v2-vote-${r}`}>{r}: <b>{VOTE_LABEL[votes.votes![r]!]}</b></li>)}</ul>
            <p className="v2-muted">Votes inform the team; they do not change the simulation and cannot be overridden. Commit together, or go back and revise (everyone then votes again).</p>
          </div>
        ) : individual ? (
          deviceRole && !submitted.includes(deviceRole) ? (
            <VoteButtons role={deviceRole} onVote={v => void cast(deviceRole, v)} disabled={ctl.busy} />
          ) : <p data-testid="v2-waiting-votes">Waiting for the other roles: {submitted.length} of 5 votes in.</p>
        ) : voter ? (
          <VoteButtons role={voter} onVote={v => void cast(voter, v)} disabled={ctl.busy} />
        ) : next ? (
          <div className="v2-pass">
            <p>Pass the device to the <b data-testid="v2-next-voter">{next}</b>. {submitted.length} of 5 votes in; no vote is shown until all five are in.</p>
            <button className="btn-primary" data-testid="v2-start-vote" onClick={() => setVoter(next)}>I am the {next}: vote privately</button>
          </div>
        ) : <p>Revealing…</p>}
      </Panel>
      <div className="v2-actions">
        <button className="btn-secondary" data-testid="v2-revise" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>Revise the decision (clears votes)</button>
        <button className="btn-primary" data-testid="v2-to-commit" disabled={ctl.busy || !votes?.revealed} onClick={() => void ctl.go('commit')}>Continue: commit</button>
      </div>
    </div>
  );
}

function VoteButtons({ role, onVote, disabled }: { role: V2Role; onVote: (v: V2VoteValue) => void; disabled: boolean }) {
  return (
    <div className="v2-vote-private" data-testid="v2-vote-private" data-role={role}>
      <p><b>{role}</b>, cast your private vote on this proposal:</p>
      <div className="v2-inline">
        {(['support', 'concern', 'oppose'] as V2VoteValue[]).map(v => (
          <button key={v} className={`v2-vote-btn v2-vote-${v}`} data-testid={`v2-vote-${v}`} disabled={disabled} onClick={() => onVote(v)}>{VOTE_LABEL[v]}</button>
        ))}
      </div>
    </div>
  );
}

export function CommitPhase({ ctl }: { ctl: V2TeamController }) {
  const q = workingQuarter(ctl.game!.snapshot)!;
  const voting = ctl.game!.session.participation_mode !== 'voting_disabled';
  return (
    <div className="v2-phase" data-testid="v2-phase-commit">
      <Panel title={`Commit Q${q}`}>
        <p>Once committed, the quarter is resolved and cannot be changed.</p>
        {ctl.draft?.input && <DecisionSummary input={ctl.draft.input as V2PlayerQuarterInput} />}
      </Panel>
      <div className="v2-actions">
        <button className="btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>{voting ? 'Revise (clears votes)' : 'Revise'}</button>
        <button className="btn-primary btn-large" data-testid="v2-commit" disabled={ctl.busy} onClick={() => void ctl.commit()}>
          {ctl.busy ? 'Committing…' : `Commit Q${q} decision`}
        </button>
      </div>
    </div>
  );
}
