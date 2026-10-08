import { useCallback, useEffect, useState } from 'react';
import { V2_ROLES, workingQuarter, envelopeFor } from '../../adapter';
import type { V2Deliberation, V2PlayerQuarterInput, V2Role, V2VoteValue } from '../../types';
import type { V2Agreement, V2CommitmentMode, V2VotesResponse } from '../../api';
import type { V2TeamController } from '../useV2Team';
import { pick, V2PresentationMode } from '../../content/modes';
import { BELIEFS, RISKS, CONFIDENCE_LEVELS } from '../../content/deliberationContent';
import { CHAPTERS } from '../../content/chapters';
import { BUCKETS, BUCKET_INFO } from '../../insights/consequences';
import { FINAL_LABELS, destinationName, money } from '../format';
import { ChoiceList, ConfirmDialog, Icon } from '../ds/components';

const VOTE_LABEL: Record<V2VoteValue, string> = { support: 'Support', concern: 'Concern', oppose: 'Oppose' };
const VOTE_CLASS: Record<V2VoteValue, string> = { support: 'ds-badge-good', concern: 'ds-badge-warn', oppose: 'ds-badge-bad' };
export const AGREEMENTS: { id: V2Agreement; letter: string; label: string; detail: string }[] = [
  { id: 'agreed', letter: 'A', label: 'We agree on this decision.', detail: 'The leadership team supports it.' },
  { id: 'discussed', letter: 'B', label: 'We discussed different opinions and reached a decision.', detail: 'There was real disagreement; this is where the team landed.' },
  { id: 'leader', letter: 'C', label: 'The team leader made the final decision.', detail: 'Views differed and the leader decided.' },
];
const BUCKET_COLOR: Record<string, string> = { consumer: 'var(--ds-c-consumer)', enterprise: 'var(--ds-c-enterprise)', aiProduct: 'var(--ds-c-ai)', people: 'var(--ds-c-people)', universityCredentials: 'var(--ds-c-university)' };

/**
 * Stage 3 — Commit.
 * Team Commitment (default): one authorized participant confirms the decision with a team agreement statement.
 * Private voting (optional, facilitator-controlled): the Batch 5–7 sequential private vote, revealed together.
 * Legacy no-vote sessions: commit directly. In every mode the server enforces the rule and resolves exactly once.
 */
export function CommitStage({ ctl, mode, deviceRole, commitment }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role; commitment: V2CommitmentMode }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const phase = game.record.phase;
  const input = ctl.draft?.input as V2PlayerQuarterInput | undefined;
  const testId = phase === 'vote' ? 'v2-phase-vote' : phase === 'commit' ? 'v2-phase-commit' : 'v2-phase-review';
  return (
    <div className="ds-stack-lg" data-testid={testId}>
      <div className="ds-grid ds-grid-main">
        {input && <Resolution input={input} deliberation={ctl.draft?.deliberation} quarter={q} mode={mode} />}
        {commitment === 'team_commitment'
          ? <TeamCommitment ctl={ctl} deviceRole={deviceRole} quarter={q} />
          : commitment === 'private_vote'
            ? <PrivateVote ctl={ctl} deviceRole={deviceRole} quarter={q} />
            : <LegacyCommit ctl={ctl} quarter={q} />}
      </div>
    </div>
  );
}

