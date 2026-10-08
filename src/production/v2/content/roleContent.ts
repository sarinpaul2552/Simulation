/**
 * PRIVATE ROLE BRIEFINGS (Batch 7 · 7A-C)
 *
 * Each briefing gives one leader something specific to contribute: their responsibility, what only they know, why it
 * matters, a recommendation to bring to the discussion, and questions to ask. Interpretations and suggested
 * recommendations are computed ONLY from information already in that role's private brief (adapter.getRoleBrief):
 * the role's scenario signals and the company KPIs that role owns. Hidden market truth is never used.
 */
import type { V2Role } from '../../../simulation/engineV2Scenario';
import { V2_DESTINATIONS, V2_DESTINATION_IDS, destinationReadiness } from '../../../simulation/engineV2Destination';
import { V2_FINANCING_CALIBRATION } from '../../../simulation/engineV2Financing';
import { summarizeV2Financials } from '../../../simulation/engineV2';
import { getRoleBrief, getDecisionSpec, workingQuarter } from '../adapter';
import type { V2GameSnapshot } from '../snapshot';
import type { V2Signal } from '../types';
import { V2PresentationMode, ModeText, mt, pick } from './modes';
import { evidenceKind, EvidenceKind, SIGNAL_PLAIN } from './scenarioContent';

export interface RoleOption { id: string; label: string }
export interface RoleKnowledge { id: string; evidence: EvidenceKind; text: string; value?: string }
export interface RoleBriefing {
  role: V2Role;
  title: string;
  perspective: string;
  responsibility: string;
  knowledge: RoleKnowledge[];
  whyItMatters: string[];
  recommendations: RoleOption[];
  suggested: { id: string; reason: string } | null;
  askTeam: string[];
}

const TITLES: Record<V2Role, string> = {
  CEO: 'Chief Executive Officer', CFO: 'Chief Financial Officer', Product: 'Chief Product Officer',
  People: 'Chief People Officer', Growth: 'Chief Growth Officer',
};
const PERSPECTIVE: Record<V2Role, string> = {
  CEO: 'Strategy and board expectations', CFO: 'Profitability, liquidity and financing',
  Product: 'Product readiness and technical execution', People: 'Talent, culture and organizational capacity',
  Growth: 'Customers, retention and market opportunities',
};
const RESPONSIBILITY: Record<V2Role, ModeText> = {
  CEO: mt('You keep the team focused on one clear direction and answer to the board.', 'You own the strategic thesis, board expectations and the coherence of the team’s decisions.'),
  CFO: mt('You make sure the company does not run out of money and that investments pay off.', 'You own liquidity, profitability, the CFO forecast and any financing decisions.'),
  Product: mt('You make sure our product — especially AI — is good enough for customers to pay for.', 'You own product quality, AI readiness, the roadmap and technical execution risk.'),
  People: mt('You make sure our people can actually deliver the plan without burning out.', 'You own talent, culture and organizational capacity versus the change load of the plan.'),
  Growth: mt('You know our customers: who is staying, who is leaving and where new demand is.', 'You own customer acquisition, retention, enterprise pipeline and market opportunities.'),
};

