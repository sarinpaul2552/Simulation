/**
 * Batch 10E facilitator views: Class discussion, Team timelines, Final debrief, reflection review and the stage clock.
 * Built only from the existing PIN-protected debrief data (resolved quarters). No scores are created here.
 */
import { useEffect, useMemo, useReducer, useState } from 'react';
import { calendarLabel } from '../content/calendar';
import type { V2FacilitatorOverview } from '../api';
import type { V2PresentationMode } from '../content/modes';
import {
  type FacTeam, fourColumns, teamTimeline, teamPathSummary, classPattern, q3SignalPanel, q3ToQ4, biggestChanges, learningTally,
  visibleNotes, reflectionKey, CHANGE_RULES, ALIGNMENT_RULES, FINAL_DEBRIEF_AGENDA, type FourColumns,
} from '../insights/facilitator';
import { clockReducer, clockText, initialClock, CLOCK_PRESETS } from '../insights/stageClock';
import { priorityLabel } from '../content/decisionFraming';
import { destinationName, FINAL_LABELS, money } from './format';
import { Icon, Segmented } from './ds/components';

type Labels = Record<string, string>;
export interface NoteSelection { selected: ReadonlySet<string>; toggle: (key: string) => void }

// ───────────────────────────── shared cells ─────────────────────────────

function IntendedCell({ c }: { c: FourColumns['intended'] }) {
  return (
    <div className="ds-small">
      <div><b>{c.priority ?? 'Priority not recorded'}</b></div>
      {c.belief && <div>{c.belief}{c.confidence ? <span className="ds-muted"> · {c.confidence.toLowerCase()} confidence</span> : null}</div>}
      {c.signals.length > 0 && <div><span className="ds-muted">Signals cited:</span> {c.signals.join(' · ')}</div>}
      {c.risk && <div><span className="ds-muted">Biggest risk:</span> {c.risk}</div>}
    </div>
  );
}
function DecidedCell({ c }: { c: FourColumns['decided'] }) {
  return <div className="ds-small"><div>{c.allocation}</div>{c.event && <div><b>{c.event}</b></div>}{c.commitment && <div className="ds-muted">{c.commitment}</div>}</div>;
}
function HappenedCell({ c }: { c: FourColumns['happened'] }) {
  return <div className="ds-small"><div><span className="ds-muted">Revenue</span> {c.revenue}</div><div><span className="ds-muted">Cash</span> {c.cash}</div><div><span className="ds-muted">Share price</span> {c.price}</div></div>;
}
function LearnedCell({ c, note, noteKey, projector, sel }: { c: FourColumns['learned']; note: string | null; noteKey: string; projector: boolean; sel: NoteSelection }) {
  const shown = sel.selected.has(noteKey);
  return (
    <div className="ds-small">
      <div>{c.choices.length ? c.choices.join(' · ') : <span className="ds-muted">Not recorded</span>}</div>
      {note && (projector
        ? (shown ? <div data-testid="v2-fac-note-shown">“{note}”</div> : null)
        : <div className="ds-muted" data-testid="v2-fac-note-hidden">Written reflection hidden · {shown ? 'selected for display' : 'review below'}</div>)}
    </div>
  );
}

