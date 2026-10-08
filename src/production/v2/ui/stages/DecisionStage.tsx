import { useMemo, useState } from 'react';
import { getDecisionSpec, validateQuarterInput, forecastQuarter, envelopeFor, workingQuarter, V2Forecast, V2_ROLES } from '../../adapter';
import type { V2Deliberation, V2PlayerQuarterInput } from '../../types';
import type { V2Allocation } from '../../../../simulation/engineV2';
import type { V2FinancingAction } from '../../../../simulation/engineV2Financing';
import type { V2ManagementActions } from '../../../../simulation/engineV2Management';
import type { V2FinalOptionId } from '../../../../simulation/engineV2Final';
import type { V2TeamController } from '../useV2Team';
import { defaultInput } from '../useV2Team';
import { BELIEFS, RISKS, CONFIDENCE_LEVELS } from '../../content/deliberationContent';
import { pick, V2PresentationMode } from '../../content/modes';
import { BUCKET_LABELS, FINAL_LABELS, money, pct } from '../format';
import { Card, ChoiceList, Icon, Segmented } from '../ds/components';
import { DecisionSummary } from './DecisionSummary';
import { buildRoleBriefing } from '../../content/roleContent';
import type { V2GameSnapshot } from '../../snapshot';

const INVEST: (keyof V2Allocation)[] = ['consumer', 'enterprise', 'aiProduct', 'people', 'universityCredentials'];
const BUCKET_HINT: Record<string, string> = {
  consumer: 'Marketing and product for individual learners',
  enterprise: 'Sales and customer success for companies',
  aiProduct: 'AI features and product quality',
  people: 'Hiring, training and organizational capacity',
  universityCredentials: 'University partnerships and accredited credentials',
};
const BUCKET_COLOR = ['var(--ds-s1)', 'var(--ds-s2)', 'var(--ds-s3)', 'var(--ds-s4)', '#e87ba4'];
const r1 = (x: number) => Math.round(x * 100) / 100;

