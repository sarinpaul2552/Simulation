import { useEffect } from 'react';
import type { V2Api } from '../api';
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

/** Batch 7 navigation: four student-facing stages over the unchanged server phases. */
export const STAGES = ['The Challenge', 'Leadership Decision', 'Commit', 'Results & Learning'];
export function stageOf(phase: string): number {
  return phase === 'briefing' ? 0 : ['decide', 'belief', 'risk'].includes(phase) ? 1 : ['vote', 'commit'].includes(phase) ? 2 : 3;
}

export function V2TeamGame({ api, teamCode, deviceRole, onExit }: { api: V2Api; teamCode: string; deviceRole?: V2Role; onExit: () => void }) {
  const ctl = useV2Team(api, teamCode);
  const game = ctl.game;
  const phase = game?.record.phase;
  const individual = game?.session.participation_mode === 'individual_device';
  const mode = normalizeMode(game?.session.presentation_mode);
  const { reload } = ctl;
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
  const stage = stageOf(phase!);
  return (
    <div className="ds-root" data-testid="v2-team-game" data-phase={phase} data-quarter={quarterShown} data-mode={mode}>
      <header className="ds-topbar" data-testid="v2-company-strip">
        <div className="ds-topbar-inner">
          <span className="ds-company">{game.teamName}</span>
          <span className="ds-quarter">{phase === 'final' ? 'Final report' : `Q${quarterShown} of ${V2_TOTAL_QUARTERS}`}</span>
          <div className="ds-topbar-metrics">
            <span>Completed <b data-testid="v2-completed">{game.snapshot.completedQuarter}</b>/8</span>
            <span>Revenue <b>{money(s.revenue)}</b></span>
            <span>Cash <b data-testid="v2-cash">{money(s.cash)}</b></span>
            <span>Strategy <b data-testid="v2-destination">{destinationName(s.destination?.id)}</b></span>
            {s.solvency.distressed && <span className="ds-badge ds-badge-bad" data-testid="v2-distressed"><Icon name="alert" size={12} />Distressed</span>}
            {s.solvency.status === 'insolvent' && <span className="ds-badge ds-badge-bad"><Icon name="alert" size={12} />Insolvent</span>}
          </div>
          <span className="ds-spacer" />
          <span className="ds-meta">{MODE_LABEL[mode]} · {deviceRole ? `You are the ${deviceRole} · ` : ''}{teamCode}</span>
          <button onClick={onExit}>Leave</button>
        </div>
      </header>
      <main className="ds-shell">
        {phase !== 'final' && <Stepper stages={STAGES} current={stage} />}
        <ErrorBanner error={ctl.error} />
        {stage === 0 && <ChallengeStage ctl={ctl} mode={mode} deviceRole={deviceRole} />}
        {stage === 1 && <DecisionStage ctl={ctl} mode={mode} />}
        {stage === 2 && <CommitStage ctl={ctl} mode={mode} deviceRole={deviceRole} />}
        {stage === 3 && phase !== 'final' && <ResultsStage ctl={ctl} mode={mode} />}
        {phase === 'final' && <FinalStage ctl={ctl} mode={mode} />}
      </main>
    </div>
  );
}