/** Review free-text reflections (normal view) and select individual notes for display; projector shows only selected ones. */
export function ReflectionReview({ teams, labels, projector, sel, quarter }: { teams: FacTeam[]; labels: Labels; projector: boolean; sel: NoteSelection; quarter?: number }) {
  const notes = visibleNotes(teams, sel.selected, projector, quarter);
  if (projector) {
    return notes.length ? (
      <ul className="ds-list-plain" data-testid="v2-fac-notes-projected">{notes.map(n => <li key={n.key}><b>{labels[n.teamId]}, {calendarLabel(n.quarter)}:</b> “{n.note}”</li>)}</ul>
    ) : <p className="ds-muted" data-testid="v2-fac-notes-projected-empty">No written reflection selected for display.</p>;
  }
  return (
    <details className="ds-fold" data-testid="v2-fac-review-notes">
      <summary>Review written reflections ({notes.length})<span className="ds-fold-hint">Hidden from the projector unless you select them · {notes.filter(n => n.selected).length} selected</span></summary>
      <div className="ds-fold-body">
        {notes.length === 0 ? <p className="ds-muted">No written reflections yet.</p> : (
          <ul className="ds-list-plain">{notes.map(n => (
            <li key={n.key} data-testid="v2-fac-note" data-key={n.key} data-selected={n.selected}>
              <label className="ds-small" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input type="checkbox" data-testid="v2-fac-note-toggle" checked={n.selected} onChange={() => sel.toggle(n.key)} />
                <span><b>{labels[n.teamId]}, {calendarLabel(n.quarter)}:</b> “{n.note}”</span>
              </label>
            </li>
          ))}</ul>
        )}
        <p className="ds-method" style={{ margin: '6px 0 0' }}>Selected reflections appear in projector view with an anonymised team label.</p>
      </div>
    </details>
  );
}

// ───────────────────────────── Class discussion ─────────────────────────────

