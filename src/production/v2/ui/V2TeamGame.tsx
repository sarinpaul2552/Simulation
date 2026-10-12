import { useEffect, useState } from 'react';
import { calendarLabel } from '../content/calendar';
import type { V2Api } from '../api';
import { commitmentModeOf } from '../api';
import type { V2Role } from '../types';
import { useV2Team } from './useV2Team';
import { normalizeMode, MODE_LABEL } from '../content/modes';
import { destinationName, money } from './format';
import { V2_TOTAL_QUARTERS } from '../adapter';
import { ErrorBanner, Icon, Stepper } from './ds/components';
import { ChallengeStage } from './stages/ChallengeStage';
import { DecisionStage } from './stages/DecisionStage';
import { CommitStage } from './stages/CommitStage';
import { ResultsStage } from './stages/ResultsStage';
import { FinalStage } from './stages/FinalStage';
import './ds/ds.css';
import { GlossaryMode, GlossaryPanel } from './ds/glossary';
import { CompanyIntro } from './stages/CompanyIntro';
import { COMPANY } from '../content/company';

/** Four student-facing stages over the unchanged server phases. */
export const STAGES = ['Understand', 'Discuss & Decide', 'Commit', 'Results & Learn'];
/**
 * Stage of a server phase. In Team Commitment sessions the team reviews and commits from the 'risk' phase (the
 * Commit stage); with private voting or legacy no-vote sessions 'risk' is only passed through on the way to 'vote'/'commit'.
 */
export function stageOf(phase: string, teamCommitment = false): number {
  if (phase === 'briefing') return 0;
  if (phase === 'risk' && teamCommitment) return 2;
  if (['decide', 'belief', 'risk'].includes(phase)) return 1;
  if (['vote', 'commit'].includes(phase)) return 2;
  return 3;
}

export function V2TeamGame({ api, teamCode, deviceRole, onExit }: { api: V2Api; teamCode: string; deviceRole?: V2Role; onExit: () => void }) {
  const ctl = useV2Team(api, teamCode);
  const game = ctl.game;
  const phase = game?.record.phase;
  const individual = game?.session.participation_mode === 'individual_device';
  const mode = normalizeMode(game?.session.presentation_mode);
  const commitment = game ? commitmentModeOf(game.session) : 'private_vote';
  const { reload } = ctl;
  const [panel, setPanel] = useState<'glossary' | 'company' | null>(null);
  useEffect(() => {
    if (!individual || phase === 'final') return;
    const t = setInterval(() => void reload(), 5000);
    return () => clearInterval(t);
  }, [individual, phase, reload]);

  if (ctl.status === 'loading') return <div className="ds-root"><div className="ds-shell"><p data-testid="v2-loading">Loading your company…</p></div></div>;
  if (ctl.status === 'integrity-error') {
    return (
      <div className="ds-root"><div className="ds-shell">
        <div className="ds-card" data-testid="v2-integrity-error">
          <h2>Game state could not be verified</h2>
          <p>{ctl.error}</p>
          <p>The saved game did not replay exactly, so it was not restored. Ask your facilitator for help.</p>
          <button className="ds-btn ds-btn-secondary" onClick={onExit}>Leave</button>
        </div>
      </div></div>
    );
  }
  if (!game) {
    return (
      <div className="ds-root"><div className="ds-shell ds-stack">
        <ErrorBanner error={ctl.error} />
        <div className="ds-row"><button className="ds-btn ds-btn-primary" onClick={() => void ctl.reload()}>Try again</button><button className="ds-btn ds-btn-secondary" onClick={onExit}>Leave</button></div>
      </div></div>
    );
  }
  const s = game.snapshot.state;
  const completedPhases = ['results', 'reflect', 'final'];
  const quarterShown = completedPhases.includes(phase!) ? game.record.completed_quarter : game.record.completed_quarter + 1;
  const stage = stageOf(phase!, commitment === 'team_commitment');
  return (
    <GlossaryMode.Provider value={mode}>
    <div className="ds-root" data-testid="v2-team-game" data-phase={phase} data-quarter={quarterShown} data-mode={mode} data-commitment={commitment} data-chapter={phase === 'final' ? 8 : quarterShown}>
      <header className="ds-topbar" data-testid="v2-company-strip">
        <div className="ds-topbar-inner">
          <span className="ds-company">{COMPANY.name} <span className="ds-meta" style={{ fontFamily: 'var(--ds-font)' }}>· {game.teamName}</span></span>
          <span className="ds-quarter">{phase === 'final' ? 'Final report' : `${calendarLabel(quarterShown)} · ${quarterShown}/${V2_TOTAL_QUARTERS}`}</span>
          <div className="ds-topbar-metrics">
            <span className="ds-sr">Completed <b data-testid="v2-completed">{game.snapshot.completedQuarter}</b>/8</span>
            <span>Revenue <b>{money(s.revenue)}</b></span>
            <span>Cash <b data-testid="v2-cash">{money(s.cash)}</b></span>
            <span>Strategy <b data-testid="v2-destination">{destinationName(s.destination?.id)}</b></span>
            {s.solvency.distressed && <span className="ds-badge ds-badge-bad" data-testid="v2-distressed"><Icon name="alert" size={12} />Distressed</span>}
            {s.solvency.status === 'insolvent' && <span className="ds-badge ds-badge-bad"><Icon name="alert" size={12} />Insolvent</span>}
          </div>
          <span className="ds-spacer" />
          <span className="ds-meta">{MODE_LABEL[mode]} · {deviceRole ? `You are the ${deviceRole} · ` : ''}{teamCode}</span>
          <button onClick={() => setPanel('company')} data-testid="v2-open-company">About {COMPANY.name}</button>
          <button onClick={() => setPanel('glossary')} data-testid="v2-open-glossary">Glossary</button>
          <button onClick={onExit}>Leave</button>
        </div>
      </header>
      {panel === 'glossary' && <GlossaryPanel onClose={() => setPanel(null)} />}
      {panel === 'company' && (
        <div className="ds-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setPanel(null); }}>
          <div className="ds-dialog" style={{ maxWidth: 1100, maxHeight: '92vh', overflowY: 'auto', background: 'var(--ds-paper)' }} role="dialog" aria-modal="true" aria-label={`About ${COMPANY.name}`}>
            <CompanyIntro mode={mode} onClose={() => setPanel(null)} />
          </div>
        </div>
      )}
      <main className="ds-shell">
        {phase !== 'final' && <Stepper stages={STAGES} current={stage} />}
        <ErrorBanner error={ctl.error} />
        {stage === 0 && <ChallengeStage ctl={ctl} mode={mode} deviceRole={deviceRole} />}
        {stage === 1 && <DecisionStage ctl={ctl} mode={mode} commitment={commitment} />}
        {stage === 2 && <CommitStage ctl={ctl} mode={mode} deviceRole={deviceRole} commitment={commitment} />}
        {stage === 3 && phase !== 'final' && <ResultsStage ctl={ctl} mode={mode} />}
        {phase === 'final' && <FinalStage ctl={ctl} mode={mode} />}
      </main>
    </div>
    </GlossaryMode.Provider>
  );
}
