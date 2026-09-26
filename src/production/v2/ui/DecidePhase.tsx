import { useMemo } from 'react';
import { getDecisionSpec, validateQuarterInput, forecastQuarter, envelopeFor, workingQuarter, V2Forecast } from '../adapter';
import type { V2PlayerQuarterInput } from '../types';
import type { V2Allocation } from '../../../simulation/engineV2';
import type { V2FinancingAction } from '../../../simulation/engineV2Financing';
import type { V2ManagementActions } from '../../../simulation/engineV2Management';
import type { V2FinalOptionId } from '../../../simulation/engineV2Final';
import type { V2TeamController } from './useV2Team';
import { defaultInput } from './useV2Team';
import { Panel } from './common';
import { BUCKET_LABELS, FINAL_LABELS, money, pct } from './format';

const INVEST: (keyof V2Allocation)[] = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'];
const r1 = (x: number) => Math.round(x * 100) / 100;

export function DecidePhase({ ctl }: { ctl: V2TeamController }) {
  const game = ctl.game!;
  const snap = game.snapshot;
  const q = workingQuarter(snap)!;
  const spec = getDecisionSpec(snap)!;
  const input: V2PlayerQuarterInput = { ...defaultInput(q), ...(ctl.draft?.input ?? {}), quarter: q } as V2PlayerQuarterInput;
  const envelope = envelopeFor(q, input.finalOption);
  const invested = INVEST.reduce((t, b) => t + (input.allocation[b] || 0), 0);

  const set = (patch: Partial<V2PlayerQuarterInput>) => {
    const next = { ...input, ...patch };
    const env = envelopeFor(q, next.finalOption);
    const inv = INVEST.reduce((t, b) => t + (next.allocation[b] || 0), 0);
    next.allocation = { ...next.allocation, cashReserve: r1(Math.max(0, env - inv)) };
    ctl.updateDraft({ input: next, quarter: q });
  };
  const setBucket = (b: keyof V2Allocation, v: number) => set({ allocation: { ...input.allocation, [b]: Number.isFinite(v) && v > 0 ? v : 0 } });

  const errors = useMemo(() => validateQuarterInput(snap, input), [snap, input]);
  const forecast: V2Forecast | null = useMemo(() => {
    try { return invested <= envelope + 1e-9 ? forecastQuarter(snap, { ...input, financing: [] }) : null; } catch { return null; }
  }, [snap, input, invested, envelope]);

  return (
    <div className="v2-phase" data-testid="v2-phase-decide">
      {spec.final && (
        <Panel title="Final strategic decision (Q8)" testId="v2-final-options">
          <p>The options open to you depend on the company you built. Locked options show why.</p>
          {spec.final.options.map(o => (
            <label key={o.id} className={`v2-option ${o.available ? '' : 'v2-disabled'}`}>
              <input type="radio" name="final" data-testid={`v2-final-${o.id}`} disabled={!o.available} checked={input.finalOption === o.id}
                onChange={() => set({ finalOption: o.id as V2FinalOptionId })} />
              <b>{FINAL_LABELS[o.id]}</b>
              {o.terms.envelope !== undefined && <span> · investment envelope {money(o.terms.envelope, 0)}</span>}
              {o.terms.amount !== undefined && <span> · raises {money(o.terms.amount, 0)}</span>}
              {o.terms.price !== undefined && <span> · price {money(o.terms.price, 0)}</span>}
              {o.terms.offer !== undefined && <span> · offer {money(o.terms.offer, 0)}</span>}
              {o.terms.investmentCap !== undefined && <span> · investment capped at {money(o.terms.investmentCap, 0)}</span>}
              {!o.available && <span className="v2-muted"> — locked: {o.reasons.join('; ')}</span>}
            </label>
          ))}
        </Panel>
      )}

      <Panel title={`Capital allocation — ${money(envelope, 0)} strategic envelope`} testId="v2-allocation">
        {INVEST.map(b => (
          <div className="v2-alloc-row" key={b}>
            <label htmlFor={`alloc-${b}`}>{BUCKET_LABELS[b]}</label>
            <input id={`alloc-${b}`} data-testid={`v2-alloc-${b}`} type="number" min={0} step={1} value={input.allocation[b]}
              onChange={e => setBucket(b, parseFloat(e.target.value))} />
            <span className="v2-muted">$M</span>
          </div>
        ))}
        <div className="v2-alloc-row">
          <label>{BUCKET_LABELS.cashReserve}</label>
          <b data-testid="v2-alloc-reserve">{money(Math.max(0, envelope - invested))}</b>
        </div>
        {invested > envelope + 1e-9 && <p className="v2-error">You have allocated {money(invested)} — more than the {money(envelope, 0)} envelope.</p>}
      </Panel>

      {spec.destination && (
        <Panel title="Strategic destination (Q4 commitment)" testId="v2-destinations">
          {spec.destination.options.map(d => (
            <label key={d.id} className="v2-option">
              <input type="radio" name="destination" data-testid={`v2-dest-${d.id}`} checked={input.destination === d.id} onChange={() => set({ destination: d.id })} />
              <b>{d.name}</b> <span className="v2-muted">— {d.personality} Exposed to: {d.exposures.join(', ')}.</span>
            </label>
          ))}
        </Panel>
      )}

      {spec.opportunity && (
        <Panel title={spec.opportunity.name} testId="v2-opportunity">
          <p>{spec.opportunity.description}</p>
          <ul className="v2-terms">
            <li>Annual contract value: {money(spec.opportunity.acv, 0)}</li>
            <li>Upfront implementation & customization now: {money(spec.opportunity.upfrontCash)}</li>
            <li>Dedicated delivery team: {money(spec.opportunity.deliveryCostPerQuarter)} per quarter</li>
            <li>Change load: {spec.opportunity.orgLoadPerQuarter.toFixed(0)} per quarter for {spec.opportunity.loadQuarters} quarters</li>
            <li>AI/Product roadmap diverted to the client: {pct(spec.opportunity.roadmapDiversion)}</li>
            <li>{spec.opportunity.aligned ? 'On strategy for your destination.' : `Off strategy: it would dilute your strategic focus by ${pct(spec.opportunity.focusDilution)}.`}</li>
            <li>Your delivery readiness: {pct(spec.opportunity.deliveryFit)}</li>
          </ul>
          <label className="v2-option"><input type="radio" name="opp" data-testid="v2-opp-accept" checked={input.opportunity?.accept === true}
            onChange={() => set({ opportunity: { offerId: spec.opportunity!.offerId, accept: true } })} /> Accept the contract</label>
          <label className="v2-option"><input type="radio" name="opp" data-testid="v2-opp-decline" checked={input.opportunity?.accept === false}
            onChange={() => set({ opportunity: { offerId: spec.opportunity!.offerId, accept: false } })} /> Decline</label>
        </Panel>
      )}

      {spec.management && <ManagementPanel spec={spec.management} value={input.management ?? {}} onChange={m => set({ management: m })} />}

      {spec.crisis && (
        <Panel title={spec.crisis.title} testId="v2-crisis">
          <p>{spec.crisis.description}</p>
          <p>Severity for your company: <b data-testid="v2-crisis-band">{spec.crisis.band}</b></p>
          {spec.crisis.responses.map(r => (
            <label key={r.id} className="v2-option">
              <input type="radio" name="crisis" data-testid={`v2-crisis-${r.id}`} checked={input.crisisResponse === r.id} onChange={() => set({ crisisResponse: r.id })} />
              <b>{r.label}</b> — {r.description} <span className="v2-muted">(cash now: {money(r.cash)})</span>
            </label>
          ))}
        </Panel>
      )}

      <FinancingPanel forecast={forecast} value={input.financing ?? []} debt={snap.state.financing.debt} onChange={f => set({ financing: f })} />

      {errors.length > 0 && (
        <Panel title="Before you continue" testId="v2-validation">
          <ul>{errors.map(e => <li key={e} className="v2-error-line">{e}</li>)}</ul>
        </Panel>
      )}
      <div className="v2-actions">
        <button className="btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('briefing')}>Back to briefing</button>
        <button className="btn-primary" data-testid="v2-to-belief" disabled={errors.length > 0 || ctl.busy} onClick={() => void ctl.go('belief')}>Continue: team belief</button>
      </div>
    </div>
  );
}