/** Stage 2 — Leadership Decision: allocation, the quarter's decision and the leadership discussion. */
export function DecisionStage({ ctl, mode }: { ctl: V2TeamController; mode: V2PresentationMode }) {
  const game = ctl.game!;
  const snap = game.snapshot;
  const q = workingQuarter(snap)!;
  const spec = getDecisionSpec(snap)!;
  const input: V2PlayerQuarterInput = { ...defaultInput(q), ...(ctl.draft?.input ?? {}), quarter: q } as V2PlayerQuarterInput;
  const delib: V2Deliberation = ctl.draft?.deliberation ?? {};
  const envelope = envelopeFor(q, input.finalOption);
  const invested = INVEST.reduce((t, b) => t + (input.allocation[b] || 0), 0);
  const voting = game.session.participation_mode !== 'voting_disabled';

  const set = (patch: Partial<V2PlayerQuarterInput>) => {
    const next = { ...input, ...patch };
    const env = envelopeFor(q, next.finalOption);
    const inv = INVEST.reduce((t, b) => t + (next.allocation[b] || 0), 0);
    next.allocation = { ...next.allocation, cashReserve: r1(Math.max(0, env - inv)) };
    ctl.updateDraft({ input: next, quarter: q });
  };
  const setBucket = (b: keyof V2Allocation, v: number) => set({ allocation: { ...input.allocation, [b]: Number.isFinite(v) && v > 0 ? v : 0 } });
  const setDelib = (patch: Partial<V2Deliberation>) => ctl.updateDraft({ deliberation: { ...delib, ...patch } });

  const errors = useMemo(() => validateQuarterInput(snap, input), [snap, input]);
  const forecast: V2Forecast | null = useMemo(() => {
    try { return invested <= envelope + 1e-9 ? forecastQuarter(snap, { ...input, financing: [] }) : null; } catch { return null; }
  }, [snap, input, invested, envelope]);

  const beliefs = BELIEFS[q] ?? [];
  const risks = RISKS[q] ?? [];
  const riskIds = delib.riskIds ?? [];
  const discussionMissing = [
    ...(delib.beliefId ? [] : ['Choose what your strategy is based on']),
    ...(delib.confidence ? [] : ['Choose your confidence']),
    ...(riskIds.length === 2 ? [] : ['Choose your two most important risks']),
  ];
  const ready = errors.length === 0 && discussionMissing.length === 0;
  const target = voting ? 'vote' : 'commit';
  const [showNote, setShowNote] = useState(mode === 'mba' || !!delib.note);

  return (
    <div className="ds-stack" data-testid="v2-phase-decide">
      <div className="ds-grid ds-grid-main">
        <div className="ds-stack">
          {spec.final && (
            <Card title="Final strategic decision" sub="Options depend on what you built" icon="flag" testId="v2-final-options">
              <ChoiceList name="final" testIdPrefix="v2-final-choice" value={input.finalOption ? [input.finalOption] : []}
                onChange={v => set({ finalOption: v[0] as V2FinalOptionId })}
                options={spec.final.options.map(o => ({
                  id: o.id, disabled: !o.available,
                  label: <span data-testid={`v2-final-${o.id}`} data-available={o.available}>{FINAL_LABELS[o.id]}</span>,
                  detail: o.available
                    ? [o.terms.envelope !== undefined && `investment budget ${money(o.terms.envelope, 0)}`, o.terms.amount !== undefined && `raises ${money(o.terms.amount, 0)}`, o.terms.price !== undefined && `price ${money(o.terms.price, 0)}`, o.terms.offer !== undefined && `offer ${money(o.terms.offer, 0)}`, o.terms.investmentCap !== undefined && `investment capped at ${money(o.terms.investmentCap, 0)}`].filter(Boolean).join(' · ')
                    : `Locked: ${o.reasons.join('; ')}`,
                }))} />
            </Card>
          )}

          <Card title="Invest the strategic budget" sub={`${money(envelope, 0)} available`} icon="cash" testId="v2-allocation">
            <div className="ds-alloc-bar" aria-hidden>
              {INVEST.map((b, i) => input.allocation[b] > 0 && <span key={b} style={{ width: `${(input.allocation[b] / envelope) * 100}%`, background: BUCKET_COLOR[i] }} />)}
            </div>
            <div className="ds-alloc" style={{ marginTop: 12 }}>
              {INVEST.map(b => (
                <div className="ds-alloc-row" key={b}>
                  <label htmlFor={`alloc-${b}`}>{BUCKET_LABELS[b]}<span className="ds-alloc-hint">{BUCKET_HINT[b]}</span></label>
                  <input id={`alloc-${b}`} data-testid={`v2-alloc-${b}`} type="number" min={0} step={1} inputMode="decimal" value={input.allocation[b]} onChange={e => setBucket(b, parseFloat(e.target.value))} aria-label={`${BUCKET_LABELS[b]} ($M)`} />
                </div>
              ))}
              <div className="ds-alloc-row">
                <span><b>Kept as cash</b><span className="ds-alloc-hint">Not invested — stays in the bank</span></span>
                <b data-testid="v2-alloc-reserve" style={{ textAlign: 'right' }}>{money(Math.max(0, envelope - invested))}</b>
              </div>
            </div>
            {invested > envelope + 1e-9 && <p className="ds-error" style={{ marginTop: 8 }}><Icon name="alert" />You have allocated {money(invested)} — more than the {money(envelope, 0)} budget.</p>}
            <p className="ds-muted" style={{ marginTop: 8 }}>Investments take one to three quarters to turn into capability.</p>
          </Card>

          {spec.destination && (
            <Card title="Choose your strategic direction" sub="This cannot be changed later" icon="target" testId="v2-destinations">
              <ChoiceList name="destination" testIdPrefix="v2-dest-choice" value={input.destination ? [input.destination] : []} onChange={v => set({ destination: v[0] as V2PlayerQuarterInput['destination'] })}
                options={spec.destination.options.map(d => ({ id: d.id, label: <span data-testid={`v2-dest-${d.id}`}>{d.name}</span>, detail: mode === 'mba' ? `${d.personality} Exposed to: ${d.exposures.join(', ')}.` : d.personality }))} />
            </Card>
          )}

          {spec.opportunity && (
            <Card title={spec.opportunity.name} icon="star" testId="v2-opportunity">
              <div className="ds-grid ds-grid-2" style={{ marginBottom: 12 }}>
                <Fact label="Contract value per year" value={money(spec.opportunity.acv, 0)} />
                <Fact label="Upfront cost now" value={money(spec.opportunity.upfrontCash)} />
                <Fact label="Delivery team per quarter" value={money(spec.opportunity.deliveryCostPerQuarter)} />
                <Fact label="Extra workload" value={`${spec.opportunity.orgLoadPerQuarter.toFixed(0)} pts × ${spec.opportunity.loadQuarters} qtrs`} />
                <Fact label="Product team time diverted" value={pct(spec.opportunity.roadmapDiversion)} />
                <Fact label="Our delivery readiness" value={pct(spec.opportunity.deliveryFit)} />
              </div>
              <p className="ds-muted">{spec.opportunity.aligned ? 'This contract fits your chosen strategy.' : `This contract does not fit your chosen strategy: it would reduce your strategic focus by ${pct(spec.opportunity.focusDilution)}.`}</p>
              <ChoiceList name="opp" testIdPrefix="v2-opp-choice" value={input.opportunity ? [input.opportunity.accept ? 'accept' : 'decline'] : []}
                onChange={v => set({ opportunity: { offerId: spec.opportunity!.offerId, accept: v[0] === 'accept' } })}
                options={[{ id: 'accept', label: <span data-testid="v2-opp-accept">Accept the contract</span> }, { id: 'decline', label: <span data-testid="v2-opp-decline">Decline</span> }]} />
            </Card>
          )}

          {spec.management && <ManagementCard spec={spec.management} value={input.management ?? {}} onChange={m => set({ management: m })} mode={mode} />}

          {spec.crisis && (
            <Card title={spec.crisis.title} sub={<span>Severity for your company: <b data-testid="v2-crisis-band">{spec.crisis.band}</b></span>} icon="alert" testId="v2-crisis">
              <p style={{ marginTop: 0 }}>{spec.crisis.description}</p>
              <ChoiceList name="crisis" testIdPrefix="v2-crisis-choice" value={input.crisisResponse ? [input.crisisResponse] : []} onChange={v => set({ crisisResponse: v[0] as V2PlayerQuarterInput['crisisResponse'] })}
                options={spec.crisis.responses.map(r => ({ id: r.id, label: <span data-testid={`v2-crisis-${r.id}`}>{r.label}</span>, detail: `${r.description} Cash now: ${money(r.cash)}.` }))} />
            </Card>
          )}

          <FinancingCard forecast={forecast} value={input.financing ?? []} debt={snap.state.financing.debt} onChange={f => set({ financing: f })} mode={mode} />
        </div>

        <div className="ds-stack">
          <Card title="Leadership discussion" icon="users" testId="v2-discussion">
            <Recommendations stances={delib.stances ?? {}} snapshot={snap} mode={mode} />
            <p className="ds-h4" style={{ marginTop: 12 }}>1 · What is our strategy based on?</p>
            <ChoiceList name="belief" testIdPrefix="v2-belief" value={delib.beliefId ? [delib.beliefId] : []}
              onChange={v => { const b = beliefs.find(x => x.id === v[0]); setDelib({ beliefId: v[0], belief: b ? pick('mba', b.label) : undefined }); }}
              options={beliefs.map(b => ({ id: b.id, label: pick(mode, b.label) }))} />
            <div className="ds-row" style={{ marginTop: 10 }}>
              <span className="ds-small" style={{ fontWeight: 600 }}>Confidence</span>
              <Segmented testIdPrefix="v2-confidence" value={delib.confidence} onChange={v => setDelib({ confidence: v })} options={CONFIDENCE_LEVELS.map(c => ({ id: c.value, label: c.label }))} />
            </div>
            <p className="ds-h4" style={{ marginTop: 16 }}>2 · What could go wrong? <span className="ds-muted" style={{ textTransform: 'none' }}>(choose two)</span></p>
            <ChoiceList multi max={2} name="risks" testIdPrefix="v2-risk" value={riskIds}
              onChange={v => setDelib({ riskIds: v, risks: v.map(id => pick('mba', risks.find(r => r.id === id)!.label)) })}
              options={risks.map(r => ({ id: r.id, label: pick(mode, r.label) }))} />
            {showNote ? (
              <label className="ds-stack" style={{ marginTop: 12, gap: 4 }}>
                <span className="ds-small" style={{ fontWeight: 600 }}>{mode === 'mba' ? 'Analysis (optional)' : 'Your note (optional)'}</span>
                <textarea className="ds-input" data-testid="v2-discussion-note" maxLength={1000} value={delib.note ?? ''} onChange={e => setDelib({ note: e.target.value })} placeholder={mode === 'mba' ? 'Key assumptions, evidence weighed, dissent…' : 'Anything else the team wants to remember?'} />
              </label>
            ) : <button className="ds-btn ds-btn-ghost" onClick={() => setShowNote(true)}>+ Add a note</button>}
          </Card>

          <Card title="3 · Are we ready to commit?" icon="check" testId="v2-ready">
            <DecisionSummary input={input} deliberation={delib} quarter={q} mode={mode} />
            {(errors.length > 0 || discussionMissing.length > 0) && (
              <ul className="ds-list ds-small" data-testid="v2-validation" style={{ marginTop: 8 }}>
                {[...errors, ...discussionMissing].map(e => <li key={e} className="ds-tone-bad">{e}</li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <div className="ds-actions ds-actions-sticky">
        {game.record.phase === 'decide' && <button className="ds-btn ds-btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('briefing')}>Back to the challenge</button>}
        <button className="ds-btn ds-btn-primary" data-testid="v2-to-vote" disabled={!ready || ctl.busy} onClick={() => void ctl.advance(['decide', 'belief', 'risk', target])}>
          {voting ? 'Ready — go to the private vote' : 'Ready — go to commit'} <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return <div><div className="ds-muted">{label}</div><div style={{ fontWeight: 700 }}>{value}</div></div>;
}

function Recommendations({ stances, snapshot, mode }: { stances: Partial<Record<string, string>>; snapshot: V2GameSnapshot; mode: V2PresentationMode }) {
  const given = V2_ROLES.filter(r => stances[r]);
  const label = (r: (typeof V2_ROLES)[number]) => buildRoleBriefing(snapshot, r, mode).recommendations.find(o => o.id === stances[r])?.label ?? String(stances[r]);
  if (!given.length) return <p className="ds-muted" style={{ margin: 0 }}>Each leader can pick a recommendation in their private brief to bring to this discussion.</p>;
  return (
    <div data-testid="v2-recommendations">
      <p className="ds-h4">Leaders recommend</p>
      <div className="ds-stack" style={{ gap: 4 }}>{given.map(r => <div key={r} className="ds-small"><b>{r}:</b> {label(r)}</div>)}</div>
    </div>
  );
}

function ManagementCard({ spec, value, onChange, mode }: { spec: NonNullable<ReturnType<typeof getDecisionSpec>>['management'] & object; value: V2ManagementActions; onChange: (m: V2ManagementActions) => void; mode: V2PresentationMode }) {
  const upd = (patch: Partial<V2ManagementActions>) => {
    const next: V2ManagementActions = { ...value, ...patch };
    for (const k of Object.keys(next) as (keyof V2ManagementActions)[]) if (next[k] === undefined || next[k] === false) delete next[k];
    onChange(next);
  };
  const desc = (id: string) => spec.options.find(o => o.id === id)?.description;
  return (
    <Card title="Recession response" sub="Optional actions" icon="alert" testId="v2-management">
      <div className="ds-stack">
        <div>
          <div className="ds-row"><b>Workforce reduction</b>
            <select className="ds-input" data-testid="v2-mgmt-workforce" value={value.workforceReduction?.depth ?? 'none'}
              onChange={e => upd({ workforceReduction: e.target.value === 'none' ? undefined : { depth: e.target.value as 'targeted' | 'deep', protectRnD: value.workforceReduction?.protectRnD } })}>
              <option value="none">None</option><option value="targeted">Targeted</option><option value="deep">Deep</option>
            </select>
            {value.workforceReduction && <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-protect" checked={value.workforceReduction.protectRnD === true} onChange={e => upd({ workforceReduction: { ...value.workforceReduction!, protectRnD: e.target.checked || undefined } })} /> Protect R&D</label>}
          </div>
          {mode === 'mba' && <p className="ds-muted" style={{ margin: '4px 0 0' }}>{desc('workforce-targeted')}</p>}
        </div>
        <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-freeze" checked={value.hiringFreeze === true} onChange={e => upd({ hiringFreeze: e.target.checked })} /> <b>Hiring freeze</b> — {desc('hiring-freeze')}</label>
        <div className="ds-row"><b className="ds-small">Consumer pricing</b>
          <select className="ds-input" data-testid="v2-mgmt-pricing" value={value.pricing ?? 'none'} onChange={e => upd({ pricing: e.target.value === 'none' ? undefined : e.target.value as 'raise' | 'discount' })}>
            <option value="none">No change</option><option value="raise">Raise prices</option><option value="discount">Discount</option>
          </select>
        </div>
        <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-close" checked={value.closeWeakOfferings === true} onChange={e => upd({ closeWeakOfferings: e.target.checked })} /> <b>Close weak offerings</b> — {desc('close-weak')}</label>
        <div className="ds-row"><b className="ds-small">Consumer marketing</b>
          <input type="range" min={spec.marketingLevelRange[0]} max={spec.marketingLevelRange[1]} step={0.1} value={value.marketingLevel ?? 1} data-testid="v2-mgmt-marketing"
            onChange={e => { const v = parseFloat(e.target.value); upd({ marketingLevel: Math.abs(v - 1) < 1e-9 ? undefined : v }); }} />
          <span className="ds-small">{(value.marketingLevel ?? 1).toFixed(1)}×</span>
        </div>
      </div>
    </Card>
  );
}

function FinancingCard({ forecast, value, debt, onChange, mode }: { forecast: V2Forecast | null; value: V2FinancingAction[]; debt: number; onChange: (f: V2FinancingAction[]) => void; mode: V2PresentationMode }) {
  const amt = (kind: 'debt' | 'equity' | 'repay') => value.filter(a => a.kind === kind).reduce((t, a) => t + ('amount' in a ? a.amount : 0), 0);
  const partner = value.some(a => a.kind === 'partner');
  const restructure = (value.find(a => a.kind === 'restructure') as { depth?: 'moderate' | 'deep' } | undefined)?.depth ?? 'none';
  const needs = !!forecast && forecast.gap > 0;
  const [open, setOpen] = useState(mode === 'mba' || value.length > 0 || needs);
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
    <Card title="Cash check (CFO)" icon="cash" testId="v2-financing" action={!needs && <button className="ds-btn ds-btn-ghost" data-testid="v2-fin-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Hide financing' : 'Financing options'}</button>}>
      {forecast ? (
        <div className={`ds-callout`} data-testid="v2-forecast" style={needs ? { background: 'var(--ds-bad-soft)', color: 'var(--ds-bad-ink)' } : undefined}>
          <Icon name={needs ? 'alert' : 'cash'} />
          <span>Forecast cash at the end of this quarter, before any financing: <b data-testid="v2-forecast-cash">{money(forecast.projectedClosingCash)}</b>{' '}
            (minimum to operate: {money(forecast.minimumOperatingCash, 0)}).{needs && ` Shortfall of ${money(forecast.gap)} — finance it, invest less, or risk insolvency.`}</span>
        </div>
      ) : <p className="ds-muted">Complete the investment plan to see the cash forecast.</p>}
      {(open || needs) && o && (
        <div className="ds-stack" style={{ marginTop: 12 }}>
          <ul className="ds-list ds-small">
            <li>Borrow up to {money(o.debtCapacity)} at {(o.debtRate * 100).toFixed(1)}% interest per quarter</li>
            <li>Sell shares for up to {money(o.maxEquity)} (company valued at {money(o.valuation.preMoney)})</li>
            <li>Strategic partner: {o.partner.available ? `${money(o.partner.cash)} for a minority stake and a share of revenue` : `not available (${o.partner.reason})`}</li>
            {mode === 'mba' && <li>Restructuring saves {money(o.restructuringSavings.moderate)} (moderate) or {money(o.restructuringSavings.deep)} (deep) per quarter, with a one-off cost and culture damage</li>}
          </ul>
          <div className="ds-row">
            <label className="ds-small">Borrow $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-debt" value={amt('debt') || ''} onChange={e => build({ debt: n(e.target.value) })} /></label>
            <label className="ds-small">Sell shares $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-equity" value={amt('equity') || ''} onChange={e => build({ equity: n(e.target.value) })} /></label>
            {debt > 0 && <label className="ds-small">Repay $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-repay" value={amt('repay') || ''} onChange={e => build({ repay: n(e.target.value) })} /></label>}
            <label className="ds-small"><input type="checkbox" data-testid="v2-fin-partner" checked={partner} onChange={e => build({ partner: e.target.checked })} /> Strategic partner</label>
            <label className="ds-small">Restructure <select className="ds-input" data-testid="v2-fin-restructure" value={restructure} onChange={e => build({ restructure: e.target.value })}>
              <option value="none">No</option><option value="moderate">Moderate</option><option value="deep">Deep</option></select></label>
          </div>
        </div>
      )}
    </Card>
  );
}