const ASK_GENERIC: Record<V2Role, ModeText[]> = {
  CEO: [mt('What single direction are we betting on this quarter?'), mt('Will the board see our decision as clear and consistent?')],
  CFO: [mt('Can we afford this plan if revenue falls short?'), mt('How much cash do we want left at the end of the quarter?')],
  Product: [mt('Is our product ready for what we are promising customers?'), mt('Which investment improves the product fastest?')],
  People: [mt('Can our teams handle this much change at once?'), mt('What happens to morale if we push harder?')],
  Growth: [mt('Which customers are we trying to win — and keep?'), mt('What do our customer numbers tell us that the news does not?')],
};
const ASK_QUARTER: Partial<Record<number, Partial<Record<V2Role, ModeText[]>>>> = {
  2: { Growth: [mt('If new customers cost 20% more, is consumer growth still worth funding?')], Product: [mt('Are we willing to fund AI for 2–3 quarters before it pays off?')] },
  3: { CFO: [mt('Should we trust the usage drop or the paying-customer numbers?')], CEO: [mt('What must be true before we commit next quarter?')] },
  4: { CEO: [mt('Which strategy do our current skills actually support?')], People: [mt('Can our people handle a 2–3 quarter reorganization?')] },
  5: { CFO: [mt('Can we pay $6–11M upfront and still be safe if a downturn comes?')], People: [mt('Who would deliver this contract, and what would they stop doing?')], Product: [mt('Would the client take over our product roadmap?')] },
  6: { CFO: [mt('How many quarters can we survive if revenue keeps falling?')], People: [mt('If we cut jobs, who leaves next — and what skills do we lose?')] },
  7: { CEO: [mt('What will customers and employees remember about how we handled this?')], CFO: [mt('Can we afford the full fix and still stay above minimum cash?')] },
  8: { CFO: [mt('Which options can we actually fund?')], CEO: [mt('Which option builds the company we want to be in three years?')] },
};

const FINAL_OPTION_LABEL: Record<string, string> = {
  'continue': 'Continue on the current course', 'scale-independently': 'Scale independently', 'raise-growth-capital': 'Raise growth capital',
  'acquire-consolidate': 'Acquire a weakened competitor', 'strategic-sale': 'Sell the company', 'stabilize-restructure': 'Stabilize and restructure',
};