function ManagementPanel({ spec, value, onChange }: { spec: NonNullable<ReturnType<typeof getDecisionSpec>>['management'] & object; value: V2ManagementActions; onChange: (m: V2ManagementActions) => void }) {
  const upd = (patch: Partial<V2ManagementActions>) => {
    const next: V2ManagementActions = { ...value, ...patch };
    for (const k of Object.keys(next) as (keyof V2ManagementActions)[]) if (next[k] === undefined || next[k] === false) delete next[k];
    onChange(next);
  };
  const desc = (id: string) => spec.options.find(o => o.id === id)?.description;
  return (
    <Panel title="Recession response" testId="v2-management">
      <div className="v2-option">
        <b>Workforce reduction</b>
        <select data-testid="v2-mgmt-workforce" value={value.workforceReduction?.depth ?? 'none'}
          onChange={e => upd({ workforceReduction: e.target.value === 'none' ? undefined : { depth: e.target.value as 'targeted' | 'deep', protectRnD: value.workforceReduction?.protectRnD } })}>
          <option value="none">None</option><option value="targeted">Targeted</option><option value="deep">Deep</option>
        </select>
        {value.workforceReduction && (
          <label><input type="checkbox" data-testid="v2-mgmt-protect" checked={value.workforceReduction.protectRnD === true}
            onChange={e => upd({ workforceReduction: { ...value.workforceReduction!, protectRnD: e.target.checked || undefined } })} /> Protect R&D</label>
        )}
        <p className="v2-muted">{desc('workforce-targeted')} {desc('workforce-deep')}</p>
      </div>
      <label className="v2-option"><input type="checkbox" data-testid="v2-mgmt-freeze" checked={value.hiringFreeze === true} onChange={e => upd({ hiringFreeze: e.target.checked })} /> <b>Hiring freeze</b> <span className="v2-muted">— {desc('hiring-freeze')}</span></label>
      <div className="v2-option">
        <b>Consumer pricing</b>
        <select data-testid="v2-mgmt-pricing" value={value.pricing ?? 'none'} onChange={e => upd({ pricing: e.target.value === 'none' ? undefined : e.target.value as 'raise' | 'discount' })}>
          <option value="none">No change</option><option value="raise">Raise prices</option><option value="discount">Discount</option>
        </select>
      </div>
      <label className="v2-option"><input type="checkbox" data-testid="v2-mgmt-close" checked={value.closeWeakOfferings === true} onChange={e => upd({ closeWeakOfferings: e.target.checked })} /> <b>Close weak offerings</b> <span className="v2-muted">— {desc('close-weak')}</span></label>
      <div className="v2-option">
        <b>Consumer marketing level</b>
        <input type="range" min={spec.marketingLevelRange[0]} max={spec.marketingLevelRange[1]} step={0.1} value={value.marketingLevel ?? 1}
          data-testid="v2-mgmt-marketing" onChange={e => { const v = parseFloat(e.target.value); upd({ marketingLevel: Math.abs(v - 1) < 1e-9 ? undefined : v }); }} />
        <span>{(value.marketingLevel ?? 1).toFixed(1)}×</span>
      </div>
    </Panel>
  );
}