export function ClassDiscussion({ teams, labels, projector, gateOpen, gateProgress, mode, sel, financial }: {
  teams: FacTeam[]; labels: Labels; projector: boolean; gateOpen: boolean; gateProgress: string; mode: V2PresentationMode; sel: NoteSelection; financial: React.ReactNode;
}) {
  const withData = teams.filter(t => t.completed > 0);
  const maxQ = Math.max(0, ...withData.map(t => t.completed));
  const minQ = withData.length ? Math.max(1, Math.min(...withData.map(t => t.completed))) : 1;
  const [q, setQ] = useState<number>(minQ);
  useEffect(() => { if (q > maxQ && maxQ > 0) setQ(maxQ); }, [q, maxQ]);
  if (!withData.length) return <p className="ds-muted" data-testid="v2-fac-discussion">No team has completed a quarter yet.</p>;
  const pattern = classPattern(teams, q, mode);
  const rows = teams.map(t => ({ t, qq: t.quarters.find(x => x.quarter === q) })).filter(r => r.qq);
  const waiting = teams.filter(t => !t.quarters.find(x => x.quarter === q));
  return (
    <div className="ds-stack" data-testid="v2-fac-discussion" data-quarter={q}>
      <div className="ds-row">
        <span className="ds-small" style={{ fontWeight: 650 }}>Quarter</span>
        <Segmented testIdPrefix="v2-fac-q" value={q} onChange={setQ} options={Array.from({ length: maxQ }, (_, i) => ({ id: i + 1, label: `Q${i + 1}` }))} />
        <span className="ds-muted ds-small">{calendarLabel(q)} · intended → decided → happened → learned</span>
      </div>
      {pattern.length > 0 && <ul className="ds-list ds-small" data-testid="v2-fac-pattern" style={{ margin: 0 }}>{pattern.map(l => <li key={l}>{l}</li>)}</ul>}
      <div className="ds-table-wrap">
        <table className="ds-table ds-table-compact" data-testid="v2-fac-discussion-table">
          <thead><tr><th>Team</th><th>Intended</th><th>Decided</th><th>Happened</th><th>Learned</th></tr></thead>
          <tbody>{rows.map(({ t, qq }) => {
            const c = fourColumns(qq!, mode);
            return (
              <tr key={t.teamId} data-team-label={labels[t.teamId]}>
                <td style={{ whiteSpace: 'nowrap' }}><b>{labels[t.teamId]}</b></td>
                <td><IntendedCell c={c.intended} /></td>
                <td><DecidedCell c={c.decided} /></td>
                <td><HappenedCell c={c.happened} /></td>
                <td><LearnedCell c={c.learned} note={qq!.reflection?.note ?? null} noteKey={reflectionKey(t.teamId, q)} projector={projector} sel={sel} /></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {waiting.length > 0 && <p className="ds-muted ds-small" style={{ margin: 0 }}>Not yet completed {calendarLabel(q)}: {waiting.map(t => labels[t.teamId]).join(', ')}.</p>}
      <ReflectionReview teams={teams} labels={labels} projector={projector} sel={sel} quarter={q} />
      {q === 3 && <Q3Panel teams={teams} labels={labels} gateOpen={gateOpen} gateProgress={gateProgress} mode={mode} />}
      {financial}
    </div>
  );
}

function Q3Panel({ teams, labels, gateOpen, gateProgress, mode }: { teams: FacTeam[]; labels: Labels; gateOpen: boolean; gateProgress: string; mode: V2PresentationMode }) {
  const rows = q3SignalPanel(teams, gateOpen, mode);
  return (
    <section data-testid="v2-fac-q3-panel" data-gate={gateOpen ? 'open' : 'closed'}>
      <p className="ds-eyebrow">Q3 signals: what each team relied on</p>
      {!gateOpen && <p className="ds-callout" data-testid="v2-fac-q3-gate"><Icon name="clock" />Assessments appear once every participating team has completed {calendarLabel(4)} ({gateProgress}). There is no early override.</p>}
      <div className="ds-table-wrap">
        <table className="ds-table ds-table-compact">
          <thead><tr><th>Signal</th><th className="num">Cited by</th><th>Teams</th>{gateOpen && <><th>Assessment</th><th>What the market showed</th></>}</tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} data-signal={r.id}>
              <td>{r.label}</td><td className="num">{r.citedBy.length}</td><td className="ds-small">{r.citedBy.map(id => labels[id]).join(', ') || <span className="ds-muted">—</span>}</td>
              {gateOpen && <><td><b data-testid="v2-fac-q3-verdict">{r.verdict}</b></td><td className="ds-small">{r.showed}</td></>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}

// ───────────────────────────── Team timelines ─────────────────────────────

export function TeamTimeline({ team, label, projector, mode, sel, extra }: { team: FacTeam; label: string; projector: boolean; mode: V2PresentationMode; sel: NoteSelection; extra?: React.ReactNode }) {
  const rows = useMemo(() => teamTimeline(team, mode), [team, mode]);
  return (
    <div className="ds-stack" data-testid="v2-fac-timeline" data-team-label={label}>
      <p style={{ margin: 0 }} data-testid="v2-fac-path-summary">{teamPathSummary(rows)}</p>
      <div className="ds-table-wrap">
        <table className="ds-table ds-table-compact">
          <thead><tr><th>Quarter</th><th>Intended</th><th>Decided</th><th>Happened</th><th>Learned</th><th>Direction</th></tr></thead>
          <tbody>{rows.map(r => {
            const qq = team.quarters.find(x => x.quarter === r.quarter)!;
            return (
              <tr key={r.quarter} data-quarter={r.quarter} data-pattern={r.pattern} data-misalignment={!!r.misalignment}>
                <td style={{ whiteSpace: 'nowrap' }}><b>{calendarLabel(r.quarter)}</b></td>
                <td><IntendedCell c={r.cols.intended} /></td>
                <td><DecidedCell c={r.cols.decided} /></td>
                <td><HappenedCell c={r.cols.happened} /></td>
                <td><LearnedCell c={r.cols.learned} note={qq.reflection?.note ?? null} noteKey={reflectionKey(team.teamId, r.quarter)} projector={projector} sel={sel} /></td>
                <td className="ds-small" data-testid="v2-fac-direction">
                  <div>{r.patternText}</div>
                  {r.changes.length > 0 && <ul className="ds-list" style={{ margin: '4px 0 0' }}>{r.changes.map(c => <li key={c.text} data-kind={c.kind}>{c.text}</li>)}</ul>}
                  {r.context.map(c => <div key={c.text} className="ds-muted">{c.text}</div>)}
                  {r.misalignment && <div style={{ marginTop: 4 }} data-testid="v2-fac-misalignment">{r.misalignment}</div>}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
      {extra}
    </div>
  );
}

export function RulesNote() {
  return (
    <details className="ds-fold" data-testid="v2-fac-rules">
      <summary>How directions are described<span className="ds-fold-hint">Descriptions, not scores</span></summary>
      <div className="ds-fold-body ds-small">
        <p style={{ marginTop: 0 }}><b>Continuity</b>: no change of direction against the previous quarter. <b>Adaptation</b>: at least one change of direction. Neither is better than the other. {CHANGE_RULES.text}</p>
        <p><b>Potential misalignment</b> is a question for discussion, raised only when a stated priority has a clear money signature:</p>
        <ul className="ds-list">{Object.entries(ALIGNMENT_RULES).map(([id, r]) => {
          const q = id.startsWith('q1-') ? 1 : id.startsWith('q3-') ? 3 : 4;
          return <li key={id}>“{priorityLabel(q, id)?.ug}” — flagged when {r.rule}.</li>;
        })}</ul>
      </div>
    </details>
  );
}

// ───────────────────────────── Final debrief ─────────────────────────────

export function FinalDebrief({ teams, overview, labels, projector, gateOpen, gateProgress, mode, sel }: {
  teams: FacTeam[]; overview: V2FacilitatorOverview; labels: Labels; projector: boolean; gateOpen: boolean; gateProgress: string; mode: V2PresentationMode; sel: NoteSelection;
}) {
  const started = overview.teams.filter(t => t.started);
  const finished = started.filter(t => t.completed_quarter >= 8).length;
  const big = biggestChanges(teams, 3);
  const q34 = q3ToQ4(teams, gateOpen, mode);
  return (
    <div className="ds-stack-lg" data-testid="v2-fac-final">
      {finished < started.length && <p className="ds-callout" data-testid="v2-fac-final-partial"><Icon name="clock" />{finished} of {started.length} teams have finished. Figures below cover completed quarters only.</p>}
      <section data-testid="v2-fac-agenda">
        <p className="ds-eyebrow">Suggested 20-minute running order</p>
        <ol className="ds-numbered">{FINAL_DEBRIEF_AGENDA.map(a => <li key={a.title}><span><b>{a.minutes} min · {a.title}.</b> <span className="ds-small">{a.detail}</span></span></li>)}</ol>
      </section>
      <section>
        <p className="ds-eyebrow">1 · Where teams ended</p>
        <div className="ds-table-wrap">
          <table className="ds-table ds-table-compact" data-testid="v2-fac-endings">
            <thead><tr><th>Team</th><th>Quarters</th><th className="num">Share price</th><th className="num">Revenue</th><th className="num">Cash</th><th>Strategy</th><th>Final decision</th><th className="num">Terminal score</th></tr></thead>
            <tbody>{overview.teams.filter(t => t.headline).map(t => {
              const ft = teams.find(x => x.teamId === t.team_id);
              const last = ft?.quarters[ft.quarters.length - 1];
              const h = t.headline!;
              return (
                <tr key={t.team_id}>
                  <td><b>{labels[t.team_id]}</b></td><td>{t.completed_quarter}/8</td>
                  <td className="num">{last ? `$${last.price.toFixed(2)}` : '—'}</td><td className="num">{money(h.revenue)}</td><td className="num">{money(h.cash)}</td>
                  <td>{h.completedQuarter >= 4 ? destinationName(h.destination) : '—'}</td><td>{h.finalOption ? FINAL_LABELS[h.finalOption] : '—'}</td>
                  <td className="num">{h.final ? h.final.overall.toFixed(1) : '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <p className="ds-method" style={{ margin: '6px 0 0' }}>Existing simulation figures only; no new ranking or leadership grade.</p>
      </section>
      <section data-testid="v2-fac-big-changes">
        <p className="ds-eyebrow">2 · Biggest changes of direction</p>
        {big.length ? <ul className="ds-list">{big.map(c => <li key={`${c.teamId}-${c.quarter}`}><b>{labels[c.teamId]}, {calendarLabel(c.quarter)}:</b> {c.items.join('; ')}</li>)}</ul> : <p className="ds-muted">No change of direction flagged yet.</p>}
        <p className="ds-small" style={{ margin: 0 }}>Ask: what did the team see that made it change — or stay?</p>
      </section>
      <section data-testid="v2-fac-q3-q4">
        <p className="ds-eyebrow">3 · Q3 evidence and the Q4 commitment</p>
        {!gateOpen && <p className="ds-callout" data-testid="v2-fac-q3-gate"><Icon name="clock" />Signal assessments appear once every participating team has completed {calendarLabel(4)} ({gateProgress}).</p>}
        {q34.length ? (
          <div className="ds-table-wrap">
            <table className="ds-table ds-table-compact">
              <thead><tr><th>Team</th><th>Signals cited in Q3</th>{gateOpen && <th>Assessment</th>}<th>Q4 priority</th><th>Q4 commitment</th></tr></thead>
              <tbody>{q34.map(r => (
                <tr key={r.teamId}><td><b>{labels[r.teamId]}</b></td><td className="ds-small">{r.signals.join(' · ') || <span className="ds-muted">Not recorded</span>}</td>
                  {gateOpen && <td className="ds-small">{r.verdicts.filter(Boolean).join(' · ') || '—'}</td>}
                  <td className="ds-small">{r.q4Priority ?? <span className="ds-muted">Not recorded</span>}</td><td>{r.destination ?? '—'}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="ds-muted">No team has completed {calendarLabel(4)} yet.</p>}
      </section>
      <section data-testid="v2-fac-differently">
        <p className="ds-eyebrow">4 · What would you do differently?</p>
        <ul className="ds-list ds-small">{Array.from({ length: 8 }, (_, i) => i + 1).map(q => { const t = learningTally(teams, q, mode); return t ? <li key={q}><b>{calendarLabel(q)}:</b> {t}</li> : null; })}</ul>
        <ReflectionReview teams={teams} labels={labels} projector={projector} sel={sel} />
      </section>
    </div>
  );
}

// ───────────────────────────── stage clock ─────────────────────────────

/** Facilitator-only countdown. Local to this browser; never opens, advances or locks a quarter. */
export function StageClock() {
  const [state, dispatch] = useReducer(clockReducer, initialClock(6));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.startedAt === null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [state.startedAt]);
  const running = state.startedAt !== null;
  const text = clockText(state, now);
  const minutes = Math.round(state.durationMs / 60_000);
  return (
    <div className="ds-row" data-testid="v2-fac-clock" data-running={running} style={{ gap: 8 }}>
      <span className="ds-small" style={{ fontWeight: 650 }}>Stage clock</span>
      <select className="ds-input" data-testid="v2-fac-clock-preset" value={minutes} onChange={e => dispatch({ type: 'set', minutes: Number(e.target.value) })} aria-label="Stage clock duration">
        {CLOCK_PRESETS.map(p => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
      </select>
      <b className="ds-num" data-testid="v2-fac-clock-time" aria-live="off" style={{ minWidth: 48 }}>{text}</b>
      {running
        ? <button className="ds-btn ds-btn-secondary ds-btn-sm" data-testid="v2-fac-clock-pause" onClick={() => { const n = Date.now(); setNow(n); dispatch({ type: 'pause', now: n }); }}>Pause</button>
        : <button className="ds-btn ds-btn-secondary ds-btn-sm" data-testid="v2-fac-clock-start" onClick={() => { const n = Date.now(); setNow(n); dispatch({ type: 'start', now: n }); }}>Start</button>}
      <button className="ds-btn ds-btn-ghost ds-btn-sm" data-testid="v2-fac-clock-reset" onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <span className="ds-muted ds-small">Guidance only — never changes the game{text === 'Time' ? ' · time is up' : ''}.</span>
    </div>
  );
}