const fmtMoney = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toFixed(1)}M`;

function knowledgeOf(signals: V2Signal[], mode: V2PresentationMode): RoleKnowledge[] {
  return signals.map(s => ({
    id: s.id,
    evidence: evidenceKind(s.kind === 'measured' ? 'measured' : s.kind),
    text: mode === 'undergraduate' && SIGNAL_PLAIN[s.id] ? SIGNAL_PLAIN[s.id] : s.label,
    value: s.kind === 'measured' && s.value !== undefined
      ? (s.unit === '$M' ? fmtMoney(s.value) : s.unit === '%' ? `${s.value.toFixed(1)}%` : s.unit === 'quarters' ? `${s.value.toFixed(1)} qtrs` : s.value.toFixed(0))
      : undefined,
  }));
}

/** Measured KPIs shown first in undergraduate mode (the rest stay available in MBA mode). */
const UG_KPIS: Record<V2Role, string[]> = {
  CEO: ['ceo-revenue', 'ceo-trust', 'ceo-pricing'],
  CFO: ['cfo-cash', 'cfo-op', 'cfo-runway', 'cfo-debt'],
  Product: ['product-pq', 'product-ai-readiness', 'product-ai-revenue'],
  People: ['people-talent', 'people-culture', 'people-capacity', 'people-load'],
  Growth: ['growth-retention', 'growth-cac', 'growth-pipeline'],
};

export function buildRoleBriefing(snap: V2GameSnapshot, role: V2Role, mode: V2PresentationMode): RoleBriefing {
  const q = workingQuarter(snap) ?? snap.completedQuarter;
  const brief = getRoleBrief(snap, role);
  const s = snap.state;
  const spec = getDecisionSpec(snap);
  const scenario = brief.signals.filter(x => x.kind !== 'measured');
  let measured = brief.signals.filter(x => x.kind === 'measured');
  if (mode === 'undergraduate') {
    const keep = UG_KPIS[role];
    measured = measured.filter(m => keep.includes(m.id) || m.id.startsWith('ceo-readiness-') || m.id === 'ceo-destination-readiness');
  }
  const why: string[] = [];
  let recs: RoleOption[] = [];
  let suggested: RoleBriefing['suggested'] = null;
  const L = V2_FINANCING_CALIBRATION.liquidity;
  const last = s.ledgerHistory[s.ledgerHistory.length - 1];
  const prev = s.ledgerHistory[s.ledgerHistory.length - 2];

  switch (role) {
    case 'CFO': {
      if (s.cash < L.minimumOperatingCash) why.push(pick(mode, mt(`Cash (${fmtMoney(s.cash)}) is below the ${fmtMoney(L.minimumOperatingCash)} minimum needed to operate — the company is at risk.`, `Cash of ${fmtMoney(s.cash)} is below minimum operating cash (${fmtMoney(L.minimumOperatingCash)}): liquidity must be resolved this quarter.`)));
      else if (s.cash < L.comfortableCash) why.push(pick(mode, mt(`Cash (${fmtMoney(s.cash)}) is below the comfortable level of ${fmtMoney(L.comfortableCash)} — big spending needs a plan.`, `Cash of ${fmtMoney(s.cash)} is below the ${fmtMoney(L.comfortableCash)} comfort level; the plan needs a funding buffer.`)));
      else why.push(pick(mode, mt(`Cash (${fmtMoney(s.cash)}) is healthy — we have room to invest.`, `Cash of ${fmtMoney(s.cash)} exceeds the ${fmtMoney(L.comfortableCash)} comfort level: capacity to invest.`)));
      if (last && prev) {
        const d = last.operatingProfit - prev.operatingProfit;
        if (Math.abs(d) >= 0.5) why.push(pick(mode, mt(`Profit from operations ${d > 0 ? 'rose' : 'fell'} by ${fmtMoney(Math.abs(d))} last quarter.`, `Operating profit ${d > 0 ? 'improved' : 'declined'} ${fmtMoney(Math.abs(d))} quarter-on-quarter.`)));
      }
      if (last) {
        const runway = summarizeV2Financials(last).runway.quarters;
        if (runway !== null) why.push(pick(mode, mt(`At last quarter’s spending, cash lasts about ${runway.toFixed(1)} quarters.`, `Runway at last quarter’s burn: ${runway.toFixed(1)} quarters.`)));
      }
      if (s.financing.debt > 0) why.push(pick(mode, mt(`We owe ${fmtMoney(s.financing.debt)} and pay interest every quarter.`, `Debt of ${fmtMoney(s.financing.debt)} carries quarterly interest and covenant risk.`)));
      recs = [
        { id: 'protect-cash', label: 'Hold back part of the budget as a cash cushion' },
        { id: 'full-budget', label: 'Invest the full budget — we can afford it' },
        { id: 'arrange-financing', label: 'Invest, and arrange debt or equity to stay safe' },
      ];
      const pickId = s.cash < L.minimumOperatingCash ? 'arrange-financing' : s.cash < L.comfortableCash ? 'protect-cash' : 'full-budget';
      suggested = { id: pickId, reason: `Based on cash of ${fmtMoney(s.cash)} versus the ${fmtMoney(L.comfortableCash)} comfort level.` };
      break;
    }
    case 'Product': {
      const r = s.commercial.aiCommercialReadiness;
      why.push(pick(mode, r < 40
        ? mt(`AI readiness is ${r.toFixed(0)}/100 — not yet good enough for many customers to pay for AI features.`, `AI commercial readiness ${r.toFixed(0)}/100: below the level at which AI monetizes meaningfully.`)
        : r < 70 ? mt(`AI readiness is ${r.toFixed(0)}/100 — improving, but not yet a strong selling point.`, `AI commercial readiness ${r.toFixed(0)}/100: credible but not differentiating.`)
          : mt(`AI readiness is ${r.toFixed(0)}/100 — a real strength customers can see.`, `AI commercial readiness ${r.toFixed(0)}/100: a differentiating capability.`)));
      if (s.productQuality < 70) why.push(pick(mode, mt(`Product quality (${s.productQuality.toFixed(0)}) is below where we started (70) — customers notice.`, `Product Quality ${s.productQuality.toFixed(0)} is below the starting level of 70.`)));
      else why.push(pick(mode, mt(`Product quality is ${s.productQuality.toFixed(0)} — ${s.productQuality >= 80 ? 'strong' : 'solid'}.`, `Product Quality ${s.productQuality.toFixed(0)}.`)));
      recs = [
        { id: 'invest-ai', label: 'Increase AI/product investment' },
        { id: 'maintain-product', label: 'Keep product investment steady' },
        { id: 'product-ready', label: 'The product is ready — invest elsewhere' },
      ];
      suggested = { id: r < 40 ? 'invest-ai' : r < 70 ? 'maintain-product' : 'product-ready', reason: `Based on AI readiness of ${r.toFixed(0)}/100.` };
      break;
    }
    case 'People': {
      const ratio = s.organizationalCapacity > 0 ? s.transformationLoad / s.organizationalCapacity : 0;
      why.push(pick(mode, ratio > 0.9
        ? mt(`Teams are close to overload: last quarter’s change load (${s.transformationLoad.toFixed(0)}) nearly matches our capacity (${s.organizationalCapacity.toFixed(0)}).`, `Change load ${s.transformationLoad.toFixed(0)} vs capacity ${s.organizationalCapacity.toFixed(0)}: investments will mature more slowly if we add more.`)
        : mt(`Teams have room for change: load ${s.transformationLoad.toFixed(0)} versus capacity ${s.organizationalCapacity.toFixed(0)}.`, `Load/capacity ${(ratio * 100).toFixed(0)}%: headroom for additional initiatives.`)));
      if (s.culture < 65) why.push(pick(mode, mt(`Culture (${s.culture.toFixed(0)}) is weakening — people may start to leave.`, `Culture ${s.culture.toFixed(0)} is eroding; attrition and execution risk rise.`)));
      if (s.capabilities.talent < 50) why.push(pick(mode, mt(`Talent (${s.capabilities.talent.toFixed(0)}) is low — we may lack the skills to deliver.`, `Talent ${s.capabilities.talent.toFixed(0)} constrains delivery.`)));
      recs = [
        { id: 'limit-change', label: 'Limit new initiatives — protect capacity' },
        { id: 'invest-people', label: 'Invest in people and capacity' },
        { id: 'can-absorb', label: 'We can absorb more change' },
      ];
      suggested = { id: ratio > 0.9 ? 'limit-change' : (s.culture < 65 || s.capabilities.talent < 50) ? 'invest-people' : 'can-absorb', reason: `Based on load/capacity of ${(ratio * 100).toFixed(0)}%, culture ${s.culture.toFixed(0)} and talent ${s.capabilities.talent.toFixed(0)}.` };
      break;
    }
    case 'Growth': {
      const c = s.commercial;
      why.push(pick(mode, mt(`${c.consumerRetention.toFixed(1)}% of paying consumers stay each quarter (we started at 85%).`, `Consumer retention ${c.consumerRetention.toFixed(1)}% (start 85%).`)));
      if (Math.abs(c.consumerCacIndex - 100) >= 3) why.push(pick(mode, mt(`Winning a new consumer costs ${c.consumerCacIndex > 100 ? 'more' : 'less'} than when we started (index ${c.consumerCacIndex.toFixed(0)}).`, `CAC index ${c.consumerCacIndex.toFixed(0)} (100 = start).`)));
      why.push(pick(mode, mt(`Our enterprise sales pipeline is ${fmtMoney(c.enterprisePipeline)} (we started at $80M).`, `Enterprise qualified pipeline ${fmtMoney(c.enterprisePipeline)} at a ${c.enterpriseWinRate.toFixed(0)}% win rate.`)));
      recs = [
        { id: 'defend-consumer', label: 'Defend and grow our consumer base' },
        { id: 'grow-enterprise', label: 'Go after enterprise demand' },
        { id: 'balance-growth', label: 'Balance consumer and enterprise growth' },
      ];
      const pipelineUp = c.enterprisePipeline >= 90, retentionDown = c.consumerRetention < 84;
      suggested = { id: pipelineUp && !retentionDown ? 'grow-enterprise' : retentionDown && !pipelineUp ? 'defend-consumer' : 'balance-growth', reason: `Based on retention of ${c.consumerRetention.toFixed(1)}% and pipeline of ${fmtMoney(c.enterprisePipeline)}.` };
      break;
    }
    case 'CEO': {
      if (q === 4 && !s.destination) {
        const ranked = V2_DESTINATION_IDS.map(id => ({ id, r: destinationReadiness(id, s).readiness })).sort((a, b) => b.r - a.r);
        why.push(pick(mode, mt(`Our skills fit ${V2_DESTINATIONS[ranked[0].id].name} best (${(ranked[0].r * 100).toFixed(0)}% ready) and ${V2_DESTINATIONS[ranked[ranked.length - 1].id].name} least (${(ranked[ranked.length - 1].r * 100).toFixed(0)}%).`, `Board readiness assessment: highest ${V2_DESTINATIONS[ranked[0].id].name} (${(ranked[0].r * 100).toFixed(0)}%), lowest ${V2_DESTINATIONS[ranked[ranked.length - 1].id].name} (${(ranked[ranked.length - 1].r * 100).toFixed(0)}%).`)));
        why.push(pick(mode, mt('Readiness is only one input — the board also wants a direction you believe in.', 'Readiness affects transition speed and load; it is not the only criterion.')));
        recs = V2_DESTINATION_IDS.map(id => ({ id: `dest-${id}`, label: V2_DESTINATIONS[id].name }));
        suggested = { id: `dest-${ranked[0].id}`, reason: 'Highest readiness from the board assessment — weigh it against your market beliefs.' };
      } else {
        if (s.destination) why.push(pick(mode, mt(`We are building a ${V2_DESTINATIONS[s.destination.id].name}. Decisions should strengthen that direction.`, `Committed destination: ${V2_DESTINATIONS[s.destination.id].name} (readiness at commitment ${(s.destination.readinessAtCommit * 100).toFixed(0)}%).`)));
        else why.push(pick(mode, mt('We have not chosen a long-term direction yet — Q4 will force that choice.', 'No destination yet: Q1–Q3 allocation determines Q4 readiness.')));
        why.push(pick(mode, mt(`Customer trust is ${s.trust.toFixed(0)} and pricing power is ${s.commercial.pricingPower.toFixed(0)}.`, `Trust ${s.trust.toFixed(0)}; pricing power ${s.commercial.pricingPower.toFixed(0)}.`)));
        recs = [
          { id: 'stay-focused', label: 'Stay focused on our main direction' },
          { id: 'adapt', label: 'Adapt to this quarter’s new evidence' },
          { id: 'reduce-risk', label: 'Reduce risk and protect the company' },
        ];
      }
      break;
    }
  }

  // Event-quarter recommendations replace the generic ones for every role (same, team-visible decision options)
  if (spec?.opportunity) {
    recs = [{ id: 'accept', label: 'Accept the contract' }, { id: 'decline', label: 'Decline the contract' }];
    suggested = null;
  } else if (spec?.crisis) {
    recs = spec.crisis.responses.map(r => ({ id: r.id, label: r.label }));
    suggested = role === 'CFO'
      ? (() => { const rem = spec.crisis!.responses.find(r => r.id === 'remediate')!; const ok = s.cash - rem.cash >= L.comfortableCash * 0.6; return { id: ok ? 'remediate' : 'contain', reason: `Cash ${fmtMoney(s.cash)} versus the ${fmtMoney(rem.cash)} cost of the full fix.` }; })()
      : null;
  } else if (spec?.final) {
    recs = spec.final.options.filter(o => o.available).map(o => ({ id: o.id, label: FINAL_OPTION_LABEL[o.id] ?? o.id }));
    suggested = null;
  }

  const ask = [...(ASK_QUARTER[q]?.[role] ?? []), ...ASK_GENERIC[role]].slice(0, 2).map(t => pick(mode, t));
  return {
    role, title: TITLES[role], perspective: PERSPECTIVE[role], responsibility: pick(mode, RESPONSIBILITY[role]),
    knowledge: [...knowledgeOf(scenario, mode), ...knowledgeOf(measured, mode)],
    whyItMatters: why.slice(0, mode === 'undergraduate' ? 2 : 4),
    recommendations: recs, suggested, askTeam: ask,
  };
}
