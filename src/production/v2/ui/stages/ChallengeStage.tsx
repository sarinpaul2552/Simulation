import { useState } from 'react';
import { getQuarterBriefing, V2_ROLES, workingQuarter } from '../../adapter';
import type { V2Role } from '../../types';
import type { V2TeamController } from '../useV2Team';
import { QUARTER_CARDS, SIGNAL_PLAIN, evidenceKind } from '../../content/scenarioContent';
import { pick, V2PresentationMode } from '../../content/modes';
import { buildRoleBriefing } from '../../content/roleContent';
import { Card, EvidenceList, Icon } from '../ds/components';

const IMPLICATION_ICONS = ['target', 'clock', 'alert'];

/** Stage 1 — The Challenge: scenario, market evidence and private role briefings. */
export function ChallengeStage({ ctl, mode, deviceRole }: { ctl: V2TeamController; mode: V2PresentationMode; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const card = QUARTER_CARDS[q];
  const b = getQuarterBriefing(q);
  const [viewing, setViewing] = useState<V2Role | null>(null);
  const individual = game.session.participation_mode === 'individual_device';
  const briefed = ctl.draft?.briefed ?? [];
  const next = V2_ROLES.find(r => !briefed.includes(r)) ?? null;
  const allBriefed = individual || next === null;
  const evidence = b.signals.map(s => ({ id: s.id, evidence: evidenceKind(s.kind === 'measured' ? 'measured' : s.kind), text: mode === 'undergraduate' && SIGNAL_PLAIN[s.id] ? SIGNAL_PLAIN[s.id] : s.label }));

  // While a leader reads a private brief on a laptop/projector, the brief gets the wide column.
  const focusBrief = viewing !== null || (individual && !!deviceRole);
  return (
    <div className="ds-stack" data-testid="v2-phase-briefing">
      <section className="ds-card ds-hero" data-testid="v2-briefing">
        <span className="ds-kicker">{card.stage} · The Challenge</span>
        <h1 data-testid="v2-headline">{pick(mode, card.headline)}</h1>
        <p><b style={{ color: '#fff' }}>What happened? </b>{pick(mode, card.whatHappened)}</p>
        <div className="ds-challenge" data-testid="v2-challenge-question"><Icon name="target" /> {pick(mode, card.challenge)}</div>
      </section>

      <div className="ds-implications" data-testid="v2-why-it-matters">
        {card.whyItMatters.map((w, i) => (
          <div className="ds-implication" key={i}><span className="ds-icon"><Icon name={IMPLICATION_ICONS[i]} size={18} /></span><span>{pick(mode, w)}</span></div>
        ))}
      </div>

      <div className={focusBrief ? 'ds-grid ds-grid-focus' : 'ds-grid ds-grid-main'}>
        <Card title="Market evidence" sub="Shared with the whole team" icon="globe">
          <EvidenceList items={evidence} testId="v2-shared-signals" />
          <p className="ds-muted" style={{ marginTop: 8 }}>Market News reports what people are saying. Industry Estimates are ranges, not facts. Company Data is what we measured.</p>
        </Card>

        <Card title="Private role briefings" sub={individual ? 'Only for you' : 'Pass the device — one leader at a time'} icon="lock" testId="v2-role-briefings">
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
              <div>Pass the device to the <b data-testid="v2-next-role">{next}</b>.</div>
              <div className="ds-muted">Only the {next} should look at the next screen.</div>
              <button className="ds-btn ds-btn-primary" data-testid="v2-open-brief" onClick={() => setViewing(next)}><Icon name="eye" /> I am the {next} — show my brief</button>
              <div className="ds-roles">{V2_ROLES.map(r => <span key={r} className={`ds-role-pill ${briefed.includes(r) ? 'done' : ''}`}>{briefed.includes(r) && <Icon name="check" size={12} />}{r}</span>)}</div>
            </div>
          ) : (
            <div className="ds-stack">
              <div className="ds-callout"><Icon name="users" /> All five leaders have read their briefs. Share what you learned, then make the decision together.</div>
              <div className="ds-row">{V2_ROLES.map(r => <button key={r} className="ds-btn ds-btn-secondary" onClick={() => setViewing(r)}>{r}: view again</button>)}</div>
            </div>
          )}
        </Card>
      </div>

      <div className="ds-actions ds-actions-sticky">
        <button className="ds-btn ds-btn-primary" data-testid="v2-to-decide" disabled={!allBriefed || ctl.busy || viewing !== null} onClick={() => void ctl.go('decide')}>
          Continue to the leadership decision <Icon name="arrow" />
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
      <div className="ds-row"><b>{brief.title}</b><span className="ds-badge ds-badge-accent">{brief.perspective}</span></div>
      <div className="ds-brief-body">
      <div>
      <div className="ds-brief-section">
        <p className="ds-h4">1 · Your responsibility</p>
        <p style={{ margin: 0 }}>{brief.responsibility}</p>
      </div>
      <div className="ds-brief-section">
        <p className="ds-h4">2 · What you know (private)</p>
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
            <button key={r.id} type="button" className={`ds-choice ${chosen === r.id ? 'selected' : ''}`} data-testid={`v2-stance-${r.id}`} onClick={() => setStance(r.id)}>
              <span className="ds-choice-title">{r.label}</span>
              {brief.suggested?.id === r.id && <span className="ds-badge ds-badge-accent" style={{ marginLeft: 'auto' }}>Suggested by your data</span>}
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
