import { useEffect, useRef, useState } from 'react';
import { getQuarterBriefing, V2_ROLES, workingQuarter, configOf, usesStage4Experience } from '../../engine';
import { LeadershipBrief } from './LeadershipBrief';
import type { V2Role } from '../../types';
import type { V2TeamController } from '../useV2Team';
import { evidenceKind } from '../../content/scenarioContent';
import { chapterFor, quarterCardFor, signalPlainFor, contentPath } from '../../content/paths';
import { pick, V2PresentationMode } from '../../content/modes';
import { buildRoleBriefing, ROLE_TITLES } from '../../content/roleContent';
import { EvidenceList, Icon, Section } from '../ds/components';
import { Term } from '../ds/glossary';
import { calendarLabel, calendarShort } from '../../content/calendar';
import { CompanyIntro } from './CompanyIntro';

/** Stage 1 — The Challenge: the quarter-opening chapter, what changed, the evidence, and the private role briefings. */
export function ChallengeStage({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  // Stage 4B: v3-econ-1.1 games use the combined Leadership Team Brief; V2 and v3-econ-1.0 keep this stage unchanged.
  if (usesStage4Experience(ctl.game!.snapshot)) return <LeadershipBrief ctl={ctl} mode={mode} deviceRole={deviceRole} />;
  return <ChallengeStageOriginal ctl={ctl} mode={mode} deviceRole={deviceRole} />;
}

function ChallengeStageOriginal({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const path = contentPath(game.snapshot);
  const card = quarterCardFor(q, path);
  const chapter = chapterFor(q, path);
  const b = getQuarterBriefing(q, configOf(game.snapshot));
  const [viewing, setViewing] = useState<V2Role | null>(null);
  const individual = game.session.participation_mode === 'individual_device';
  const briefed = ctl.draft?.briefed ?? [];
  const next = V2_ROLES.find(r => !briefed.includes(r)) ?? null;
  const allBriefed = individual || next === null;
  const evidence = b.signals.map(s => ({ id: s.id, evidence: evidenceKind(s.kind === 'measured' ? 'measured' : s.kind), text: mode === 'undergraduate' && signalPlainFor(s.id, path) ? signalPlainFor(s.id, path)! : s.label }));
  const briefRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (viewing && briefRef.current) briefRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, [viewing]);
  // The full-height opener greets the team at the start of the quarter; once briefings begin it becomes compact.
  const compact = briefed.length > 0 || viewing !== null;
  const focusBrief = viewing !== null || (individual && !!deviceRole);

  if (q === 1 && !ctl.draft?.introSeen && !viewing) {
    return <div data-testid="v2-phase-briefing"><CompanyIntro mode={mode} busy={ctl.busy} onBegin={() => { ctl.updateDraft({ introSeen: true }, { immediate: true }); window.scrollTo?.(0, 0); }} /></div>;
  }
  return (
    <div className="ds-stack-lg" data-testid="v2-phase-briefing">
      <section className={`ds-chapter ${compact ? 'ds-chapter-compact' : ''}`} data-testid="v2-briefing" data-chapter-title={chapter.title}>
        <span className="ds-chapter-kicker">{calendarLabel(q)} · Quarter {q} of 8 · Understand</span>
        <h1 className="ds-chapter-title" data-testid="v2-chapter-title">{chapter.title}</h1>
        <p className="ds-chapter-sub">{pick(mode, chapter.sub)}</p>
        <div className="ds-chapter-rule" />
        <h2 className="ds-chapter-headline" data-testid="v2-headline">{pick(mode, card.headline)}</h2>
        <p className="ds-chapter-body">{pick(mode, card.whatHappened)}</p>
        <div className="ds-chapter-question" data-testid="v2-challenge-question"><Icon name="target" size={18} /> <span>{pick(mode, card.challenge)}</span></div>
      </section>

      <Section eyebrow="Why it matters" testId="v2-why-it-matters" >
        <ol className="ds-numbered">{card.whyItMatters.map((w, i) => <li key={i}>{pick(mode, w)}</li>)}</ol>
      </Section>

      <div className={`ds-grid ${focusBrief ? 'ds-grid-focus' : 'ds-grid-main'}`}>
        <Section eyebrow="Market evidence" title={mode === 'undergraduate' ? 'What everyone can see' : 'The shared evidence'}>
          <EvidenceList items={evidence} testId="v2-shared-signals" />
          <p className="ds-muted" style={{ marginTop: 10 }}>Market News is what people are saying. Industry Estimates are ranges, not facts. Company Data is what we measured.</p>
        </Section>

        <div ref={briefRef} className="ds-panel" data-testid="v2-role-briefings" style={{ scrollMarginTop: 16 }}>
          <p className="ds-eyebrow"><Icon name="lock" size={13} /> Confidential executive briefings</p>
          {individual && deviceRole ? (
            <RoleBriefingView ctl={ctl} role={deviceRole} mode={mode} />
          ) : viewing ? (
            <>
              <RoleBriefingView ctl={ctl} role={viewing} mode={mode} />
              <div className="ds-actions">
                <button className="ds-btn ds-btn-primary" data-testid="v2-hide-brief" onClick={() => {
                  if (!briefed.includes(viewing)) ctl.updateDraft({ briefed: [...briefed, viewing] }, { immediate: true });
                  setViewing(null);
                }}><Icon name="lock" /> Hide my brief and pass the device</button>
              </div>
            </>
          ) : next ? (
            <div className="ds-pass" data-testid="v2-pass-device">
              <div className="ds-avatar">{ROLE_TITLES[next]}</div>
              <div style={{ fontSize: '1.1em' }}>Pass the device to the <b data-testid="v2-next-role">{next}</b>.</div>
              <div className="ds-muted">Only the {next} should look at the next screen. In a smaller team, one person can hold several roles — read each brief in turn.</div>
              <button className="ds-btn ds-btn-chapter" data-testid="v2-open-brief" onClick={() => setViewing(next)}><Icon name="eye" /> I am the {next} — show my brief</button>
              <div className="ds-roles">{V2_ROLES.map(r => <span key={r} className={`ds-role-pill ${briefed.includes(r) ? 'done' : ''}`}>{briefed.includes(r) && <Icon name="check" size={12} />}{r}</span>)}</div>
            </div>
          ) : (
            <div className="ds-stack">
              <p style={{ margin: 0 }}><b>All five leaders have read their briefs.</b> Share what you learned, then decide together.</p>
              <div className="ds-row">{V2_ROLES.map(r => <button key={r} className="ds-btn ds-btn-secondary" style={{ minHeight: 38, padding: '6px 12px' }} onClick={() => setViewing(r)}>{r}</button>)}</div>
              <p className="ds-muted" style={{ margin: 0 }}>A leader can re-open their own brief — keep the screen to yourself.</p>
            </div>
          )}
        </div>
      </div>

      <div className="ds-actions ds-actions-sticky">
        {!allBriefed && <span className="ds-muted">Every leader reads their brief before the team decides.</span>}
        <button className="ds-btn ds-btn-chapter ds-btn-lg" data-testid="v2-to-decide" disabled={!allBriefed || ctl.busy || viewing !== null} onClick={() => void ctl.go('decide')}>
          Go to discuss and decide <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

const ROLE_ASK: Record<V2Role, string> = { CEO: 'the CEO', CFO: 'the CFO', Product: 'the Product lead', People: 'the People lead', Growth: 'the Growth lead' };

function PositionTable({ rows, q }: { rows: ReturnType<typeof buildRoleBriefing>['position']; q: number }) {
  const showPrev = q > 2;
  return (
    <div className="ds-table-wrap">
      <table className="ds-position">
        <thead><tr><th>Indicator</th>{q > 1 && <th>{calendarShort(0)}</th>}{showPrev && <th>{calendarShort(q - 2)}</th>}<th>{calendarShort(q - 1)}</th>{q > 1 && <th>Change</th>}</tr></thead>
        <tbody>{rows.map(p => (
          <tr key={p.id} data-kpi={p.id}>
            <td>{p.glossary ? <Term id={p.glossary}>{p.label}</Term> : p.label}</td>
            {q > 1 && <td className="ds-muted">{p.start ?? '—'}</td>}
            {showPrev && <td className="ds-muted">{p.previous ?? '—'}</td>}
            <td><b>{p.value}</b></td>
            {q > 1 && <td style={{ whiteSpace: 'nowrap' }} className={p.change?.direction === 'flat' || !p.change ? 'ds-muted' : ''}>{p.change ? <><span aria-hidden>{p.change.direction === 'up' ? '▲ ' : p.change.direction === 'down' ? '▼ ' : ''}</span>{p.change.text}</> : ''}</td>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

/** Confidential role briefing — a 60–90 second read: mandate, position, intelligence, concerns, questions. */
export function RoleBriefingView({ ctl, role, mode }: { ctl: V2TeamController; role: V2Role; mode: V2PresentationMode }) {
  const brief = buildRoleBriefing(ctl.game!.snapshot, role, mode);
  const q = workingQuarter(ctl.game!.snapshot)!;
  const more = brief.position.length - brief.priority.length;
  const [allOpen, setAllOpen] = useState(false);
  return (
    <div className="ds-brief" data-testid="v2-role-brief" data-role={role}>
      <span className="ds-brief-classification">Confidential · {calendarLabel(q)}</span>
      <div className="ds-brief-head"><b>{brief.title}</b><span className="ds-muted">{brief.perspective}</span></div>
      <div className="ds-brief-body">
        <div>
          <div className="ds-brief-section" data-testid="v2-brief-mandate">
            <p className="ds-h4">Your mandate</p>
            <p style={{ margin: 0 }} data-testid="v2-brief-responsibility">{brief.responsibility}</p>
            <details className="ds-perspectives" open={q === 1} data-testid="v2-brief-objectives" style={{ marginTop: 6 }}>
              <summary>Standing objectives</summary>
              <ul className="ds-list ds-small" style={{ marginTop: 4 }}>{brief.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </details>
          </div>
          <div className="ds-brief-section" data-testid="v2-brief-position">
            <p className="ds-h4">Your current position</p>
            <PositionTable rows={brief.priority} q={q} />
            {more > 0 && (
              <details className="ds-perspectives" data-testid="v2-brief-all-kpis" style={{ marginTop: 6 }} onToggle={e => setAllOpen((e.target as HTMLDetailsElement).open)}>
                <summary>All {brief.position.length} indicators you track</summary>
                {allOpen && <div style={{ marginTop: 6 }}><PositionTable rows={brief.position} q={q} /></div>}
              </details>
            )}
            <p className="ds-method" style={{ margin: '6px 0 0' }}>{q > 1 ? `Company data at the end of ${calendarLabel(q - 1)}. Change is versus the previous quarter.` : `Company data at the end of ${calendarLabel(0)} — where your leadership begins.`}</p>
          </div>
        </div>
        <div>
          <div className="ds-brief-section" data-testid="v2-brief-evidence">
            <p className="ds-h4">Confidential intelligence</p>
            {brief.evidence.length > 0 && <div style={{ marginBottom: 6 }}><EvidenceList items={brief.evidence} testId="v2-role-signals" /></div>}
            <p className="ds-small" style={{ margin: '4px 0 2px', fontWeight: 600 }}>Two ways to read it</p>
            <ul className="ds-list ds-small">{brief.suggests.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <div className="ds-brief-section" data-testid="v2-brief-uncertain">
            <p className="ds-h4">What concerns you</p>
            <ul className="ds-list ds-small">{brief.uncertain.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <div className="ds-brief-section" data-testid="v2-brief-discuss">
            <p className="ds-h4">Questions for your colleagues</p>
            <ul className="ds-list ds-small">{brief.discuss.map((d, i) => <li key={i}><b>Ask {ROLE_ASK[d.with]}:</b> {d.ask}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}
