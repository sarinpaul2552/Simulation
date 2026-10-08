import { useCallback, useEffect, useState } from 'react';
import { V2_ROLES, workingQuarter } from '../../adapter';
import type { V2PlayerQuarterInput, V2Role, V2VoteValue } from '../../types';
import type { V2VotesResponse } from '../../api';
import type { V2TeamController } from '../useV2Team';
import type { V2PresentationMode } from '../../content/modes';
import { Card, Icon } from '../ds/components';
import { DecisionSummary } from './DecisionSummary';

const VOTE_LABEL: Record<V2VoteValue, string> = { support: 'Support', concern: 'Concern', oppose: 'Oppose' };
const VOTE_CLASS: Record<V2VoteValue, string> = { support: 'ds-badge-good', concern: 'ds-badge-warn', oppose: 'ds-badge-bad' };

/**
 * Stage 3 — Commit: private sequential leadership vote (hidden until all five are in, revealed together, advisory —
 * nobody can override), then the irreversible commit. Server phases 'vote' → 'commit' are unchanged.
 */
export function CommitStage({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const phase = game.record.phase;
  const voting = game.session.participation_mode !== 'voting_disabled';
  const individual = game.session.participation_mode === 'individual_device';
  const [votes, setVotes] = useState<V2VotesResponse | null>(null);
  const [voter, setVoter] = useState<V2Role | null>(null);
  const [casting, setCasting] = useState(false);
  const { getVotes, setError } = ctl;
  const refresh = useCallback(async () => { try { setVotes(await getVotes()); } catch (e) { setError(String((e as Error).message)); } }, [getVotes, setError]);
  useEffect(() => { if (voting) void refresh(); }, [refresh, voting]);
  useEffect(() => {
    if (!individual || votes?.revealed || !voting) return;
    const t = setInterval(() => void refresh(), 3000);
    return () => clearInterval(t);
  }, [individual, votes?.revealed, refresh, voting]);
  const submitted = votes?.submitted_roles ?? [];
  const next = V2_ROLES.find(r => !submitted.includes(r)) ?? null;
  // Batch 6 fix: refresh the vote list BEFORE leaving the private screen, so the hand-off never shows a stale role.
  const cast = async (role: V2Role, v: V2VoteValue) => { setCasting(true); try { await ctl.submitVote(role, v); await refresh(); } finally { setVoter(null); setCasting(false); } };
  const input = ctl.draft?.input as V2PlayerQuarterInput | undefined;

  return (
    <div className="ds-stack" data-testid={phase === 'vote' ? 'v2-phase-vote' : 'v2-phase-commit'}>
      <div className="ds-grid ds-grid-main">
        <Card title={`Q${q} proposal`} icon="flag">
          {input && <DecisionSummary input={input} deliberation={ctl.draft?.deliberation} quarter={q} mode={mode} />}
        </Card>

        {voting ? (
          <Card title="Leadership vote" sub="Private · revealed together" icon="lock" testId="v2-vote-panel">
            {!votes ? <p className="ds-muted">Loading votes…</p> : votes.revealed ? (
              <div className="ds-stack" data-testid="v2-votes-revealed">
                <div className="ds-callout"><Icon name="users" />All five leaders have voted. Votes are advisory: they inform the team and cannot be overridden.</div>
                <div className="ds-stack" style={{ gap: 6 }}>
                  {V2_ROLES.map(r => <div key={r} className="ds-row" data-testid={`v2-vote-${r}`}><b style={{ minWidth: 80 }}>{r}</b><span className={`ds-badge ${VOTE_CLASS[votes.votes![r]!]}`}>{VOTE_LABEL[votes.votes![r]!]}</span></div>)}
                </div>
              </div>
            ) : individual ? (
              deviceRole && !submitted.includes(deviceRole)
                ? <VoteButtons role={deviceRole} onVote={v => void cast(deviceRole, v)} disabled={ctl.busy || casting} />
                : <p data-testid="v2-waiting-votes">Waiting for the other leaders: {submitted.length} of 5 votes in.</p>
            ) : voter ? (
              <VoteButtons role={voter} onVote={v => void cast(voter, v)} disabled={ctl.busy || casting} />
            ) : next ? (
              <div className="ds-pass">
                <div className="ds-avatar">{next.slice(0, 3)}</div>
                <div>Pass the device to the <b data-testid="v2-next-voter">{next}</b>.</div>
                <div className="ds-muted">{submitted.length} of 5 votes in. No vote is shown until all five are in.</div>
                <button className="ds-btn ds-btn-primary" data-testid="v2-start-vote" onClick={() => setVoter(next)}><Icon name="lock" /> I am the {next} — vote privately</button>
                <div className="ds-roles">{V2_ROLES.map(r => <span key={r} className={`ds-role-pill ${submitted.includes(r) ? 'done' : ''}`}>{submitted.includes(r) && <Icon name="check" size={12} />}{r}</span>)}</div>
              </div>
            ) : <p className="ds-muted">Revealing…</p>}
          </Card>
        ) : (
          <Card title="Commit" icon="check"><p className="ds-muted">Voting is turned off for this session.</p></Card>
        )}
      </div>

      {phase === 'commit' && (
        <div className="ds-callout" data-testid="v2-commit-warning"><Icon name="alert" />Committing resolves Q{q}. It cannot be undone.</div>
      )}
      <div className="ds-actions ds-actions-sticky">
        <button className="ds-btn ds-btn-secondary" data-testid="v2-revise" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>{voting ? 'Revise the decision (clears votes)' : 'Revise the decision'}</button>
        {phase === 'vote' ? (
          <button className="ds-btn ds-btn-primary" data-testid="v2-to-commit" disabled={ctl.busy || !votes?.revealed} onClick={() => void ctl.go('commit')}>Continue to commit <Icon name="arrow" /></button>
        ) : (
          <button className="ds-btn ds-btn-accent" data-testid="v2-commit" disabled={ctl.busy} onClick={() => void ctl.commit()}>{ctl.busy ? 'Committing…' : `Commit Q${q} decision`}</button>
        )}
      </div>
    </div>
  );
}

function VoteButtons({ role, onVote, disabled }: { role: V2Role; onVote: (v: V2VoteValue) => void; disabled: boolean }) {
  return (
    <div className="ds-pass" data-testid="v2-vote-private" data-role={role}>
      <div className="ds-avatar">{role.slice(0, 3)}</div>
      <div><b>{role}</b>, cast your private vote on this proposal.</div>
      <div className="ds-row" style={{ justifyContent: 'center' }}>
        {(['support', 'concern', 'oppose'] as V2VoteValue[]).map(v => (
          <button key={v} className={`ds-btn ${v === 'support' ? 'ds-btn-primary' : 'ds-btn-secondary'}`} data-testid={`v2-vote-${v}`} disabled={disabled} onClick={() => onVote(v)}>{VOTE_LABEL[v]}</button>
        ))}
      </div>
    </div>
  );
}
