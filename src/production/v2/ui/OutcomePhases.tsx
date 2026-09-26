import { useEffect, useMemo, useState } from 'react';
import { resultForQuarter, getFinalOutcome, V2_TOTAL_QUARTERS } from '../adapter';
import type { V2ExplanationLine } from '../types';
import type { V2TeamController } from './useV2Team';
import { Panel } from './common';
import { money, pct, destinationName, FINAL_LABELS } from './format';

const AREA_LABEL: Record<V2ExplanationLine['area'], string> = {
  decision: 'Your decisions', revenue: 'Revenue', customers: 'Customers and market', organization: 'Organization',
  capabilities: 'Capabilities', cash: 'Cash', risk: 'Risk',
};
const signed = (x: number) => (Math.abs(x) < 0.05 ? '±$0.0M' : `${x > 0 ? '+' : '−'}${money(Math.abs(x))}`);
const GATE_TEXT: Record<string, string> = {
  'terminal-insolvency': 'the company ended the game insolvent',
  'rescued-insolvency': 'the company was insolvent at some point and had to be rescued',
  'organizational-collapse': 'Trust, Culture or Talent collapsed',
};
const AREA_ORDER: V2ExplanationLine['area'][] = ['decision', 'revenue', 'customers', 'organization', 'capabilities', 'cash', 'risk'];

export function ResultsPhase({ ctl }: { ctl: V2TeamController }) {
  const game = ctl.game!;
  const q = game.record.completed_quarter;
  const r = useMemo(() => resultForQuarter(game.snapshot, q), [game.snapshot, q]);
  return (
    <div className="v2-phase" data-testid="v2-phase-results">
      <Panel title={`Q${q} results`} testId="v2-results">
        <div className="v2-metrics">
          <div><span>Revenue</span><b data-testid="v2-res-revenue">{money(r.revenue)}</b><small>{signed(r.revenueChange)} vs last quarter</small></div>
          <div><span>Operating profit</span><b>{money(r.operatingProfit)}</b><small>margin {pct(r.operatingMargin, 1)}</small></div>
          <div><span>Cash</span><b data-testid="v2-res-cash">{money(r.closingCash)}</b><small>{signed(r.cashChange)} this quarter</small></div>
          <div><span>Debt</span><b>{money(r.debt)}</b><small>ownership {pct(r.ownership, 1)}</small></div>
          <div><span>Liquidity</span><b data-testid="v2-res-solvency">{r.solvency}{r.distressed ? ' · distressed' : ''}</b></div>
          <div><span>Strategy</span><b>{destinationName(r.destination)}</b></div>
        </div>
      </Panel>
      <Panel title="What happened and why" testId="v2-explanation">
        {AREA_ORDER.map(area => {
          const lines = r.explanation.filter(l => l.area === area);
          if (!lines.length) return null;
          return (
            <div key={area} className="v2-expl-group">
              <h4>{AREA_LABEL[area]}</h4>
              <ul>{lines.map((l, i) => <li key={i} className={`v2-tone-${l.tone}`}>{l.text}</li>)}</ul>
            </div>
          );
        })}
      </Panel>
      <div className="v2-actions">
        <button className="btn-primary" data-testid="v2-to-reflect" disabled={ctl.busy} onClick={() => void ctl.go('reflect')}>Continue: reflect</button>
      </div>
    </div>
  );
}