/** The decision as a board resolution: allocation, financing, strategic decision, belief, confidence, top risks. */
function Resolution({ input, deliberation, quarter, mode }: { input: V2PlayerQuarterInput; deliberation?: V2Deliberation; quarter: number; mode: V2PresentationMode }) {
  const env = envelopeFor(quarter, input.finalOption);
  const invested = BUCKETS.filter(b => input.allocation[b] > 0);
  const belief = BELIEFS[quarter]?.find(b => b.id === deliberation?.beliefId);
  const conf = CONFIDENCE_LEVELS.find(c => c.value === deliberation?.confidence)?.label;
  const risks = (deliberation?.riskIds ?? []).map(id => RISKS[quarter]?.find(r => r.id === id)).filter(Boolean);
  const strategic = [
    input.destination && `Commit to ${destinationName(input.destination)}`,
    input.opportunity && (input.opportunity.accept ? 'Accept the global contract' : 'Decline the global contract'),
    input.management && Object.keys(input.management).length > 0 && `Recession actions: ${[input.management.workforceReduction && `${input.management.workforceReduction.depth} workforce reduction`, input.management.hiringFreeze && 'hiring freeze', input.management.pricing && (input.management.pricing === 'raise' ? 'raise prices' : 'discount prices'), input.management.closeWeakOfferings && 'close weak offerings', input.management.marketingLevel !== undefined && `marketing ${input.management.marketingLevel.toFixed(1)}×`].filter(Boolean).join(', ')}`,
    input.crisisResponse && `Crisis response: ${input.crisisResponse}`,
    input.finalOption && `Final decision: ${FINAL_LABELS[input.finalOption]}`,
  ].filter(Boolean) as string[];
  const financing = (input.financing ?? []).map(f => f.kind === 'debt' ? `Borrow ${money(f.amount)}` : f.kind === 'equity' ? `Sell shares for ${money(f.amount)}` : f.kind === 'repay' ? `Repay ${money(f.amount)} of debt` : f.kind === 'partner' ? 'Bring in a strategic partner' : `${f.depth} restructuring`);
  return (
    <article className="ds-resolution ds-enter" data-testid="v2-decision-summary">
      <p className="ds-eyebrow">Board resolution · Q{quarter} · {CHAPTERS[quarter].title}</p>
      <h2 className="ds-resolution-title">The leadership team resolves to…</h2>
      <dl>
        <dt>Invest {money(env, 0)}</dt>
        <dd>
          <div className="ds-alloc-bar" style={{ height: 10, marginBottom: 8 }} aria-hidden>
            {invested.map(b => <span key={b} style={{ flex: `${input.allocation[b]} 0 0`, background: BUCKET_COLOR[b] }} />)}
            {input.allocation.cashReserve > 0.005 && <span className="ds-hatch" style={{ flex: `${input.allocation.cashReserve} 0 0` }} />}
          </div>
          <div className="ds-small">{invested.length ? invested.map(b => `${BUCKET_INFO[b].short} ${money(input.allocation[b])}`).join(' · ') : 'Nothing invested'}{input.allocation.cashReserve > 0.005 ? ` · Kept as cash ${money(input.allocation.cashReserve)}` : ''}</div>
        </dd>
        {financing.length > 0 && <><dt>Financing</dt><dd className="ds-small">{financing.join(' · ')}</dd></>}
        {strategic.length > 0 && <><dt>Strategic decision</dt><dd>{strategic.join(' · ')}</dd></>}
        <dt>Primary belief</dt><dd>{belief ? pick(mode, belief.label) : '—'}</dd>
        <dt>Confidence</dt><dd>{conf ?? '—'}</dd>
        <dt>Top two risks</dt><dd className="ds-small">{risks.length ? risks.map(r => pick(mode, r!.label)).join(' · ') : '—'}</dd>
      </dl>
    </article>
  );
}

function TeamCommitment({ ctl, deviceRole, quarter }: { ctl: V2TeamController; deviceRole?: V2Role; quarter: number }) {
  const game = ctl.game!;
  const phase = game.record.phase;
  const recorded = game.record.commitment?.agreement ?? null;
  const [agreement, setAgreement] = useState<V2Agreement | null>(recorded);
  const [confirming, setConfirming] = useState(false);
  const individual = game.session.participation_mode === 'individual_device';
  // On individual devices the team leader (CEO) confirms; on a shared team device anyone holding it can.
  const authorized = !individual || deviceRole === 'CEO';
  const pending = phase === 'commit' && !!recorded;
  return (
    <section className="ds-stack" data-testid="v2-team-commitment" style={{ alignSelf: 'start' }}>
      <p className="ds-eyebrow">Team commitment</p>
      <h2 className="ds-title" style={{ marginBottom: 0 }}>{pending ? 'Commitment recorded' : 'How did the team reach this decision?'}</h2>
      {pending ? (
        <p className="ds-muted" style={{ margin: 0 }}>The team’s agreement is recorded. Finish committing Q{quarter} to see the results.</p>
      ) : (
        <ChoiceList name="agreement" testIdPrefix="v2-agreement" value={agreement ? [agreement] : []} onChange={v => setAgreement(v[0] as V2Agreement)}
          options={AGREEMENTS.map(a => ({ id: a.id, disabled: !authorized, label: <span><b>{a.letter}.</b> {a.label}</span>, detail: a.detail }))} />
      )}
      {!authorized && <p className="ds-callout" data-testid="v2-waiting-commit"><Icon name="clock" />Waiting for the CEO to commit the team’s decision.</p>}
      <p className="ds-muted" style={{ margin: 0 }}>Your answer is recorded for reflection and the facilitator debrief. It does not change the economics.</p>
      <div className="ds-actions" style={{ marginTop: 4 }}>
        <button className="ds-btn ds-btn-secondary" data-testid="v2-revise" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>Revise the decision</button>
        <button className="ds-btn ds-btn-chapter ds-btn-lg" data-testid="v2-commit-team" disabled={ctl.busy || !authorized || (!pending && !agreement)}
          onClick={() => (pending ? void ctl.commitTeam(recorded!, deviceRole) : setConfirming(true))}>
          {ctl.busy ? 'Committing…' : pending ? `Finish committing Q${quarter}` : 'Commit Our Decision'} <Icon name="arrow" />
        </button>
      </div>
      {confirming && agreement && (
        <ConfirmDialog title={`Commit the Q${quarter} decision?`} confirmLabel="Commit Our Decision" busy={ctl.busy} testId="v2-confirm"
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); void ctl.commitTeam(agreement, deviceRole); }}>
          <p style={{ marginTop: 0 }}>The quarter will be resolved with this investment and decision. It cannot be undone.</p>
          <p style={{ marginBottom: 0 }}>Team agreement: <b>{AGREEMENTS.find(a => a.id === agreement)!.label}</b></p>
        </ConfirmDialog>
      )}
    </section>
  );
}

