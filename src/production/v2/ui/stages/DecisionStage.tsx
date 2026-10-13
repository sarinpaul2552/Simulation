import { useMemo, useState } from 'react';
import { Term } from '../ds/glossary';
import { getDecisionSpec, validateQuarterInput, forecastQuarter, envelopeForInput, workingQuarter, configOf, isV3, V2Forecast } from '../../engine';
import { V3_ECONOMICS } from '../../../../simulationV3/engineV3Config';
import { saturationStatus } from '../../insights/saturation';
import type { V2Deliberation, V2PlayerQuarterInput } from '../../types';
import type { V2Allocation } from '../../../../simulation/engineV2';
import type { V2FinancingAction } from '../../../../simulation/engineV2Financing';
import type { V2ManagementActions } from '../../../../simulation/engineV2Management';
import type { V2FinalOptionId } from '../../../../simulation/engineV2Final';
import type { V2TeamController } from '../useV2Team';
import type { V2CommitmentMode } from '../../api';
import { defaultInput } from '../useV2Team';
import { BELIEFS, RISKS, CONFIDENCE_LEVELS } from '../../content/deliberationContent';
import { framingFor, rationaleMissing } from '../../content/decisionFraming';
import { gameHistory } from '../../insights/history';
import { canPrefill, prefillAllocation, prefillLimit } from '../../insights/prefill';
import { pick, V2PresentationMode } from '../../content/modes';
import { chapterFor, contentPath } from '../../content/paths';
import { calendarLabel } from '../../content/calendar';
import { FINAL_LABELS, money, pct } from '../format';
import { Card, ChoiceList, Fold, Icon, Section, Segmented } from '../ds/components';
import { DecisionSummary } from './DecisionSummary';
import { BUCKET_PERSPECTIVES, PERSPECTIVE_ORDER } from '../../content/bucketPerspectives';
import { ROLE_TITLES } from '../../content/roleContent';
import { checkFinancing } from '../../insights/financingCheck';
import { bucketTransformationLoad } from '../../../../simulation/engineV2Capabilities';
import { calendarShort } from '../../content/calendar';
import { BUCKETS, BUCKET_INFO, capacityEstimate, nominalGain, timeToImpact, Bucket } from '../../insights/consequences';
import type { V2GameSnapshot } from '../../snapshot';

const BUCKET_COLOR: Record<Bucket, string> = {
  consumer: 'var(--ds-c-consumer)', enterprise: 'var(--ds-c-enterprise)', aiProduct: 'var(--ds-c-ai)', people: 'var(--ds-c-people)', universityCredentials: 'var(--ds-c-university)',
};
const EVENT_HEADING: Record<number, string> = {
  4: 'Choose the company’s future — then fund it.',
  5: 'Take the offer, or keep your course?',
  6: 'Steer through the downturn.',
  7: 'Respond to the crisis.',
  8: 'Make the final move.',
};
const ROLE_SHORT: Record<string, string> = { CEO: 'CEO', CFO: 'CFO', Product: 'Product (CPO)', Growth: 'Growth (CGO)', People: 'People (CPeO)' };
const r1 = (x: number) => Math.round(x * 100) / 100;
const up1 = (x: number) => Math.ceil(x * 10 - 1e-9) / 10;
/** Move `amount` of planned investment to cash, cutting every bucket in proportion (amounts kept to $0.1M). */
function freeCash(a: V2Allocation, amount: number): V2Allocation {
  const inv = BUCKETS.reduce((t, b) => t + a[b], 0);
  if (inv <= 0 || amount <= 0) return a;
  const share = Math.min(1, amount / inv);
  const out = { ...a };
  for (const b of BUCKETS) out[b] = Math.floor(a[b] * (1 - share) * 10 + 1e-9) / 10;
  return out;
}
const CUT_KEYS: (keyof V2ManagementActions)[] = ['workforceReduction', 'hiringFreeze', 'marketingLevel', 'closeWeakOfferings'];
const withoutCuts = (m: V2ManagementActions | undefined): V2ManagementActions | undefined => {
  if (!m) return undefined;
  const out = { ...m };
  for (const k of CUT_KEYS) delete out[k];
  return Object.keys(out).length ? out : undefined;
};