export function ReflectPhase({ ctl }: { ctl: V2TeamController }) {
  const game = ctl.game!;
  const q = game.record.completed_quarter;
  const saved = game.resolutions.find(r => r.quarter === q);
  const [text, setText] = useState(saved?.reflection ?? '');
  const last = q >= V2_TOTAL_QUARTERS;
  // A saved reflection means the team already asked to continue (e.g. refreshed while waiting for the next quarter).
  const [waiting, setWaiting] = useState(!last && !!saved?.reflection);
  const belief = saved?.deliberation?.belief;
  const nextOpen = game.session.pacing === 'self' || game.session.open_quarter >= q + 1;
  const { reload, go } = ctl;

  useEffect(() => {
    if (!waiting) return;
    if (nextOpen) { setWaiting(false); void go('briefing'); return; }
    const t = setInterval(() => void reload(), 4000);
    return () => clearInterval(t);
  }, [waiting, nextOpen, reload, go]);

  const proceed = async () => {
    await ctl.saveReflection(text);
    if (last) { await ctl.go('final'); return; }
    if (!nextOpen) { setWaiting(true); return; }
    await ctl.go('briefing');
  };

  return (
    <div className="v2-phase" data-testid="v2-phase-reflect">
      <Panel title={`Reflect on Q${q}`}>
        {belief && <p>Your belief going in: <i>“{belief}”</i></p>}
        {saved?.deliberation?.risks?.length ? <p>Risks you named: {saved.deliberation.risks.join('; ')}.</p> : null}
        <p>What did you learn? What would you do differently?</p>
        <textarea data-testid="v2-reflection" rows={4} maxLength={4000} value={text} onChange={e => setText(e.target.value)} />
      </Panel>
      {waiting ? (
        <Panel testId="v2-waiting">
          <p>Reflection saved. Waiting for the facilitator to open Q{q + 1}…</p>
        </Panel>
      ) : (
        <div className="v2-actions">
          <button className="btn-primary" data-testid="v2-next-quarter" disabled={ctl.busy || !text.trim()} onClick={() => void proceed()}>
            {last ? 'Save and see the final outcome' : `Save and continue to Q${q + 1}`}
          </button>
        </div>
      )}
    </div>
  );
}

export function FinalPhase({ ctl }: { ctl: V2TeamController }) {
  const game = ctl.game!;
  const out = useMemo(() => getFinalOutcome(game.snapshot), [game.snapshot]);
  const s = game.snapshot.state;
  const gates = out.score.gates.filter(g => g.triggered);
  return (
    <div className="v2-phase" data-testid="v2-phase-final">
      <Panel title="Final outcome after Q8" testId="v2-final">
        <div className="v2-metrics">
          <div><span>Overall</span><b data-testid="v2-final-overall">{out.score.overall.toFixed(1)}</b><small>out of 100</small></div>
          <div><span>Financial</span><b data-testid="v2-final-financial">{out.score.financial.toFixed(1)}</b></div>
          <div><span>Strategic</span><b data-testid="v2-final-strategic">{out.score.strategic.toFixed(1)}</b></div>
          <div><span>Organizational</span><b data-testid="v2-final-organizational">{out.score.organizational.toFixed(1)}</b></div>
        </div>
        <p>Strategy: <b>{destinationName(out.destination)}</b>. Final decision: <b data-testid="v2-final-option">{out.option ? FINAL_LABELS[out.option] : '—'}</b>.</p>
        <p>Options your company had earned: {out.earnedOptions.map(o => FINAL_LABELS[o]).join(', ')}.</p>
        {gates.length > 0 && <p className="v2-error-line">Viability limits applied: {gates.map(g => `${GATE_TEXT[g.id] ?? g.id} (${g.detail})`).join('; ')}.</p>}
        <p className="v2-muted">The score reflects the company you built — its finances, strategic position and organization — not the destination you picked.</p>
      </Panel>
      <Panel title="Your eight quarters">
        <table className="v2-table">
          <thead><tr><th>Quarter</th><th>Revenue</th><th>Operating profit</th><th>Closing cash</th></tr></thead>
          <tbody>{s.ledgerHistory.map(l => <tr key={l.quarter}><td>Q{l.quarter}</td><td>{money(l.revenue)}</td><td>{money(l.operatingProfit)}</td><td>{money(l.closingCash)}</td></tr>)}</tbody>
        </table>
      </Panel>
    </div>
  );
}
