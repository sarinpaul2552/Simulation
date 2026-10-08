import { useEffect, useRef, useState } from 'react';
import { getQuarterBriefing, V2_ROLES, workingQuarter } from '../../adapter';
import type { V2Role } from '../../types';
import type { V2TeamController } from '../useV2Team';
import { QUARTER_CARDS, SIGNAL_PLAIN, evidenceKind } from '../../content/scenarioContent';
import { CHAPTERS } from '../../content/chapters';
import { pick, V2PresentationMode } from '../../content/modes';
import { buildRoleBriefing } from '../../content/roleContent';
import { EvidenceList, Icon, Section } from '../ds/components';

/** Stage 1 — The Challenge: the quarter-opening chapter, what changed, the evidence, and the private role briefings. */
export function ChallengeStage({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const card = QUARTER_CARDS[q];
  const chapter = CHAPTERS[q];
  const b = getQuarterBriefing(q);
  const [viewing, setViewing] = useState<V2Role | null>(null);
  const individual = game.session.participation_mode === 'individual_device';
  const briefed = ctl.draft?.briefed ?? [];
  const next = V2_ROLES.find(r => !briefed.includes(r)) ?? null;
  const allBriefed = individual || next === null;
  const evidence = b.signals.map(s => ({ id: s.id, evidence: evidenceKind(s.kind === 'measured' ? 'measured' : s.kind), text: mode === 'undergraduate' && SIGNAL_PLAIN[s.id] ? SIGNAL_PLAIN[s.id] : s.label }));
  const briefRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (viewing && briefRef.current) briefRef.current.scrollIntoView?.({ block: 'start', behavior: 'smooth' }); }, [viewing]);
  // The full-height opener greets the team at the start of the quarter; once briefings begin it becomes compact.
  const compact = briefed.length > 0 || viewing !== null;
  const focusBrief = viewing !== null || (individual && !!deviceRole);

  return (
    <div className="ds-stack-lg" data-testid="v2-phase-briefing">
      <section className={`ds-chapter ds-enter ${compact ? 'ds-chapter-compact' : ''}`} data-testid="v2-briefing" data-chapter-title={chapter.title}>
        <span className="ds-chapter-num" aria-hidden="true">Q{q}</span>
        <span className="ds-chapter-kicker">Year {chapter.year} · Quarter {q} · The Challenge</span>
        <h1 className="ds-chapter-title" data-testid="v2-chapter-title">{chapter.title}</h1>
        <p className="ds-chapter-sub">{pick(mode, chapter.sub)}</p>
        <div className="ds-chapter-rule" />
        <h2 className="ds-chapter-headline" data-testid="v2-headline">{pick(mode, card.headline)}</h2>
        <p className="ds-chapter-body">{pick(mode, card.whatHappened)}</p>
        <div className="ds-chapter-question" data-testid="v2-challenge-question"><Icon name="target" size={18} /> <span>{pick(mode, card.challenge)}</span></div>
      </section>

      <Section eyebrow="Why it matters" testId="v2-why-it-matters" className="ds-enter-2">
        <ol className="ds-numbered">{card.whyItMatters.map((w, i) => <li key={i}>{pick(mode, w)}</li>)}</ol>
      </Section>

      <div className={`ds-grid ${focusBrief ? 'ds-grid-focus' : 'ds-grid-main'} ds-enter-3`}>
        <Section eyebrow="Market evidence" title={mode === 'undergraduate' ? 'What everyone can see' : 'The shared evidence'}>
          <EvidenceList items={evidence} testId="v2-shared-signals" />
          <p className="ds-muted" style={{ marginTop: 10 }}>Market News is what people are saying. Industry Estimates are ranges, not facts. Company Data is what we measured.</p>
        </Section>

        <div ref={briefRef} className="ds-panel" data-testid="v2-role-briefings" style={{ scrollMarginTop: 16 }}>
          <p className="ds-eyebrow"><Icon name="lock" size={13} /> Private role briefings</p>
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
              <div className="ds-avatar">{next.slice(0, 3)}</div>
              <div style={{ fontSize: '1.1em' }}>Pass the device to the <b data-testid="v2-next-role">{next}</b>.</div>
              <div className="ds-muted">Only the {next} should look at the next screen.</div>
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
          Go to the leadership decision <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function RoleBriefingView({ ctl, role, mode }: { ctl: V2TeamController; role: V2Role; mode: V2PresentationMode }) {
  const brief = buildRoleBriefing(ctl.game!.snapshot, role, mode);
  const stances = ctl.draft?.deliberation?.stances ?? {};
  const chosen = stances[role];
  const setStance = (id: string) => ctl.updateDraft({ deliberation: { ...(ctl.draft?.deliberation ?? {}), stances: { ...stances, [role]: id } } }, { immediate: true });
  return (
    <div className="ds-brief" data-testid="v2-role-brief" data-role={role}>
      <div className="ds-brief-head"><b>{brief.title}</b><span className="ds-muted">{brief.perspective}</span></div>
      <div className="ds-brief-body">
        <div>
          <div className="ds-brief-section">
            <p className="ds-h4">1 · Your responsibility</p>
            <p style={{ margin: 0 }}>{brief.responsibility}</p>
          </div>
          <div className="ds-brief-section">
            <p className="ds-h4">2 · What only you know</p>
            <EvidenceList items={brief.knowledge} testId="v2-role-signals" />
          </div>
        </div>
        <div>
          <div className="ds-brief-section">
            <p className="ds-h4">3 · Why it matters</p>
            <ul className="ds-list">{brief.whyItMatters.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
          <div className="ds-brief-section">
            <p className="ds-h4">4 · Your recommendation</p>
            <div className="ds-choices" data-testid="v2-stance-options">
              {brief.recommendations.map(r => (
                <button key={r.id} type="button" className={`ds-choice ${chosen === r.id ? 'selected' : ''}`} data-testid={`v2-stance-${r.id}`} aria-pressed={chosen === r.id} onClick={() => setStance(r.id)}>
                  <span className="ds-choice-title">{r.label}</span>
                  {brief.suggested?.id === r.id && <span className="ds-pill" style={{ marginLeft: 'auto' }}>Your data points here</span>}
                </button>
              ))}
            </div>
            {brief.suggested && <p className="ds-muted" style={{ marginTop: 6 }}>{brief.suggested.reason} You decide.</p>}
          </div>
          <div className="ds-brief-section">
            <p className="ds-h4">5 · Ask your team</p>
            <ul className="ds-list">{brief.askTeam.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}
