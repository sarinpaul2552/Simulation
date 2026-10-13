import { useCallback, useEffect, useMemo, useState } from 'react';
import { calendarLabel } from '../content/calendar';
import type { V2Api, V2FacilitatorOverview } from '../api';
import { V2_TOTAL_QUARTERS } from '../adapter';
import { auditTeam } from '../gameService';
import { buildTeamDebrief, TeamDebrief } from '../insights/debrief';
import { buildFacilitatorTeams, teamLabels, q3RevealOpen, type FacTeam } from '../insights/facilitator';
import { priorityLabel } from '../content/decisionFraming';
import { pick } from '../content/modes';
import { ClassDiscussion, TeamTimeline, FinalDebrief, StageClock, RulesNote, type NoteSelection } from './FacilitatorDiscussion';
import type { V2DebriefRow } from '../api';
import { normalizeMode, MODE_LABEL, V2PresentationMode } from '../content/modes';
import { money, destinationName, FINAL_LABELS } from './format';
import { Card, ErrorBanner, Icon, LineChart, Segmented } from './ds/components';
import { replayInputs } from '../adapter';
import { gameHistory } from '../insights/history';
import { valuationSeries, fmtPrice, fmtPctDelta } from '../insights/valuation';
import { allScorecards, computeAwards, AWARD_RULES, SCORECARD_ROLES, ROLE_SCORECARD_TITLE, type AwardTeam } from '../insights/executive';
import './ds/ds.css';

const PHASE_LABEL: Record<string, string> = {
  briefing: 'The Challenge', decide: 'Deciding', belief: 'Deciding', risk: 'Deciding', vote: 'Voting', commit: 'Ready to commit',
  results: 'Results', reflect: 'Reflecting', final: 'Finished',
};

/** Tab ids keep their earlier names for stability: 'compare' = Class discussion, 'debrief' = Team timelines. */
type Tab = 'live' | 'compare' | 'debrief' | 'final' | 'leadership';

const selKey = (code: string) => `v2fac-notes-${code}`;
function loadSelection(code: string): Set<string> {
  try { const v = sessionStorage.getItem(selKey(code)); return new Set(v ? (JSON.parse(v) as string[]) : []); } catch { return new Set(); }
}

/**
 * Facilitator dashboard (Batch 7): live progress, peer comparison (facilitator-only) and a classroom debrief built
 * from each team's committed decisions. Never shows private role briefings, drafts in progress or unrevealed votes.
 */