/** Stage 2 — Leadership Decision: the quarter's strategic choice, the resource-allocation workspace and the discussion. */
export function DecisionStage({ ctl, mode, commitment }: { ctl: V2TeamController; mode: V2PresentationMode; commitment: V2CommitmentMode }) {
  const game = ctl.game!;
  const snap = game.snapshot;
  const q = workingQuarter(snap)!;
  const spec = getDecisionSpec(snap)!;
  const input: V2PlayerQuarterInput = { ...defaultInput(q), ...(ctl.draft?.input ?? {}), quarter: q } as V2PlayerQuarterInput;
  const delib: V2Deliberation = ctl.draft?.deliberation ?? {};
  const v3 = isV3(snap);
  const envelope = envelopeForInput(snap, input);
  const invested = BUCKETS.reduce((t, b) => t + (input.allocation[b] || 0), 0);

  const set = (patch: Partial<V2PlayerQuarterInput>) => {
    const next = { ...input, ...patch };
    const env = envelopeForInput(snap, next);
    const inv = BUCKETS.reduce((t, b) => t + (next.allocation[b] || 0), 0);
    next.allocation = { ...next.allocation, cashReserve: r1(Math.max(0, env - inv)) };
    ctl.updateDraft({ input: next, quarter: q });
  };
  const setBucket = (b: keyof V2Allocation, v: number) => set({ allocation: { ...input.allocation, [b]: Number.isFinite(v) && v > 0 ? v : 0 } });
  const setDelib = (patch: Partial<V2Deliberation>) => ctl.updateDeliberation(patch);

  const errors = useMemo(() => validateQuarterInput(snap, input), [snap, input]);
  const forecast: V2Forecast | null = useMemo(() => {
    try { return invested <= envelope + 1e-9 ? forecastQuarter(snap, { ...input, financing: [] }) : null; } catch { return null; }
  }, [snap, input, invested, envelope]);

  const beliefs = BELIEFS[q] ?? [];
  const risks = RISKS[q] ?? [];
  // Batch 10A: one biggest risk (older drafts with two risks still display the first and remain valid).
  const riskIds = (delib.riskIds ?? []).slice(0, 1);
  const framing = framingFor(q);
  const evidenceIds = delib.evidenceIds ?? [];
  const discussionMissing = rationaleMissing(q, delib);
  const previous = q > 1 ? gameHistory(snap)[q - 2]?.input.allocation : undefined;
  // Q8: the budget and any investment cap depend on the final option, so prefill is offered only once it is chosen,
  // and the offered plan is fitted to that option's cap. A later change of option never rewrites the plan.
  const investCap = spec.final?.options.find(o => o.id === input.finalOption)?.terms.investmentCap;
  const finalPending = !!spec.final && !input.finalOption;
  const prefillMax = prefillLimit(envelope, investCap);
  const offerPrefill = canPrefill(input.allocation, previous) && !finalPending;
  const prefillAfterFinal = canPrefill(input.allocation, previous) && finalPending;
  const finErrors = forecast ? checkFinancing(forecast.options, input.financing ?? [], snap.state.financing.debt, snap.state.financing.ownership).errors : [];
  const ready = errors.length === 0 && discussionMissing.length === 0 && finErrors.length === 0;
  const [showNote, setShowNote] = useState(mode === 'mba' || !!delib.note);
  const [beliefOpen, setBeliefOpen] = useState(!delib.beliefId || !delib.confidence);
  const [riskOpen, setRiskOpen] = useState(riskIds.length < 1);
  const beliefLabel = beliefs.find(b => b.id === delib.beliefId);
  const confLabel = CONFIDENCE_LEVELS.find(c => c.value === delib.confidence)?.label;
  const path = commitment === 'team_commitment' ? ['decide', 'belief', 'risk'] as const
    : commitment === 'private_vote' ? ['decide', 'belief', 'risk', 'vote'] as const : ['decide', 'belief', 'risk', 'commit'] as const;
  const cta = commitment === 'team_commitment' ? 'Review and commit' : commitment === 'private_vote' ? 'Go to the private vote' : 'Go to commit';
  const hasEvent = !!(spec.final || spec.destination || spec.opportunity || spec.management || spec.crisis);

  return (
    <div className="ds-stack-lg" data-testid="v2-phase-decide">
      <header >
        <p className="ds-eyebrow">{calendarLabel(q)} · {chapterFor(q, contentPath(snap)).title} · Discuss and decide</p>
        <h1 className="ds-title" style={{ fontSize: 'var(--fs-page)' }} data-testid="v2-decision-heading">{hasEvent ? (EVENT_HEADING[q] ?? 'Make the call, then fund it.') : (framing?.heading ?? `How will you deploy ${money(envelope, 0)}?`)}</h1>
        {framing && <p className="ds-muted" style={{ margin: '4px 0 0' }} data-testid="v2-decision-prompt">{pick(mode, framing.prompt)} <span className="ds-small" data-testid="v2-pace" data-pace={framing.pace}>{framing.pace === 'fast' ? 'Fast quarter' : 'Major decision'} · about {framing.minutes} minutes for the whole quarter.</span></p>}
      </header>

      {hasEvent && (
        <Section eyebrow="This quarter’s strategic decision" >
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
            {spec.destination && (
              <Card title="Choose the company’s future" sub="This cannot be changed later" icon="target" testId="v2-destinations">
                <ChoiceList name="destination" testIdPrefix="v2-dest-choice" value={input.destination ? [input.destination] : []} onChange={v => set({ destination: v[0] as V2PlayerQuarterInput['destination'] })}
                  options={spec.destination.options.map(d => ({ id: d.id, label: <span data-testid={`v2-dest-${d.id}`}>{d.name}</span>, detail: mode === 'mba' ? `${d.personality} Exposed to: ${d.exposures.join(', ')}.` : d.personality }))} />
              </Card>
            )}
            {spec.opportunity && (
              <Card title={spec.opportunity.name} icon="star" testId="v2-opportunity">
                <div className="ds-grid ds-grid-3" style={{ marginBottom: 14, gap: 14 }}>
                  <Fact label="Contract value per year" value={money(spec.opportunity.acv, 0)} />
                  <Fact label="Upfront cost now" value={money(spec.opportunity.upfrontCash)} />
                  <Fact label="Delivery team per quarter" value={money(spec.opportunity.deliveryCostPerQuarter)} />
                  <Fact label="Extra workload" value={`${spec.opportunity.orgLoadPerQuarter.toFixed(0)} pts × ${spec.opportunity.loadQuarters} qtrs`} />
                  <Fact label="Product team time diverted" value={pct(spec.opportunity.roadmapDiversion)} />
                  <Fact label="Our delivery readiness" value={pct(spec.opportunity.deliveryFit)} />
                </div>
                <p className="ds-muted">{spec.opportunity.aligned ? 'This contract fits your chosen strategy.' : `This contract does not fit your chosen strategy: it would reduce your strategic focus by ${pct(spec.opportunity.focusDilution)}.`}</p>
                {v3 && <ContractClaim upfront={spec.opportunity.upfrontCash} envelope={envelope} accepted={input.opportunity?.accept === true} reserve={input.allocation.cashReserve}
                  onMakeRoom={() => set({ allocation: freeCash(input.allocation, up1(spec.opportunity!.upfrontCash) - input.allocation.cashReserve) })} />}
                <ChoiceList name="opp" testIdPrefix="v2-opp-choice" value={input.opportunity ? [input.opportunity.accept ? 'accept' : 'decline'] : []}
                  onChange={v => set({ opportunity: { offerId: spec.opportunity!.offerId, accept: v[0] === 'accept' } })}
                  options={[{ id: 'accept', label: <span data-testid="v2-opp-accept">Accept the contract</span> }, { id: 'decline', label: <span data-testid="v2-opp-decline">Decline</span> }]} />
              </Card>
            )}
            {spec.management && v3 && <StanceCard value={input.recessionStance} reserve={input.allocation.cashReserve} people={input.allocation.people}
              onChange={st => set({ recessionStance: st, management: st === 'cut' ? input.management : withoutCuts(input.management) })}
              onMoveToCash={x => set({ allocation: freeCash(input.allocation, x) })} />}
            {spec.management && <ManagementCard spec={spec.management} value={input.management ?? {}} mode={mode}
              cutsAllowed={!v3 || input.recessionStance === 'cut'}
              peopleFunded={v3 ? input.allocation.people : 0}
              onChange={m => set(v3 && m.hiringFreeze && input.allocation.people > 0 ? { management: m, allocation: { ...input.allocation, people: 0 } } : { management: m })} />}
            {spec.crisis && (
              <Card title={spec.crisis.title} sub={<span>Severity for your company: <b data-testid="v2-crisis-band">{spec.crisis.band}</b></span>} icon="alert" testId="v2-crisis">
                <p style={{ marginTop: 0 }}>{spec.crisis.description}</p>
                <ChoiceList name="crisis" testIdPrefix="v2-crisis-choice" value={input.crisisResponse ? [input.crisisResponse] : []} onChange={v => set({ crisisResponse: v[0] as V2PlayerQuarterInput['crisisResponse'] })}
                  options={spec.crisis.responses.map(r => ({ id: r.id, label: <span data-testid={`v2-crisis-${r.id}`}>{r.label}</span>, detail: `${r.description} Cash now: ${money(r.cash)}.` }))} />
              </Card>
            )}
          </div>
        </Section>
      )}

      <div className="ds-grid ds-grid-work">
        <div className="ds-stack">
          {offerPrefill && previous && (
            <div className="ds-callout" data-testid="v2-prefill-offer">
              <Icon name="clock" />
              <span>Last quarter you invested {BUCKETS.filter(b => previous[b] > 0).map(b => `${BUCKET_INFO[b].short} ${money(previous[b])}`).join(' · ')}. You can start from that allocation and adjust it.{' '}
                <button className="ds-btn ds-btn-secondary" data-testid="v2-prefill" onClick={() => set({ allocation: prefillAllocation(previous, envelope, investCap) })}>Start from last quarter’s allocation</button>
                <span className="ds-muted" style={{ display: 'block', marginTop: 4 }}>Copies the five investment amounts only{investedTotalOf(previous) > prefillMax ? `, scaled down to ${investCap !== undefined && investCap < envelope ? `the ${money(investCap, 0)} investment cap of your chosen option` : `this quarter’s ${money(envelope, 0)} budget`}` : ''}. Nothing is committed until the team commits.</span>
              </span>
            </div>
          )}
          {prefillAfterFinal && <p className="ds-muted" data-testid="v2-prefill-after-final" style={{ margin: 0 }}>Choose your final strategic decision first: the budget depends on it. You can then start from last quarter’s allocation.</p>}
          <AllocationWorkspace snap={snap} allocation={input.allocation} envelope={envelope} onChange={setBucket} mode={mode} forecast={forecast} expansion={input.expansion ?? 0} />
          <FinancingCard forecast={forecast} value={input.financing ?? []} debt={snap.state.financing.debt} ownership={snap.state.financing.ownership} onChange={f => set({ financing: f })} mode={mode}
            expansion={v3 && V3_ECONOMICS.financing.quarters.includes(q) && !spec.final ? { value: input.expansion ?? 0, max: V3_ECONOMICS.financing.maxExpansion, floor: V3_ECONOMICS.financing.cashFloor, onChange: x => set({ expansion: x > 0 ? x : undefined }) } : undefined} />
        </div>

        <div className="ds-stack" data-testid="v2-discussion">
          <p className="ds-eyebrow" style={{ marginBottom: 0 }}>Leadership discussion</p>
          <p className="ds-muted" style={{ margin: 0 }}>Share what each of you saw in your brief. Where do your objectives pull in different directions? Three quick picks; nothing is graded.</p>
          {framing && (
            <div data-testid="v2-priority">
              <p className="ds-h4" style={{ marginBottom: 6 }}>1 · {framing.priorityQuestion}</p>
              <ChoiceList name="priority" testIdPrefix="v2-priority" value={delib.priorityId ? [delib.priorityId] : []}
                onChange={v => setDelib({ priorityId: v[0] })}
                options={framing.priorities.map(p => ({ id: p.id, label: pick(mode, p.label) }))} />
            </div>
          )}
          <details className="ds-fold" open={beliefOpen} onToggle={e => setBeliefOpen((e.target as HTMLDetailsElement).open)} data-testid="v2-fold-belief">
            <summary>2 · Our evidence: what is our strategy based on?{beliefLabel && <span className="ds-fold-hint">{framing?.evidence ? `${evidenceIds.length} signal${evidenceIds.length === 1 ? '' : 's'} cited · ` : ''}{pick(mode, beliefLabel.label)}{confLabel ? ` · ${confLabel} confidence` : ''}</span>}</summary>
            <div className="ds-fold-body">
              {framing?.evidence && (
                <div data-testid="v2-evidence" style={{ marginBottom: 12 }}>
                  <p className="ds-small" style={{ fontWeight: 650, margin: '0 0 6px' }}>{framing.evidenceQuestion}</p>
                  <ChoiceList multi max={2} name="evidence" testIdPrefix="v2-evidence" value={evidenceIds}
                    onChange={v => setDelib({ evidenceIds: v })}
                    options={framing.evidence.map(o => ({ id: o.id, label: pick(mode, o.label) }))} />
                </div>
              )}
              <p className="ds-small" style={{ fontWeight: 650, margin: '0 0 6px' }}>{framing?.evidence ? 'What we conclude from it' : 'What we believe'}</p>
              <ChoiceList name="belief" testIdPrefix="v2-belief" value={delib.beliefId ? [delib.beliefId] : []}
                onChange={v => { const b = beliefs.find(x => x.id === v[0]); setDelib({ beliefId: v[0], belief: b ? pick('mba', b.label) : undefined }); }}
                options={beliefs.map(b => ({ id: b.id, label: pick(mode, b.label) }))} />
              <div className="ds-row" style={{ marginTop: 12 }}>
                <span className="ds-small" style={{ fontWeight: 650 }}>How confident are we?</span>
                <Segmented testIdPrefix="v2-confidence" value={delib.confidence} onChange={v => { setDelib({ confidence: v }); if (delib.beliefId && (!framing?.evidence || evidenceIds.length > 0)) setBeliefOpen(false); }} options={CONFIDENCE_LEVELS.map(c => ({ id: c.value, label: c.label }))} />
              </div>
            </div>
          </details>
          <details className="ds-fold" open={riskOpen} onToggle={e => setRiskOpen((e.target as HTMLDetailsElement).open)} data-testid="v2-fold-risks">
            <summary>3 · Our biggest risk<span className="ds-fold-hint">{riskIds.length ? riskIds.map(id => { const r = risks.find(x => x.id === id); return r ? pick(mode, r.label) : id; }).join(' · ') : 'choose one'}</span></summary>
            <div className="ds-fold-body">
              <ChoiceList name="risks" testIdPrefix="v2-risk" value={riskIds}
                onChange={v => setDelib({ riskIds: v, risks: v.map(id => pick('mba', risks.find(r => r.id === id)!.label)) })}
                options={risks.map(r => ({ id: r.id, label: pick(mode, r.label) }))} />
              {showNote ? (
                <label className="ds-stack" style={{ marginTop: 12, gap: 4 }}>
                  <span className="ds-small" style={{ fontWeight: 650 }}>{mode === 'mba' ? 'Analysis (optional, one or two lines)' : 'Your note (optional, one line is enough)'}</span>
                  <textarea className="ds-input" data-testid="v2-discussion-note" rows={2} maxLength={1000} value={delib.note ?? ''} onChange={e => setDelib({ note: e.target.value })} placeholder={mode === 'mba' ? 'Key assumption or dissent…' : 'Anything the team wants to remember?'} />
                </label>
              ) : <button className="ds-btn ds-btn-ghost" onClick={() => setShowNote(true)}>+ Add a note</button>}
            </div>
          </details>
          <Fold title="4 · Decision summary" hint={ready ? 'ready' : `${errors.length + discussionMissing.length + finErrors.length} to complete`} open testId="v2-ready">
            <DecisionSummary input={input} deliberation={delib} quarter={q} mode={mode} config={configOf(snap)} />
            {(errors.length > 0 || discussionMissing.length > 0 || finErrors.length > 0) && (
              <ul className="ds-list ds-small" data-testid="v2-validation" style={{ marginTop: 10 }}>
                {[...errors, ...finErrors, ...discussionMissing].map(e => <li key={e} className="ds-tone-bad">{e}</li>)}
              </ul>
            )}
          </Fold>
        </div>
      </div>

      <div className="ds-actions ds-actions-sticky">
        {game.record.phase === 'decide' && <button className="ds-btn ds-btn-secondary" disabled={ctl.busy} onClick={() => void ctl.go('briefing')}>Back to the challenge</button>}
        <button className="ds-btn ds-btn-chapter ds-btn-lg" data-testid="v2-to-vote" disabled={!ready || ctl.busy} onClick={() => void ctl.advance([...path])}>
          {cta} <Icon name="arrow" />
        </button>
      </div>
    </div>
  );
}

