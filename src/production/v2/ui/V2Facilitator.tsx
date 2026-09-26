import { useCallback, useEffect, useState } from 'react';
import type { V2Api, V2FacilitatorOverview } from '../api';
import { V2_TOTAL_QUARTERS } from '../adapter';
import { ErrorBox } from './common';
import { money, destinationName, FINAL_LABELS } from './format';

const PHASE_LABEL: Record<string, string> = {
  briefing: 'Reading the scenario', decide: 'Deciding', belief: 'Belief', risk: 'Risks', vote: 'Voting', commit: 'Ready to commit',
  results: 'Results', reflect: 'Reflecting', final: 'Finished',
};

/**
 * Facilitator dashboard: pacing, progress and headline company state per team. Reads only the facilitator-safe
 * overview RPC — never snapshots, drafts, role briefs or individual votes.
 */
export function V2Facilitator({ api, sessionCode, adminPin, onExit }: { api: V2Api; sessionCode: string; adminPin: string; onExit: () => void }) {
  const [o, setO] = useState<V2FacilitatorOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try { setO(await api.facilitatorOverview(sessionCode, adminPin)); setError(null); } catch (e) { setError((e as Error).message); }
  }, [api, sessionCode, adminPin]);
  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); await refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } };

  if (!o) return <div className="v2-screen"><ErrorBox error={error} /><p data-testid="v2-fac-loading">Loading session…</p><button className="btn-secondary" onClick={onExit}>Leave</button></div>;
  const done = (n: number) => o.teams.filter(t => t.completed_quarter >= n).length;
  return (
    <div className="v2-screen" data-testid="v2-facilitator">
      <header className="v2-header">
        <h1>Facilitator — session {o.session_code}</h1>
        <div className="v2-header-right">
          <span>Admin PIN <b data-testid="v2-fac-pin">{adminPin}</b></span>
          <button className="btn-exit" onClick={onExit}>Leave</button>
        </div>
      </header>
      <ErrorBox error={error} />
      <section className="v2-panel">
        <div className="v2-inline">
          <span>Mode: <b>{o.participation_mode.replace('_', ' ')}</b></span>
          <span>Pacing: <b data-testid="v2-fac-pacing">{o.pacing === 'facilitator' ? 'facilitator-led' : 'self-paced'}</b></span>
          <button className="btn-secondary" disabled={busy} onClick={() => void act(() => api.setPacing(sessionCode, adminPin, o.pacing === 'facilitator' ? 'self' : 'facilitator'))}>
            Switch to {o.pacing === 'facilitator' ? 'self-paced' : 'facilitator-led'}
          </button>
        </div>
        {o.pacing === 'facilitator' && (
          <div className="v2-inline">
            <span>Open quarter: <b data-testid="v2-fac-open-quarter">Q{o.open_quarter}</b> ({done(o.open_quarter)} of {o.teams.length} teams have completed it)</span>
            {o.open_quarter < V2_TOTAL_QUARTERS && (
              <button className="btn-primary" data-testid="v2-fac-open-next" disabled={busy}
                onClick={() => void act(() => api.setOpenQuarter(sessionCode, adminPin, o.open_quarter + 1))}>Open Q{o.open_quarter + 1}</button>
            )}
          </div>
        )}
      </section>
      <section className="v2-panel">
        <table className="v2-table" data-testid="v2-fac-teams">
          <thead><tr><th>Team</th><th>Code</th><th>Progress</th><th>Now</th><th>Votes</th><th>Revenue</th><th>Cash</th><th>Strategy</th><th>Finance</th><th>Final</th></tr></thead>
          <tbody>
            {o.teams.map(t => {
              const h = t.headline;
              const working = t.completed_quarter + 1;
              return (
                <tr key={t.team_id} data-testid="v2-fac-team" data-team={t.team_name}>
                  <td>{t.team_name}</td>
                  <td><code>{t.team_code}</code></td>
                  <td data-testid="v2-fac-progress">{t.started ? `${t.completed_quarter}/${V2_TOTAL_QUARTERS} done` : 'Not joined'}</td>
                  <td>{t.phase ? `${t.phase === 'final' ? '' : `Q${['results', 'reflect'].includes(t.phase) ? t.completed_quarter : working} · `}${PHASE_LABEL[t.phase]}` : '—'}</td>
                  <td data-testid="v2-fac-votes">{t.phase === 'vote' || t.phase === 'commit' ? `${t.votes_submitted}/5` : '—'}</td>
                  <td>{h ? money(h.revenue) : '—'}</td>
                  <td>{h ? money(h.cash) : '—'}</td>
                  <td data-testid="v2-fac-destination">{h && h.completedQuarter >= 4 ? destinationName(h.destination) : '—'}</td>
                  <td data-testid="v2-fac-finance">
                    {h ? <>
                      {h.solvency !== 'healthy' && <span className="v2-badge v2-badge-bad">{h.solvency}</span>}
                      {h.distressed && <span className="v2-badge v2-badge-bad">distressed</span>}
                      {h.debt > 0 && <span> debt {money(h.debt)}</span>}
                      {h.financingRounds > 0 && <span> · {h.financingRounds} financing action(s)</span>}
                      {h.solvency === 'healthy' && !h.distressed && h.debt === 0 && h.financingRounds === 0 && 'healthy'}
                    </> : '—'}
                  </td>
                  <td data-testid="v2-fac-final">{h?.final ? <><b>{h.final.overall.toFixed(1)}</b> · {h.finalOption ? FINAL_LABELS[h.finalOption] : ''}</> : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="v2-muted">Headline figures only. Teams' private role briefs, drafts and individual votes are never shown here.</p>
      </section>
    </div>
  );
}