export function V2Facilitator({ api, sessionCode, adminPin, onExit }: { api: V2Api; sessionCode: string; adminPin: string; onExit: () => void }) {
  const [o, setO] = useState<V2FacilitatorOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>('live');
  const [projector, setProjector] = useState(false);
  const [audit, setAudit] = useState<Record<string, { status: 'verified' | 'mismatch'; detail: string | null }> | null>(null);
  const [debrief, setDebrief] = useState<{ teams: TeamDebrief[]; rows: V2DebriefRow[]; votesAvailable: boolean } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => loadSelection(sessionCode));
  const sel: NoteSelection = useMemo(() => ({
    selected,
    toggle: (key: string) => setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { sessionStorage.setItem(selKey(sessionCode), JSON.stringify([...next])); } catch { /* storage unavailable: selection kept in memory */ }
      return next;
    }),
  }), [selected, sessionCode]);
  const [leadership, setLeadership] = useState<AwardTeam[] | null>(null);
  const loadLeadership = () => act(async () => {
    const entries = await api.facilitatorAudit(sessionCode, adminPin);
    const names = Object.fromEntries((o?.teams ?? []).map(t => [t.team_id, t.team_name]));
    setLeadership(entries.filter(e => e.inputs.length > 0).map(e => ({ teamId: e.team_id, teamName: names[e.team_id] ?? 'Team', records: gameHistory(replayInputs(e.inputs)) })));
  });
  const refresh = useCallback(async () => {
    try { setO(await api.facilitatorOverview(sessionCode, adminPin)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [api, sessionCode, adminPin]);
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };
  const runAudit = () => act(async () => {
    const entries = await api.facilitatorAudit(sessionCode, adminPin);
    setAudit(Object.fromEntries(entries.map(e => [e.team_id, auditTeam(e)])));
  });
  const loadDebrief = () => act(async () => {
    try {
      const rows = await api.facilitatorDebrief(sessionCode, adminPin);
      setDebrief({ rows, teams: rows.filter(r => r.inputs.length > 0).map(r => buildTeamDebrief({ team_id: r.team_id, team_name: r.team_name, inputs: r.inputs, deliberations: r.deliberations, votes: r.votes, agreements: r.agreements })), votesAvailable: true });
    } catch {
      // Older database (before the Batch 7 migration): decisions only, no votes or deliberation.
      const entries = await api.facilitatorAudit(sessionCode, adminPin);
      const names = Object.fromEntries((o?.teams ?? []).map(t => [t.team_id, t.team_name]));
      setDebrief({
        rows: entries.map(e => ({ team_id: e.team_id, team_name: names[e.team_id] ?? 'Team', completed_quarter: e.completed_quarter, inputs: e.inputs, deliberations: e.inputs.map(() => null), reflections: e.inputs.map(() => null), votes: {} })),
        teams: entries.filter(e => e.inputs.length > 0).map(e => buildTeamDebrief({ team_id: e.team_id, team_name: names[e.team_id] ?? 'Team', inputs: e.inputs })), votesAvailable: false,
      });
    }
  });

  // Batch 10E: the discussion views use the existing debrief data; reload it whenever a team completes a quarter.
  const totalCompleted = o ? o.teams.reduce((n, t) => n + t.completed_quarter, 0) : -1;
  useEffect(() => { if (totalCompleted >= 0) void loadDebrief(); }, [totalCompleted]); // eslint-disable-line react-hooks/exhaustive-deps
  const facTeams: FacTeam[] = useMemo(() => {
    if (!debrief || !o) return [];
    const order = new Map(o.teams.map((t, i) => [t.team_id, i]));
    return buildFacilitatorTeams([...debrief.rows].sort((a, b) => (order.get(a.team_id) ?? 0) - (order.get(b.team_id) ?? 0)));
  }, [debrief, o?.teams.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const labels = useMemo(() => teamLabels((o?.teams ?? []).map(t => ({ teamId: t.team_id, name: t.team_name })), projector), [o?.teams, projector]); // eslint-disable-line react-hooks/exhaustive-deps
  const gateOpen = o ? q3RevealOpen(o.teams) : false;
  const gateProgress = o ? `${o.teams.filter(t => t.started && t.completed_quarter >= 4).length} of ${o.teams.filter(t => t.started).length} teams` : '';

  if (!o) return <div className="ds-root"><div className="ds-shell"><ErrorBanner error={error} /><p data-testid="v2-fac-loading">Loading session…</p><button className="ds-btn ds-btn-secondary" onClick={onExit}>Leave</button></div></div>;
  const mode = normalizeMode(o.presentation_mode);
  const done = (n: number) => o.teams.filter(t => t.completed_quarter >= n).length;
  const waitingForMe = o.pacing === 'facilitator' && o.open_quarter < V2_TOTAL_QUARTERS && o.teams.filter(t => t.started).length > 0 && o.teams.filter(t => t.started).every(t => t.completed_quarter >= o.open_quarter);

  return (
    <div className={`ds-root ${projector ? 'ds-projector' : ''}`} data-testid="v2-facilitator">
      <header className="ds-topbar">
        <div className="ds-topbar-inner">
          <span className="ds-company">Facilitator · {o.session_code}</span>
          <span className="ds-quarter">{o.pacing === 'self' ? 'Self-paced' : `Open: ${calendarLabel(o.open_quarter)}`}</span>
          <span className="ds-meta">{MODE_LABEL[mode]} mode{!projector && <> · PIN <b data-testid="v2-fac-pin">{adminPin}</b></>}</span>
          <span className="ds-spacer" />
          <button onClick={() => setProjector(!projector)} data-testid="v2-fac-projector">{projector ? 'Normal view' : 'Projector view'}</button>
          <button onClick={onExit}>Leave</button>
        </div>
      </header>
      <main className="ds-shell ds-stack">
        <ErrorBanner error={error} />
        <div className="ds-row">
          <Segmented testIdPrefix="v2-fac-tab" value={tab} onChange={v => { setTab(v); if (v !== 'live' && v !== 'leadership') void loadDebrief(); if (v === 'leadership') void loadLeadership(); }} options={[{ id: 'live', label: 'Live progress' }, { id: 'compare', label: 'Class discussion' }, { id: 'debrief', label: 'Team timelines' }, { id: 'final', label: 'Final debrief' }, { id: 'leadership', label: 'Leadership and awards' }]} />
          <span className="ds-spacer" />
          <span className="ds-small">Class mode</span>
          {o.presentation_mode === undefined
            ? <span className="ds-small" data-testid="v2-fac-mode-unavailable">MBA (modes need a database update)</span>
            : <Segmented<V2PresentationMode> testIdPrefix="v2-fac-mode" value={mode} onChange={m => void act(() => api.setPresentationMode(sessionCode, adminPin, m))} options={[{ id: 'undergraduate', label: 'Undergraduate' }, { id: 'mba', label: 'MBA' }]} />}
        </div>
        <StageClock />

        {tab === 'live' && (
          <>
            <Card title="Session settings" icon="clock">
              <div className="ds-row" style={{ marginBottom: 10 }}>
                <span>How teams commit:</span>
                {o.commitment_mode === undefined
                  ? <span className="ds-small" data-testid="v2-fac-commit-unavailable"><b>Private voting</b> (Team Commitment needs a database update)</span>
                  : <Segmented<'team_commitment' | 'private_vote'> testIdPrefix="v2-fac-commit" value={o.commitment_mode === 'none' ? undefined : o.commitment_mode}
                      onChange={m => void act(() => api.setCommitmentMode(sessionCode, adminPin, m))}
                      options={[{ id: 'team_commitment', label: 'Team commitment' }, { id: 'private_vote', label: 'Private voting' }]} />}
                {o.commitment_mode === 'none' && <span className="ds-muted">Currently: commit without a vote (legacy session)</span>}
              </div>
              <div className="ds-row">
                <span>Pacing: <b data-testid="v2-fac-pacing">{o.pacing === 'facilitator' ? 'facilitator-led' : 'self-paced'}</b></span>
                <button className="ds-btn ds-btn-secondary" disabled={busy} onClick={() => void act(() => api.setPacing(sessionCode, adminPin, o.pacing === 'facilitator' ? 'self' : 'facilitator'))}>Switch to {o.pacing === 'facilitator' ? 'self-paced' : 'facilitator-led'}</button>
                {o.pacing === 'facilitator' && (
                  <>
                    <span>Open quarter: <b data-testid="v2-fac-open-quarter">{calendarLabel(o.open_quarter)}</b> ({done(o.open_quarter)} of {o.teams.length} teams completed it)</span>
                    {o.open_quarter < V2_TOTAL_QUARTERS && <button className="ds-btn ds-btn-primary" data-testid="v2-fac-open-next" disabled={busy} onClick={() => void act(() => api.setOpenQuarter(sessionCode, adminPin, o.open_quarter + 1))}>Open {calendarLabel(o.open_quarter + 1)}</button>}
                  </>
                )}
              </div>
              {waitingForMe && <div className="ds-callout" style={{ marginTop: 8 }} data-testid="v2-fac-ready"><Icon name="flag" />All active teams have finished {calendarLabel(o.open_quarter)} and are waiting for you to open {calendarLabel(o.open_quarter + 1)}.</div>}
            </Card>
            <Card title="Teams" icon="users" action={<button className="ds-btn ds-btn-secondary" data-testid="v2-fac-verify" disabled={busy} onClick={() => void runAudit()}><Icon name="check" />Verify integrity</button>}>
              <div className="ds-table-wrap">
                <table className="ds-table" data-testid="v2-fac-teams">
                  <thead><tr><th>Team</th>{!projector && <th>Code</th>}<th>Progress</th><th>Now</th><th>Commit</th><th>Last committed intent</th><th>Revenue</th><th>Cash</th><th>Strategy</th><th>Finance</th><th>Final</th><th>Integrity</th></tr></thead>
                  <tbody>
                    {o.teams.map(t => {
                      const h = t.headline;
                      const working = t.completed_quarter + 1;
                      const waiting = t.phase === 'reflect' && (o.pacing === 'self' || o.open_quarter < working) ;
                      return (
                        <tr key={t.team_id} data-testid="v2-fac-team" data-team={projector ? labels[t.team_id] : t.team_name}>
                          <td><b>{labels[t.team_id]}</b></td>
                          {!projector && <td><code>{t.team_code}</code></td>}
                          <td data-testid="v2-fac-progress">{t.started ? `${t.completed_quarter}/${V2_TOTAL_QUARTERS} done` : 'Not joined'}</td>
                          <td>{t.phase ? (t.phase === 'final' ? 'Finished' : waiting ? `Waiting for ${calendarLabel(working)}` : `${calendarLabel(['results', 'reflect'].includes(t.phase) ? t.completed_quarter : working)} · ${PHASE_LABEL[t.phase]}`) : '—'}</td>
                          <td data-testid="v2-fac-votes">{t.phase === 'vote' || (t.phase === 'commit' && o.commitment_mode !== 'team_commitment') ? `${t.votes_submitted}/5 votes` : t.phase === 'commit' ? 'committing' : t.phase === 'risk' && o.commitment_mode === 'team_commitment' ? 'reviewing' : '—'}</td>
                          <td className="ds-small" data-testid="v2-fac-intent">{(() => { const ft = facTeams.find(x => x.teamId === t.team_id); const last = ft?.quarters[ft.quarters.length - 1]; const l = last ? priorityLabel(last.quarter, last.deliberation?.priorityId) : undefined; return last ? (l ? `${calendarLabel(last.quarter)}: ${pick(mode, l)}` : `${calendarLabel(last.quarter)}: not recorded`) : '—'; })()}</td>
                          <td>{h ? money(h.revenue) : '—'}</td>
                          <td>{h ? money(h.cash) : '—'}</td>
                          <td data-testid="v2-fac-destination">{h && h.completedQuarter >= 4 ? destinationName(h.destination) : '—'}</td>
                          <td data-testid="v2-fac-finance">
                            {h ? <span className="ds-row" style={{ gap: 4 }}>
                              {h.solvency !== 'healthy' && <span className="ds-badge ds-badge-warn">{h.solvency}</span>}
                              {h.distressed && <span className="ds-badge ds-badge-bad">distressed</span>}
                              {h.debt > 0 && <span className="ds-small">debt {money(h.debt)}</span>}
                              {h.financingRounds > 0 && <span className="ds-small">{h.financingRounds} financing action(s)</span>}
                              {h.solvency === 'healthy' && !h.distressed && h.debt === 0 && h.financingRounds === 0 && <span className="ds-badge ds-badge-good">healthy</span>}
                            </span> : '—'}
                          </td>
                          <td data-testid="v2-fac-final">{h?.final ? <><b>{h.final.overall.toFixed(1)}</b> · {h.finalOption ? FINAL_LABELS[h.finalOption] : ''}</> : '—'}</td>
                          <td data-testid="v2-fac-integrity" title={audit?.[t.team_id]?.detail ?? ''}>{audit?.[t.team_id] ? (audit[t.team_id].status === 'verified' ? 'verified' : <span className="ds-badge ds-badge-bad">mismatch</span>) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="ds-muted">Headline figures and committed intent only. Private role briefings, drafts and unrevealed votes are never shown here.{projector ? ' Projector view: team names and codes are hidden.' : ''}</p>
            </Card>
          </>
        )}

        {tab === 'compare' && (debrief
          ? <ClassDiscussion teams={facTeams} labels={labels} projector={projector} gateOpen={gateOpen} gateProgress={gateProgress} mode={mode} sel={sel}
              financial={<details className="ds-fold" open><summary>Financial comparison<span className="ds-fold-hint">Latest completed quarter of each team</span></summary><div className="ds-fold-body"><Compare overview={o} labels={labels} /></div></details>} />
          : <p className="ds-muted">Loading…</p>)}
        {tab === 'final' && (debrief ? <FinalDebrief teams={facTeams} overview={o} labels={labels} projector={projector} gateOpen={gateOpen} gateProgress={gateProgress} mode={mode} sel={sel} /> : <p className="ds-muted">Loading…</p>)}
        {tab === 'leadership' && (leadership ? <Leadership teams={leadership.map(t => ({ ...t, teamName: labels[t.teamId] ?? t.teamName }))} onRefresh={() => void loadLeadership()} busy={busy} /> : <p className="ds-muted">Loading…</p>)}

        {tab === 'debrief' && (
          <div className="ds-stack" data-testid="v2-fac-debrief">
            <div className="ds-row"><button className="ds-btn ds-btn-secondary" disabled={busy} onClick={() => void loadDebrief()}><Icon name="clock" />Refresh debrief</button>
              {debrief && !debrief.votesAvailable && <span className="ds-badge ds-badge-warn">Votes and beliefs unavailable — the database needs the Batch 7 migration</span>}</div>
            <RulesNote />
            {!debrief ? <p className="ds-muted">Loading…</p> : debrief.teams.length === 0 ? <p className="ds-muted">No team has completed a quarter yet.</p> : debrief.teams.map((t, i) => {
              const ft = facTeams.find(x => x.teamId === t.teamId);
              return <DebriefCard key={t.teamId} d={t} label={labels[t.teamId] ?? t.teamName} open={i === 0}
                timeline={ft ? <TeamTimeline team={ft} label={labels[t.teamId]} projector={projector} mode={mode} sel={sel} /> : null} />;
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function Compare({ overview, labels }: { overview: V2FacilitatorOverview; labels: Record<string, string> }) {
  const teams = overview.teams.filter(t => t.headline);
  const metrics = useMemo(() => [
    { id: 'revenue', label: 'Revenue (last quarter)', get: (t: typeof teams[number]) => t.headline!.revenue, fmt: (v: number) => money(v) },
    { id: 'cash', label: 'Cash', get: (t: typeof teams[number]) => t.headline!.cash, fmt: (v: number) => money(v) },
    { id: 'op', label: 'Operating profit', get: (t: typeof teams[number]) => t.headline!.operatingProfit, fmt: (v: number) => money(v) },
    { id: 'score', label: 'Final score', get: (t: typeof teams[number]) => t.headline!.final?.overall ?? NaN, fmt: (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—') },
  ], []);
  if (!teams.length) return <p className="ds-muted">No team data yet.</p>;
  return (
    <div className="ds-grid ds-grid-2" data-testid="v2-fac-compare">
      {metrics.map(m => {
        const vals = teams.map(t => ({ name: labels[t.team_id] ?? t.team_name, v: m.get(t), q: t.completed_quarter }));
        const max = Math.max(...vals.map(x => (Number.isFinite(x.v) ? Math.abs(x.v) : 0)), 1);
        return (
          <Card key={m.id} title={m.label} sub="Facilitator only" icon="chart">
            <div className="ds-stack" style={{ gap: 6 }}>
              {vals.map(x => (
                <div key={x.name} className="ds-meter" style={{ gridTemplateColumns: 'minmax(0,140px) minmax(0,1fr) auto' }}>
                  <span className="ds-small"><b>{x.name}</b> <span className="ds-muted">{calendarLabel(x.q)}</span></span>
                  <div className="ds-meter-track"><div className="ds-meter-fill" style={{ width: `${Number.isFinite(x.v) ? Math.max(2, (Math.abs(x.v) / max) * 100) : 0}%` }} /></div>
                  <span className="ds-small" style={{ fontVariantNumeric: 'tabular-nums' }}>{m.fmt(x.v)}</span>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function DebriefCard({ d, label, open, timeline }: { d: TeamDebrief; label: string; open: boolean; timeline: React.ReactNode }) {
  return (
    <Card title={label} sub={`${d.completed}/8 quarters · ${d.strategy}`} icon="users" testId="v2-debrief-team">
      {timeline}
      <details className="ds-fold" open={open} style={{ marginTop: 12 }}>
      <summary>Decisions, commitments, votes and trajectory</summary>
      <div className="ds-fold-body ds-grid ds-grid-main">
        <div className="ds-stack">
          {d.final && <div className="ds-row"><span className="ds-badge ds-badge-accent">Overall {d.final.overall.toFixed(1)}</span><span className="ds-small">Financial {d.final.financial.toFixed(1)} · Strategic {d.final.strategic.toFixed(1)} · Organizational {d.final.organizational.toFixed(1)}</span></div>}
          <div><p className="ds-h4">Major decisions</p><ul className="ds-list ds-small">{d.decisions.map(x => <li key={x.quarter}><b>{calendarLabel(x.quarter)}:</b> {x.text}{x.belief ? <span className="ds-muted"> — belief: {x.belief}</span> : null}</li>)}</ul></div>
          {d.pivotal.length > 0 && <div><p className="ds-h4">Pivotal moments</p><ul className="ds-list ds-small">{d.pivotal.map(p => <li key={p.quarter}><b>{calendarLabel(p.quarter)}:</b> {p.text}</li>)}</ul></div>}
          <div data-testid="v2-debrief-commitments"><p className="ds-h4">How each quarter was committed</p><ul className="ds-list ds-small">{d.commitments.map(c => <li key={c.quarter} data-kind={c.kind}><b>{calendarLabel(c.quarter)}:</b> {c.text}</li>)}</ul></div>
          <div><p className="ds-h4">Disagreements (revealed private votes)</p>{d.disagreements.length ? <ul className="ds-list ds-small">{d.disagreements.map(x => <li key={x.quarter}><b>{calendarLabel(x.quarter)}:</b> {x.text}</li>)}</ul> : <p className="ds-muted">No significant dissent recorded.</p>}</div>
          <div><p className="ds-h4">Discussion questions</p><ol className="ds-list ds-small">{d.questions.map(q => <li key={q}>{q}</li>)}</ol></div>
        </div>
        <div className="ds-stack">
          <div><p className="ds-h4">Revenue</p><LineChart label={`${label} revenue`} points={d.trajectory.map(t => ({ x: t.quarter, y: t.revenue }))} format={v => `$${v.toFixed(0)}M`} zeroLine={false} /></div>
          <div><p className="ds-h4">Cash</p><LineChart label={`${label} cash`} points={d.trajectory.map(t => ({ x: t.quarter, y: t.cash }))} format={v => `$${v.toFixed(0)}M`} color="var(--ds-s3)" /></div>
          <div className="ds-small"><b>Strongest:</b> {d.strongest.join(', ')}<br /><b>Weakest:</b> {d.weakest.join(', ')}</div>
        </div>
      </div>
      </details>
    </Card>
  );
}

/** Cross-team leadership comparison and awards (facilitator only). Teams are compared at the same quarter. */
function Leadership({ teams, onRefresh, busy }: { teams: AwardTeam[]; onRefresh: () => void; busy: boolean }) {
  const awards = useMemo(() => computeAwards(teams), [teams]);
  const q = awards.quarter;
  const rows = useMemo(() => teams.map(t => {
    const recs = t.records.slice(0, q);
    if (!recs.length) return { t, price: null as number | null, cards: [] as ReturnType<typeof allScorecards>, s: null as null | typeof recs[number]['after'] };
    return { t, price: valuationSeries(recs).points[q].price, cards: allScorecards(recs, q), s: recs[recs.length - 1].after };
  }), [teams, q]);
  return (
    <div className="ds-stack-lg" data-testid="v2-fac-leadership">
      <div className="ds-row"><button className="ds-btn ds-btn-secondary ds-btn-sm" disabled={busy} onClick={onRefresh}><Icon name="clock" size={14} />Refresh</button>
        <span className="ds-muted">{q > 0 ? `All teams compared at ${calendarLabel(q)} — the latest quarter every team has completed. Role columns show functional scores; * = capped by the solvency gate.` : 'No team has completed a quarter yet.'}</span></div>
      {q > 0 && (
        <div className="ds-table-wrap">
          <table className="ds-table" data-testid="v2-fac-leadership-table">
            <thead><tr><th>Team</th><th className="num">Share price</th><th className="num">Revenue</th><th className="num">Op. profit</th><th className="num">Cash</th>{SCORECARD_ROLES.map(r => <th key={r} className="num">{r === 'Product' ? 'CPO' : r === 'Growth' ? 'CGO' : r === 'People' ? 'CPeO' : r}</th>)}<th className="num">Team (executive)</th></tr></thead>
            <tbody>{rows.map(r => r.s && (
              <tr key={r.t.teamId}>
                <td><b>{r.t.teamName}</b></td>
                <td className="num">{fmtPrice(r.price!)} <span className="ds-muted">{fmtPctDelta(r.price! / 100 - 1)}</span></td>
                <td className="num">{money(r.s.revenue)}</td><td className="num">{money(r.s.operatingProfit)}</td><td className="num">{money(r.s.cash)}</td>
                {r.cards.map(c => <td key={c.role} className="num" title={`Executive ${c.executive.toFixed(0)} (60% functional, 40% shareholder value)`}>{c.functional.toFixed(0)}{c.gate ? '*' : ''}</td>)}
                <td className="num"><b>{(r.cards.reduce((a, c) => a + c.executive, 0) / r.cards.length).toFixed(0)}</b></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <section data-testid="v2-fac-awards">
        <p className="ds-eyebrow">Leadership awards</p>
        {!awards.available ? <p className="ds-callout" data-testid="v2-fac-awards-unavailable"><Icon name="clock" />{awards.reason}</p> : (
          <table className="ds-table">
            <thead><tr><th>Award</th><th>Awarded to</th><th className="num">Score</th><th className="num">Next best</th><th>Basis</th></tr></thead>
            <tbody>{awards.awards.map(a => (
              <tr key={a.id} data-award={a.id}>
                <td><b>{a.label}</b></td>
                <td>{a.winners.map(w => a.id === 'team' ? w : `${w} — ${ROLE_SCORECARD_TITLE[a.id as keyof typeof ROLE_SCORECARD_TITLE]} role`).join('; ')}{a.winners.length > 1 && <span className="ds-muted"> (shared: within {AWARD_RULES.shareWithin} point)</span>}</td>
                <td className="num">{a.score.toFixed(1)}</td>
                <td className="num ds-muted">{a.runnerUp === null ? '—' : a.runnerUp.toFixed(1)}</td>
                <td className="ds-small">{a.basis}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {awards.excluded.length > 0 && <p className="ds-small">{awards.excluded.map(e => `${e.teamName} ${e.reason}`).join('; ')}.</p>}
        <p className="ds-method">Role awards rank functional scores (shareholder value is shared by every role in a team, so it decides only the team award). Rules: at least {AWARD_RULES.minTeams} teams, compared at the same quarter, once every team has completed {AWARD_RULES.minQuarter} quarters; teams that became insolvent are not eligible; a lead under {AWARD_RULES.shareWithin} point is a shared award. Awards belong to the team’s executive function — the platform does not observe individual contributions, and in teams of three or four one student may hold several roles. If you wish to recognise individuals, assign the award yourself in class.</p>
      </section>
    </div>
  );
}