function FinancingPanel({ forecast, value, debt, onChange }: { forecast: V2Forecast | null; value: V2FinancingAction[]; debt: number; onChange: (f: V2FinancingAction[]) => void }) {
  const amt = (kind: 'debt' | 'equity' | 'repay') => value.filter(a => a.kind === kind).reduce((t, a) => t + ('amount' in a ? a.amount : 0), 0);
  const partner = value.some(a => a.kind === 'partner');
  const restructure = (value.find(a => a.kind === 'restructure') as { depth?: 'moderate' | 'deep' } | undefined)?.depth ?? 'none';
  const build = (p: { debt?: number; equity?: number; repay?: number; partner?: boolean; restructure?: string }) => {
    const d = p.debt ?? amt('debt'), e = p.equity ?? amt('equity'), r = p.repay ?? amt('repay');
    const pa = p.partner ?? partner, rs = p.restructure ?? restructure;
    const out: V2FinancingAction[] = [];
    if (r > 0) out.push({ kind: 'repay', amount: r });
    if (rs === 'moderate' || rs === 'deep') out.push({ kind: 'restructure', depth: rs });
    if (d > 0) out.push({ kind: 'debt', amount: d });
    if (e > 0) out.push({ kind: 'equity', amount: e });
    if (pa) out.push({ kind: 'partner' });
    onChange(out);
  };
  const n = (s: string) => { const v = parseFloat(s); return Number.isFinite(v) && v > 0 ? v : 0; };
  const o = forecast?.options;
  return (
    <Panel title="CFO: liquidity and financing" testId="v2-financing">
      {forecast ? (
        <p data-testid="v2-forecast">
          Forecast closing cash before any financing: <b data-testid="v2-forecast-cash">{money(forecast.projectedClosingCash)}</b> (minimum operating cash {money(forecast.minimumOperatingCash, 0)}).
          {forecast.gap > 0 && <span className="v2-error-line"> Shortfall of {money(forecast.gap)}: finance it, slow investment, or accept insolvency.</span>}
        </p>
      ) : <p className="v2-muted">Complete the allocation to see the CFO forecast.</p>}
      {o && (
        <ul className="v2-terms">
          <li>Debt capacity {money(o.debtCapacity)} at {(o.debtRate * 100).toFixed(1)}% per quarter</li>
          <li>Equity available up to {money(o.maxEquity)} (pre-money {money(o.valuation.preMoney)})</li>
          <li>Strategic partner: {o.partner.available ? `${money(o.partner.cash)} for a minority stake and revenue share` : `not available (${o.partner.reason})`}</li>
          <li>Restructuring saves {money(o.restructuringSavings.moderate)} (moderate) or {money(o.restructuringSavings.deep)} (deep) per quarter, at a one-off cost and culture damage</li>
        </ul>
      )}
      <div className="v2-inline">
        <label>Draw debt $M <input type="number" min={0} data-testid="v2-fin-debt" value={amt('debt') || ''} onChange={e => build({ debt: n(e.target.value) })} /></label>
        <label>Raise equity $M <input type="number" min={0} data-testid="v2-fin-equity" value={amt('equity') || ''} onChange={e => build({ equity: n(e.target.value) })} /></label>
        {debt > 0 && <label>Repay debt $M <input type="number" min={0} data-testid="v2-fin-repay" value={amt('repay') || ''} onChange={e => build({ repay: n(e.target.value) })} /></label>}
        <label><input type="checkbox" data-testid="v2-fin-partner" checked={partner} onChange={e => build({ partner: e.target.checked })} /> Strategic partner</label>
        <label>Restructure <select data-testid="v2-fin-restructure" value={restructure} onChange={e => build({ restructure: e.target.value })}>
          <option value="none">No</option><option value="moderate">Moderate</option><option value="deep">Deep</option></select></label>
      </div>
    </Panel>
  );
}
