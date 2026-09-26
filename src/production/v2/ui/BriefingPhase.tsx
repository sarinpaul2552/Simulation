import { useState } from 'react';
import { getQuarterBriefing, getRoleBrief, V2_ROLES, workingQuarter } from '../adapter';
import type { V2Role } from '../types';
import type { V2TeamController } from './useV2Team';
import { Panel, SignalList } from './common';

/**
 * Scenario → private role briefs. On a shared team device each role views its brief in turn ("pass the device"); a
 * brief is only on screen while that role holds the device. On individual devices each player sees only their role.
 */
export function BriefingPhase({ ctl, deviceRole }: { ctl: V2TeamController; deviceRole?: V2Role }) {
  const game = ctl.game!;
  const q = workingQuarter(game.snapshot)!;
  const b = getQuarterBriefing(q);
  const [viewing, setViewing] = useState<V2Role | null>(null);
  const individual = game.session.participation_mode === 'individual_device';
  const briefed = ctl.draft?.briefed ?? [];
  const next = V2_ROLES.find(r => !briefed.includes(r)) ?? null;
  const allBriefed = individual || next === null;

  return (
    <div className="v2-phase" data-testid="v2-phase-briefing">
      <Panel title={b.title} testId="v2-briefing">
        <p className="v2-briefing-text">{b.briefing}</p>
        <SignalList signals={b.signals} testId="v2-shared-signals" />
        {b.events.destination && <p className="v2-callout">This quarter you commit to a strategic destination.</p>}
        {b.events.opportunity && <p className="v2-callout">A major opportunity is on the table this quarter: accept or decline it.</p>}
        {b.events.recession && <p className="v2-callout">Recession response: choose how to protect the company.</p>}
        {b.events.crisis && <p className="v2-callout">Your company faces a crisis shaped by the strategy you built.</p>}
        {b.events.finalDecision && <p className="v2-callout">Final strategic decision: the options depend on what you built.</p>}
      </Panel>

      <Panel title="Private role briefings" testId="v2-role-briefings">
        {individual && deviceRole ? (
          <RoleBrief ctl={ctl} role={deviceRole} />
        ) : viewing ? (
          <>
            <RoleBrief ctl={ctl} role={viewing} />
            <button className="btn-primary" data-testid="v2-hide-brief" onClick={() => {
              if (!briefed.includes(viewing)) ctl.updateDraft({ briefed: [...briefed, viewing] }, { immediate: true });
              setViewing(null);
            }}>Hide my brief and pass the device on</button>
          </>
        ) : next ? (
          <div className="v2-pass" data-testid="v2-pass-device">
            <p>Pass the device to the <b data-testid="v2-next-role">{next}</b>. Only the {next} should look at the next screen.</p>
            <button className="btn-primary" data-testid="v2-open-brief" onClick={() => setViewing(next)}>I am the {next}: show my private brief</button>
            <p className="v2-muted">{briefed.length} of {V2_ROLES.length} roles briefed.</p>
          </div>
        ) : (
          <div>
            <p>All five roles have read their private briefs. Discuss what you each saw before deciding.</p>
            <div className="v2-inline">
              {V2_ROLES.map(r => <button key={r} className="btn-secondary" onClick={() => setViewing(r)}>{r}: view my brief again</button>)}
            </div>
          </div>
        )}
      </Panel>

      <div className="v2-actions">
        <button className="btn-primary" data-testid="v2-to-decide" disabled={!allBriefed || ctl.busy || viewing !== null} onClick={() => void ctl.go('decide')}>
          Continue to decisions
        </button>
      </div>
    </div>
  );
}

function RoleBrief({ ctl, role }: { ctl: V2TeamController; role: V2Role }) {
  const brief = getRoleBrief(ctl.game!.snapshot, role);
  return (
    <div className="v2-role-brief" data-testid="v2-role-brief" data-role={role}>
      <h4>{role} — private brief</h4>
      <p className="v2-muted">{brief.focus}</p>
      <SignalList signals={brief.signals} testId="v2-role-signals" />
      <p className="v2-muted">Measured values are exact but lag by a quarter; headlines and estimates are signals, not facts.</p>
    </div>
  );
}