function PrivateVote({ ctl, deviceRole, quarter }: { ctl: V2TeamController; deviceRole?: V2Role; quarter: number }) {
  const game = ctl.game!;
  const phase = game.record.phase;
  const individual = game.session.participation_mode === 'individual_device';
  const [votes, setVotes] = useState<V2VotesResponse | null>(null);
  const [voter, setVoter] = useState<V2Role | null>(null);
  const [casting, setCasting] = useState(false);
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
  // Refresh the vote list BEFORE leaving the private screen, so the hand-off never shows a stale role.
  const cast = async (role: V2Role, v: V2VoteValue) => { setCasting(true); try { await ctl.submitVote(role, v); await refresh(); } finally { setVoter(null); setCasting(false); } };
  return (
    <section className="ds-panel ds-stack" data-testid="v2-vote-panel" style={{ alignSelf: 'start' }}>
      <p className="ds-eyebrow"><Icon name="lock" size={13} /> Private leadership vote</p>
      {!votes ? <p className="ds-muted">Loading votes…</p> : votes.revealed ? (
        <div className="ds-stack" data-testid="v2-votes-revealed">
          <p style={{ margin: 0 }}>All five leaders have voted. Votes are advisory: they inform the team and cannot be overridden.</p>
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
          <button className="ds-btn ds-btn-chapter" data-testid="v2-start-vote" onClick={() => setVoter(next)}><Icon name="lock" /> I am the {next} — vote privately</button>
          <div className="ds-roles">{V2_ROLES.map(r => <span key={r} className={`ds-role-pill ${submitted.includes(r) ? 'done' : ''}`}>{submitted.includes(r) && <Icon name="check" size={12} />}{r}</span>)}</div>
        </div>
      ) : <p className="ds-muted">Revealing…</p>}
      {phase === 'commit' && <div className="ds-callout" data-testid="v2-commit-warning"><Icon name="alert" />Committing resolves Q{quarter}. It cannot be undone.</div>}
      <div className="ds-actions">
        <button className="ds-btn ds-btn-secondary" data-testid="v2-revise" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>Revise the decision (clears votes)</button>
        {phase === 'vote'
          ? <button className="ds-btn ds-btn-primary" data-testid="v2-to-commit" disabled={ctl.busy || !votes?.revealed} onClick={() => void ctl.go('commit')}>Continue to commit <Icon name="arrow" /></button>
          : <button className="ds-btn ds-btn-chapter" data-testid="v2-commit" disabled={ctl.busy} onClick={() => void ctl.commit()}>{ctl.busy ? 'Committing…' : `Commit Q${quarter} decision`}</button>}
      </div>
    </section>
  );
}

function LegacyCommit({ ctl, quarter }: { ctl: V2TeamController; quarter: number }) {
  return (
    <section className="ds-panel ds-stack" style={{ alignSelf: 'start' }}>
      <p className="ds-eyebrow">Commit</p>
      <div className="ds-callout" data-testid="v2-commit-warning"><Icon name="alert" />Committing resolves Q{quarter}. It cannot be undone.</div>
      <div className="ds-actions">
        <button className="ds-btn ds-btn-secondary" data-testid="v2-revise" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>Revise the decision</button>
        <button className="ds-btn ds-btn-chapter" data-testid="v2-commit" disabled={ctl.busy} onClick={() => void ctl.commit()}>{ctl.busy ? 'Committing…' : `Commit Q${quarter} decision`}</button>
      </div>
    </section>
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
