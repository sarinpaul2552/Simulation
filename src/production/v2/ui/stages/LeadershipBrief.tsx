import { useMemo, useState } from 'react';
import { getQuarterBriefing, V2_ROLES, workingQuarter, configOf } from '../../engine';
import type { V2Role } from '../../types';
import type { V2TeamController } from '../useV2Team';
import { evidenceKind } from '../../content/scenarioContent';
import { chapterFor, quarterCardFor, signalPlainFor, contentPath } from '../../content/paths';
import { pick, V2PresentationMode } from '../../content/modes';
import { ROLE_TITLES } from '../../content/roleContent';
import { calendarLabel } from '../../content/calendar';
import { leadershipBrief, readinessRows } from '../../insights/leadershipBrief';
import { readinessLabel } from '../../content/stage4Content';
import { EvidenceList, Icon } from '../ds/components';
import { RoleBriefingView } from './ChallengeStage';
import { MeetYourCompany } from './MeetYourCompany';

/**
 * Stage 4B (v3-econ-1.1): the Understand stage as one Leadership Team Brief. Five executive cards (observation,
 * possible action, why) replace the five sequential private briefs; each full private brief stays one click away so a
 * facilitator can still run role-based discussion. Q4 shows the board's strategy readiness to the whole team.
 */
export function LeadershipBrief({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const snap = game.snapshot;
  const q = workingQuarter(snap)!;
  const path = contentPath(snap);
  const card = quarterCardFor(q, path);
  const chapter = chapterFor(q, path);
  const b = getQuarterBriefing(q, configOf(snap));
  const individual = game.session.participation_mode === 'individual_device';
  const views = useMemo(() => leadershipBrief(snap), [snap]);
  const ready = useMemo(() => (q === 4 ? readinessRows(snap) : []), [snap, q]);
  const evidence = b.signals.map(s => ({ id: s.id, evidence: evidenceKind(s.kind === 'measured' ? 'measured' : s.kind), text: mode === 'undergraduate' && signalPlainFor(s.id, path) ? signalPlainFor(s.id, path)! : s.label }));

  if (q === 1 && !ctl.draft?.introSeen) {
    return <div data-testid="v2-phase-briefing"><MeetYourCompany mode={mode} busy={ctl.busy} onBegin={() => { ctl.updateDraft({ introSeen: true }, { immediate: true }); window.scrollTo?.(0, 0); }} /></div>;
  }
  return (
    <div className="ds-stack-lg" data-testid="v2-phase-briefing">
      <header className="s4-head" data-testid="v2-briefing" data-chapter-title={chapter.title}>
        <p className="ds-eyebrow">{calendarLabel(q)} · Quarter {q} of 8 · {chapter.title}</p>
        <h1 className="ds-title s4-title" data-testid="v2-headline">{pick(mode, card.headline)}</h1>
        <p className="s4-lead">{pick(mode, card.whatHappened)}</p>
        <p className="s4-question" data-testid="v2-challenge-question"><Icon name="target" size={16} /> <span>{pick(mode, card.challenge)}</span></p>
      </header>

      {ready.length > 0 && (
        <section className="s4-card" data-testid="v2-readiness">
          <h2 className="s4-h3">Strategy readiness: the board’s assessment</h2>
          <p className="s4-muted" style={{ marginTop: 0 }}>How well the capabilities you built in {calendarLabel(1)}–{calendarLabel(3)} fit each strategy. Shared with the whole team before you commit.</p>
          <table className="s4-table">
            <tbody>{ready.map(r => { const l = readinessLabel(r.readiness); return (
              <tr key={r.id} data-destination={r.id} data-readiness={r.readiness.toFixed(1)}>
                <td>{r.name}</td>
                <td className="s4-bar-cell" aria-hidden><span className="s4-bar"><span style={{ width: `${Math.max(0, Math.min(100, r.readiness))}%` }} /></span></td>
                <td className="num"><b>{r.readiness.toFixed(0)}%</b></td>
                <td className={`s4-tone-${l.tone}`}>{l.text}</td>
              </tr>
            ); })}</tbody>
          </table>
        </section>
      )}

      <section data-testid="v2-leadership-brief">
        <div className="s4-section-head">
          <h2 className="s4-h2">Leadership team brief</h2>
          <p className="s4-muted">Five points of view, not one answer. They can disagree.</p>
        </div>
        <div className="s4-execs">
          {views.map(v => (
            <article key={v.role} className="s4-card s4-exec" data-testid={`v2-exec-${v.role}`} data-role={v.role}>
              <p className="s4-exec-role">{v.role}<span className="s4-muted"> · {ROLE_TITLES[v.role]}</span></p>
              <p className="s4-exec-obs">{v.observation}</p>
              <p className="s4-exec-act"><span className="s4-label">A possible action</span>{v.action}</p>
              <p className="s4-exec-why">{v.why}</p>
            </article>
          ))}
        </div>
      </section>

      <section data-testid="v2-shared-evidence">
        <h2 className="s4-h3">Market evidence everyone can see</h2>
        <EvidenceList items={evidence} testId="v2-shared-signals" />
      </section>

      <details className="s4-details" data-testid="v2-role-briefings" open={individual && !!deviceRole}>
        <summary>View details: each executive’s full brief{individual && deviceRole ? ` (you are the ${deviceRole})` : ''}</summary>
        <div className="s4-details-body ds-stack">
          <details className="s4-subdetails" data-testid="v2-why-it-matters">
            <summary>Why this quarter matters</summary>
            <ol className="ds-numbered">{card.whyItMatters.map((w, i) => <li key={i}>{pick(mode, w)}</li>)}</ol>
          </details>
          {(individual && deviceRole ? [deviceRole] : V2_ROLES).map(r => (
            <LazyBrief key={r} ctl={ctl} role={r} mode={mode} initiallyOpen={individual && deviceRole === r} />
          ))}
          <p className="s4-note" style={{ margin: 0 }}>Facilitators can assign one executive per student and ask each to argue their card.</p>
        </div>
      </details>

      <div className="ds-actions ds-actions-sticky">
        <button className="ds-btn ds-btn-chapter ds-btn-lg" data-testid="v2-to-decide" disabled={ctl.busy} onClick={() => void ctl.go('decide')}>
          Go to discuss and decide <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

/** A full private brief, built only when opened (each one replays the team's inputs). */
function LazyBrief({ ctl, role, mode, initiallyOpen }: { ctl: V2TeamController; role: V2Role; mode: V2PresentationMode; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <details className="s4-subdetails" data-testid={`v2-full-brief-${role}`} open={open} onToggle={e => setOpen((e.target as HTMLDetailsElement).open)}>
      <summary>{ROLE_TITLES[role]}</summary>
      {open && <RoleBriefingView ctl={ctl} role={role} mode={mode} />}
    </details>
  );
}
