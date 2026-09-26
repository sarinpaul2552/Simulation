import { useEffect, useMemo } from 'react';
import type { V2Api } from '../api';
import type { V2Role } from '../types';
import { useV2Team } from './useV2Team';
import { CompanyStrip, ErrorBox, Steps } from './common';
import { BriefingPhase } from './BriefingPhase';
import { DecidePhase } from './DecidePhase';
import { BeliefPhase, RiskPhase, VotePhase, CommitPhase } from './DeliberationPhases';
import { ResultsPhase, ReflectPhase, FinalPhase } from './OutcomePhases';

export function V2TeamGame({ api, teamCode, deviceRole, onExit }: { api: V2Api; teamCode: string; deviceRole?: V2Role; onExit: () => void }) {
  const ctl = useV2Team(api, teamCode);
  const game = ctl.game;
  const voting = game?.session.participation_mode !== 'voting_disabled';
  const phase = game?.record.phase;
  const individual = game?.session.participation_mode === 'individual_device';
  const { reload } = ctl;
  // One device per player: keep every device on the team's current step.
  useEffect(() => {
    if (!individual || phase === 'final') return;
    const t = setInterval(() => void reload(), 5000);
    return () => clearInterval(t);
  }, [individual, phase, reload]);
  const body = useMemo(() => {
    if (!game) return null;
    switch (phase) {
      case 'briefing': return <BriefingPhase ctl={ctl} deviceRole={deviceRole} />;
      case 'decide': return <DecidePhase ctl={ctl} />;
      case 'belief': return <BeliefPhase ctl={ctl} />;
      case 'risk': return <RiskPhase ctl={ctl} />;
      case 'vote': return <VotePhase ctl={ctl} deviceRole={deviceRole} />;
      case 'commit': return <CommitPhase ctl={ctl} />;
      case 'results': return <ResultsPhase ctl={ctl} />;
      case 'reflect': return <ReflectPhase ctl={ctl} />;
      case 'final': return <FinalPhase ctl={ctl} />;
      default: return null;
    }
  }, [game, phase, ctl, deviceRole]);

  if (ctl.status === 'loading') return <div className="v2-screen"><p data-testid="v2-loading">Loading your game…</p></div>;
  if (ctl.status === 'integrity-error') {
    return (
      <div className="v2-screen">
        <div className="v2-panel" data-testid="v2-integrity-error">
          <h2>Game state could not be verified</h2>
          <p>{ctl.error}</p>
          <p>The saved game did not replay exactly, so it was not restored. Ask your facilitator for help.</p>
          <button className="btn-secondary" onClick={onExit}>Leave</button>
        </div>
      </div>
    );
  }
  if (!game) {
    return (
      <div className="v2-screen">
        <ErrorBox error={ctl.error} />
        <button className="btn-primary" onClick={() => void ctl.reload()}>Try again</button>
        <button className="btn-secondary" onClick={onExit}>Leave</button>
      </div>
    );
  }
  const quarterShown = phase && ['results', 'reflect', 'final'].includes(phase) ? game.record.completed_quarter : game.record.completed_quarter + 1;
  return (
    <div className="v2-screen" data-testid="v2-team-game" data-phase={phase} data-quarter={quarterShown}>
      <header className="v2-header">
        <h1>{phase === 'final' ? 'Final outcome' : `Quarter ${quarterShown}`}</h1>
        <div className="v2-header-right">
          {deviceRole && <span className="v2-badge">You are the {deviceRole}</span>}
          <span className="v2-muted">Team code {teamCode}</span>
          <button className="btn-exit" onClick={onExit}>Leave</button>
        </div>
      </header>
      <CompanyStrip snapshot={game.snapshot} teamName={game.teamName} />
      {phase !== 'final' && <Steps phase={phase!} voting={voting} />}
      <ErrorBox error={ctl.error} />
      {body}
    </div>
  );
}