const investedTotalOf = (a: V2PlayerQuarterInput['allocation']) => BUCKETS.reduce((t, b) => t + (a[b] || 0), 0);

function Fact({ label, value }: { label: string; value: string }) {
  return <div><div className="ds-muted">{label}</div><div style={{ fontWeight: 700, fontSize: '1.1em' }} className="ds-num">{value}</div></div>;
}

/** The resource-allocation workspace: budget, visual mix, per-bucket guidance and an execution-capacity estimate. */
function AllocationWorkspace({ snap, allocation, envelope, onChange, mode, forecast, expansion = 0 }: { snap: V2GameSnapshot; allocation: V2PlayerQuarterInput['allocation']; envelope: number; onChange: (b: keyof V2Allocation, v: number) => void; mode: V2PresentationMode; forecast: V2Forecast | null; expansion?: number }) {
  const q = workingQuarter(snap)!;
  const invested = BUCKETS.reduce((t, b) => t + (allocation[b] || 0), 0);
  const kept = envelope - invested;
  const est = useMemo(() => capacityEstimate(snap.state, allocation), [snap.state, allocation]);
  const over = invested > envelope + 1e-9;
  const levelText = { comfortable: 'Comfortable', busy: 'Busy', stretched: 'Stretched', overloaded: 'Overloaded' }[est.level];
  const levelTone = est.level === 'overloaded' ? 'bad' : est.level === 'stretched' ? 'caution' : 'good';
  return (
    <section className="ds-panel" data-testid="v2-allocation">
      <p className="ds-eyebrow">Strategic budget</p>
      <div className="ds-budget">
        <div>
          <div className="ds-budget-total ds-num">{money(envelope, envelope % 1 ? 1 : 0)}</div>
          <div className="ds-muted">to invest this quarter{expansion > 0 && <span data-testid="v2-budget-expansion"> (including {money(expansion)} financed this quarter)</span>}</div>
        </div>
        <div className="ds-budget-left">
          <span className="ds-muted">{over ? 'Over budget by' : 'Kept as cash'}</span>
          <b className={over ? 'ds-tone-bad' : ''} data-testid="v2-alloc-reserve">{money(over ? invested - envelope : kept)}</b>
          {forecast && <span className="ds-muted" style={{ display: 'block' }} data-testid="v2-alloc-cash-forecast">Cash at quarter end (estimate, before financing): <b className={forecast.gap > 0 ? 'ds-tone-bad' : ''}>{money(forecast.projectedClosingCash)}</b></span>}
        </div>
        <div className="ds-budget-bar" role="img" aria-label={`Allocation: ${BUCKETS.filter(b => allocation[b] > 0).map(b => `${BUCKET_INFO[b].short} ${money(allocation[b])}`).join(', ') || 'nothing invested'}; kept as cash ${money(Math.max(0, kept))}`}>
          {BUCKETS.map(b => allocation[b] > 0 && <span key={b} title={`${BUCKET_INFO[b].name} ${money(allocation[b])}`} style={{ flex: `${allocation[b]} 0 0`, background: BUCKET_COLOR[b] }} />)}
          {kept > 0.005 && <span className="ds-hatch" title={`Kept as cash ${money(kept)}`} style={{ flex: `${kept} 0 0` }} />}
        </div>
      </div>

      <div className="ds-buckets">
        {BUCKETS.map(b => {
          const info = BUCKET_INFO[b];
          const amt = allocation[b] || 0;
          const tti = timeToImpact(b);
          const gain = nominalGain(b, amt);
          const sat = saturationStatus(snap.state, b);
          return (
            <div className="ds-bucket" key={b} data-bucket={b}>
              <span className="ds-bucket-swatch" style={{ background: BUCKET_COLOR[b] }} />
              <div>
                <label className="ds-bucket-name" htmlFor={`alloc-${b}`}>{info.name}<span className="ds-muted" style={{ fontWeight: 500 }} title="From the engine’s maturation schedule">· {tti.schedule[0] >= 0.5 ? 'pays off sooner' : 'pays off later'}</span></label>
                <div className="ds-bucket-desc">{mode === 'mba' ? info.mba : info.ug}</div>
                {sat.near && <div className="ds-small ds-tone-caution" data-testid={`v2-saturation-${b}`}><Icon name="alert" size={12} /> Close to what the organization can use: {info.builds.split(',')[0]} is near its ceiling once earlier investment lands. More here is likely to be wasted.</div>}
              </div>
              <input id={`alloc-${b}`} data-testid={`v2-alloc-${b}`} type="number" min={0} step={0.5} inputMode="decimal" value={allocation[b]} onChange={e => onChange(b, parseFloat(e.target.value))} aria-label={`${info.name} ($M)`} />
              <input type="range" min={0} max={Math.min(30, envelope)} step={0.5} value={Math.min(amt, 30)} onChange={e => onChange(b, parseFloat(e.target.value))} aria-label={`${info.name} slider`} tabIndex={-1} />
              <details className="ds-perspectives" data-testid={`v2-perspectives-${b}`}>
                <summary>Competing executive considerations</summary>
                <dl>{PERSPECTIVE_ORDER.filter(r => BUCKET_PERSPECTIVES[b][r]).map(r => <div key={r} style={{ display: 'contents' }}><dt title={ROLE_TITLES[r]}>{ROLE_SHORT[r]}</dt><dd>{pick(mode, BUCKET_PERSPECTIVES[b][r]!)}</dd></div>)}</dl>
              </details>
              {amt > 0 && (
                <div className="ds-bucket-meta" data-testid={`v2-bucket-est-${b}`}>
                  <span><b>Builds:</b> {info.builds}.</span>
                  <span><b>Lands:</b> {tti.schedule.map((share, i) => `${calendarShort(q + i)} ${(share * 100).toFixed(0)}%`).join(' · ')}.</span>
                  <span><b>Workload:</b> +{bucketTransformationLoad(b, Math.min(amt, 30)).toFixed(0)} load points.</span>
                  <span><b>Estimate:</b> up to about +{gain.toFixed(1)} {info.builds.split(',')[0]} points before workload losses (not guaranteed).</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="ds-bucket ds-bucket-cash">
          <span className="ds-bucket-swatch ds-hatch" />
          <div><span className="ds-bucket-name">Kept as cash</span><div className="ds-bucket-desc">Not invested — stays on the balance sheet.</div></div>
          <b className="ds-num" style={{ textAlign: 'right' }}>{money(Math.max(0, kept))}</b>
        </div>
      </div>

      <div className="ds-gauge" data-testid="v2-capacity" data-level={est.level}>
        <div className="ds-row" style={{ justifyContent: 'space-between' }}>
          <span className="ds-small" style={{ fontWeight: 650 }}><Term id="execution-capacity">Execution capacity</Term> (estimate)</span>
          <span className={`ds-small ds-tone-${levelTone}`} style={{ fontWeight: 700 }}><Icon name={levelTone === 'good' ? 'check' : 'alert'} size={12} /> {levelText} · {pct(est.ratio)}</span>
        </div>
        <div className="ds-gauge-track"><span className="ds-gauge-mark" style={{ left: `${Math.min(100, (est.ratio / 1.25) * 100)}%` }} /></div>
        <div className="ds-gauge-scale"><span>0%</span><span>50%</span><span>80%</span><span>100%</span><span>125%</span></div>
        {est.level === 'stretched' || est.level === 'overloaded'
          ? <p className="ds-small ds-tone-bad" style={{ margin: '8px 0 0' }}>Your teams would be {est.level}: only about {pct(est.absorption)} of new investment is likely to turn into capability. Fewer simultaneous initiatives or more People investment reduces the loss.</p>
          : <p className="ds-muted" style={{ margin: '8px 0 0' }}>{est.activeInitiatives} initiative{est.activeInitiatives === 1 ? '' : 's'} at once{est.coordination > 0 ? `, adding ${est.coordination} points of coordination work` : ''}. Strategy commitments, contracts and events can add more.</p>}
      </div>
      {over && <p className="ds-error" style={{ marginTop: 10 }}><Icon name="alert" />You have allocated {money(invested)} — more than the {money(envelope, 0)} budget.</p>}
      <p className="ds-muted" style={{ marginTop: 10, marginBottom: 0 }}>Investment builds capability over one to three quarters (<Term id="maturation">capability maturation</Term>). Returns are not guaranteed: they depend on your teams’ capacity and on the market.</p>
    </section>
  );
}

/** V3 (E5): the contract's implementation cost is paid from this quarter's budget. */
function ContractClaim({ upfront, envelope, accepted, reserve, onMakeRoom }: { upfront: number; envelope: number; accepted: boolean; reserve: number; onMakeRoom: () => void }) {
  const need = up1(upfront);
  const short = accepted && reserve + 0.01 < upfront;
  return (
    <div className={short ? 'ds-notice ds-notice-bad' : 'ds-callout'} data-testid="v2-opp-claim" style={{ marginBottom: 12 }}>
      <Icon name="cash" />
      <span>Accepting uses <b>{money(need)} of your {money(envelope, 0)} budget</b> for implementation, so at most {money(envelope - need)} is left to invest this quarter. Keep at least {money(need)} as cash in the plan below.
        {short && <> You are keeping {money(reserve)}. <button className="ds-btn ds-btn-secondary" data-testid="v2-opp-make-room" onClick={onMakeRoom}>Reduce every investment in proportion to make room</button></>}
      </span>
    </div>
  );
}

/** V3 (E6): the recession stance, one required choice. */
function StanceCard({ value, reserve, people, onChange, onMoveToCash }: { value?: 'protect' | 'slow' | 'cut'; reserve: number; people: number; onChange: (s: 'protect' | 'slow' | 'cut') => void; onMoveToCash: (x: number) => void }) {
  const minRes = V3_ECONOMICS.recession.slowMinimumReserve;
  return (
    <Card title="Recession stance" sub="Required: choose one" icon="alert" testId="v2-stance">
      <ChoiceList name="stance" testIdPrefix="v2-stance" value={value ? [value] : []} onChange={v => onChange(v[0] as 'protect' | 'slow' | 'cut')}
        options={[
          { id: 'protect', label: 'Protect: keep investing through the downturn', detail: 'No cost cuts. You accept a weaker cash position now to keep building.' },
          { id: 'slow', label: 'Slow: hold back part of the budget', detail: `Keep at least ${money(minRes, 0)} of the budget as cash. No layoffs.` },
          { id: 'cut', label: 'Cut: reduce costs', detail: 'Take at least one cost action below: hiring freeze, workforce reduction, lower marketing or closing weak offerings.' },
        ]} />
      {value === 'slow' && reserve + 0.01 < minRes && (
        <p className="ds-small ds-tone-bad" data-testid="v2-stance-slow-short">You are keeping {money(reserve)} as cash. <button className="ds-btn ds-btn-secondary" data-testid="v2-stance-make-room" onClick={() => onMoveToCash(up1(minRes - reserve))}>Move {money(up1(minRes - reserve))} to cash</button></p>
      )}
      {value === 'cut' && people > 0 && <p className="ds-muted ds-small" style={{ margin: '6px 0 0' }}>A hiring freeze stops People investment: choosing it moves your {money(people)} People allocation to cash.</p>}
    </Card>
  );
}

function ManagementCard({ spec, value, onChange, mode, cutsAllowed = true, peopleFunded = 0 }: { spec: NonNullable<ReturnType<typeof getDecisionSpec>>['management'] & object; value: V2ManagementActions; onChange: (m: V2ManagementActions) => void; mode: V2PresentationMode; cutsAllowed?: boolean; peopleFunded?: number }) {
  const upd = (patch: Partial<V2ManagementActions>) => {
    const next: V2ManagementActions = { ...value, ...patch };
    for (const k of Object.keys(next) as (keyof V2ManagementActions)[]) if (next[k] === undefined || next[k] === false) delete next[k];
    onChange(next);
  };
  const desc = (id: string) => spec.options.find(o => o.id === id)?.description;
  return (
    <Card title="Recession response" sub={cutsAllowed ? 'Optional actions' : 'Cost actions need the “Cut” stance; pricing is always available'} icon="alert" testId="v2-management">
      <div className="ds-stack">
        <div>
          <div className="ds-row"><b>Workforce reduction</b>
            <select className="ds-input" data-testid="v2-mgmt-workforce" disabled={!cutsAllowed} value={value.workforceReduction?.depth ?? 'none'}
              onChange={e => upd({ workforceReduction: e.target.value === 'none' ? undefined : { depth: e.target.value as 'targeted' | 'deep', protectRnD: value.workforceReduction?.protectRnD } })}>
              <option value="none">None</option><option value="targeted">Targeted</option><option value="deep">Deep</option>
            </select>
            {value.workforceReduction && <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-protect" checked={value.workforceReduction.protectRnD === true} onChange={e => upd({ workforceReduction: { ...value.workforceReduction!, protectRnD: e.target.checked || undefined } })} /> Protect R&D</label>}
          </div>
          {mode === 'mba' && <p className="ds-muted" style={{ margin: '4px 0 0' }}>{desc('workforce-targeted')}</p>}
        </div>
        <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-freeze" disabled={!cutsAllowed} checked={value.hiringFreeze === true} onChange={e => upd({ hiringFreeze: e.target.checked })} /> <b>Hiring freeze</b> — {desc('hiring-freeze')}{peopleFunded > 0 && cutsAllowed && !value.hiringFreeze ? ` (moves your ${money(peopleFunded)} People investment to cash)` : ''}</label>
        <div className="ds-row"><b className="ds-small">Consumer pricing</b>
          <select className="ds-input" data-testid="v2-mgmt-pricing" value={value.pricing ?? 'none'} onChange={e => upd({ pricing: e.target.value === 'none' ? undefined : e.target.value as 'raise' | 'discount' })}>
            <option value="none">No change</option><option value="raise">Raise prices</option><option value="discount">Discount</option>
          </select>
        </div>
        <label className="ds-small"><input type="checkbox" data-testid="v2-mgmt-close" disabled={!cutsAllowed} checked={value.closeWeakOfferings === true} onChange={e => upd({ closeWeakOfferings: e.target.checked })} /> <b>Close weak offerings</b> — {desc('close-weak')}</label>
        <div className="ds-row"><b className="ds-small">Consumer marketing</b>
          <input type="range" min={cutsAllowed ? spec.marketingLevelRange[0] : 1} max={spec.marketingLevelRange[1]} step={0.1} value={value.marketingLevel ?? 1} data-testid="v2-mgmt-marketing"
            onChange={e => { const v = parseFloat(e.target.value); upd({ marketingLevel: Math.abs(v - 1) < 1e-9 ? undefined : v }); }} />
          <span className="ds-small">{(value.marketingLevel ?? 1).toFixed(1)}×</span>
        </div>
      </div>
    </Card>
  );
}

interface ExpansionControl { value: number; max: number; floor: number; onChange: (x: number) => void }

function FinancingCard({ forecast, value, debt, ownership, onChange, mode, expansion }: { forecast: V2Forecast | null; value: V2FinancingAction[]; debt: number; ownership: number; onChange: (f: V2FinancingAction[]) => void; mode: V2PresentationMode; expansion?: ExpansionControl }) {
  const amt = (kind: 'debt' | 'equity' | 'repay') => value.filter(a => a.kind === kind).reduce((t, a) => t + ('amount' in a ? a.amount : 0), 0);
  const partner = value.some(a => a.kind === 'partner');
  const restructure = (value.find(a => a.kind === 'restructure') as { depth?: 'moderate' | 'deep' } | undefined)?.depth ?? 'none';
  const needs = !!forecast && forecast.gap > 0;
  const thin = !!forecast && !needs && forecast.projectedClosingCash < 40;
  const [open, setOpen] = useState(value.length > 0 || needs);
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
  const check = o ? checkFinancing(o, value, debt, ownership) : null;
  const showAdvanced = open || needs;
  return (
    <section className="ds-panel" data-testid="v2-financing">
      <div className="ds-card-h"><h3>Liquidity and financing</h3><span className="ds-sub">CFO forecast</span><span className="ds-spacer" />
        {!needs && <button className="ds-btn ds-btn-ghost" data-testid="v2-fin-toggle" aria-expanded={showAdvanced} onClick={() => setOpen(!open)}>{showAdvanced ? 'Hide financing options' : 'Financing options'}</button>}
      </div>
      {forecast ? (
        <div className={needs ? 'ds-notice ds-notice-bad' : thin ? 'ds-notice' : 'ds-callout'} data-testid="v2-forecast" role={needs ? 'alert' : undefined}>
          <Icon name={needs ? 'alert' : 'cash'} />
          <span>{needs && <b>Liquidity shortfall. </b>}Forecast cash at the end of this quarter, before any financing: <b data-testid="v2-forecast-cash">{money(forecast.projectedClosingCash)}</b>{' '}
            (minimum to operate: {money(forecast.minimumOperatingCash, 0)}; comfortable: $40M).{needs && ` Shortfall of ${money(forecast.gap)} — finance it, invest less, or risk insolvency.`}{thin && ' Below the comfortable level — little room for a bad quarter.'}</span>
        </div>
      ) : <p className="ds-muted">Complete the investment plan to see the cash forecast.</p>}
      {showAdvanced && o && (
        <div className="ds-stack" style={{ marginTop: 12 }} data-testid="v2-fin-advanced">
          <table className="ds-table ds-table-compact">
            <caption>Terms on offer this quarter</caption>
            <tbody>
              <tr><td>Borrowing</td><td className="num">up to {money(o.debtCapacity)}</td><td className="ds-muted">up to {(o.debtRate * 100).toFixed(1)}% interest per quarter</td></tr>
              <tr><td>Sell new shares</td><td className="num">up to {money(o.maxEquity)}</td><td className="ds-muted">company valued at {money(o.valuation.preMoney)} before the raise</td></tr>
              <tr><td>Strategic partner</td><td className="num">{o.partner.available ? money(o.partner.cash) : '—'}</td><td className="ds-muted">{o.partner.available ? 'for a minority stake and a share of revenue' : `not available (${o.partner.reason})`}</td></tr>
              {mode === 'mba' && <tr><td>Restructuring</td><td className="num">{money(o.restructuringSavings.moderate)} / {money(o.restructuringSavings.deep)}</td><td className="ds-muted">savings per quarter (moderate / deep), with a one-off cost and culture damage</td></tr>}
            </tbody>
          </table>
          <div className="ds-row">
            <label className="ds-small">Borrow $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-debt" value={amt('debt') || ''} onChange={e => build({ debt: n(e.target.value) })} /></label>
            <label className="ds-small">Sell shares $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-equity" value={amt('equity') || ''} onChange={e => build({ equity: n(e.target.value) })} /></label>
            {debt > 0 && <label className="ds-small">Repay $M <input className="ds-input" style={{ width: 90 }} type="number" min={0} data-testid="v2-fin-repay" value={amt('repay') || ''} onChange={e => build({ repay: n(e.target.value) })} /></label>}
            <label className="ds-small"><input type="checkbox" data-testid="v2-fin-partner" checked={partner} onChange={e => build({ partner: e.target.checked })} /> Strategic partner</label>
            <label className="ds-small">Restructure <select className="ds-input" data-testid="v2-fin-restructure" value={restructure} onChange={e => build({ restructure: e.target.value })}>
              <option value="none">No</option><option value="moderate">Moderate</option><option value="deep">Deep</option></select></label>
          </div>
          {expansion && (
            <div className="ds-callout" data-testid="v2-expansion">
              <Icon name="cash" />
              <span>
                <b>Invest more than the base budget.</b> New money raised this quarter (borrowing or shares) can add up to {money(Math.min(expansion.max, amt('debt') + amt('equity')))} to this quarter’s budget (limit {money(expansion.max, 0)}). The plan must still leave at least {money(expansion.floor, 0)} of cash. Borrowed money costs interest; new shares dilute the owners.
                <label className="ds-small" style={{ display: 'block', marginTop: 6 }}>Add to this quarter’s budget $M{' '}
                  <input className="ds-input" style={{ width: 90 }} type="number" min={0} max={expansion.max} step={0.5} data-testid="v2-fin-expansion" value={expansion.value || ''} onChange={e => expansion.onChange(n(e.target.value))} />
                </label>
              </span>
            </div>
          )}
          {check && check.errors.length > 0 && <ul className="ds-list ds-small" data-testid="v2-fin-errors">{check.errors.map(e => <li key={e} className="ds-tone-bad">{e}</li>)}</ul>}
          {check && check.notes.length > 0 && <ul className="ds-list ds-small" data-testid="v2-fin-notes">{check.notes.map(e => <li key={e}>{e}</li>)}</ul>}
        </div>
      )}
    </section>
  );
}
