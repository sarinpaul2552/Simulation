/**
 * NEXLEARN V3 LABORATORY — metrics for a played game (production insight code; nothing re-implemented).
 *   price        valuation series (NXLN-VAL-1.0 for V2 games, NXLN-VAL-1.1 for V3 games — selected by the record's engine)
 *   executive    NXLN-EXEC-1.1 scorecards
 *   terminal     the engine's own terminal score (V2 or V3 scoring module, unchanged formulas)
 */
import { gameHistory } from '../../../src/production/v2/insights/history';
import { valuationSeries } from '../../../src/production/v2/insights/valuation';
import { allScorecards } from '../../../src/production/v2/insights/executive';
import { verifySnapshot } from '../../../src/production/v2/engine';
import { scoreV2Company as scoreV2 } from '../../../src/simulation/engineV2Scoring';
import { scoreV2Company as scoreV3 } from '../../../src/simulationV3/engineV3Scoring';
import type { PlayedGame } from './player';
import { withV3Version } from '../../../src/simulationV3/engineV3Config';

export interface GameMetrics {
  strategy: string; engine: string; path: string;
  price: number; priceQ4: number; revenue: number; segments: { consumer: number; enterprise: number; university: number; aiNative: number };
  operatingProfit: number; cumulativeOperatingProfit: number; margin: number;
  cash: number; debt: number; netCash: number; ownership: number; minCash: number;
  culture: number; talent: number; execution: number; customerSuccess: number;
  terminal: number; terminalFinancial: number; terminalStrategic: number; terminalOrganizational: number; band: string;
  executive: Record<string, number>; executiveTeam: number;
  waste: number; absorptionLoss: number; peakLoadRatio: number;
  identitiesHold: boolean; replayVerified: boolean;
  destination: string | null; finalOption: string | null; contractAccepted: boolean | null; stance: string | null; recessionActions: string;
  expansionTotal: number; everInsolvent: boolean;
  priceByQuarter: number[]; revenueByQuarter: number[]; cultureByQuarter: number[];
}

export function metricsOf(g: PlayedGame): GameMetrics {
  const hist = gameHistory(g.snapshot);
  const val = valuationSeries(hist);
  const cards = allScorecards(hist);
  const s = g.snapshot.state;
  // V3.1 Stage 3C-A: a V3 game is scored under its own engine version's configuration
  const sc = g.config.engine === 'v3' ? withV3Version(g.snapshot.engineVersion, () => scoreV3(s as never)) : scoreV2(s as never);
  const ledgers = g.quarters.map(q => q.consequence.ledger);
  const q5 = g.quarters[4]?.input.opportunity;
  const q6 = g.quarters[5]?.input;
  return {
    strategy: g.strategy.id, engine: g.config.engine, path: g.config.path ?? '-',
    price: val.points[val.points.length - 1].price, priceQ4: val.points[4]?.price ?? NaN,
    revenue: s.revenue, segments: { ...s.segmentRevenue },
    operatingProfit: s.operatingProfit, cumulativeOperatingProfit: ledgers.reduce((t, l) => t + l.operatingProfit, 0),
    margin: s.revenue > 0 ? s.operatingProfit / s.revenue : 0,
    cash: s.cash, debt: s.financing.debt, netCash: s.cash - s.financing.debt, ownership: s.financing.ownership,
    minCash: Math.min(...ledgers.map(l => l.closingCash)),
    culture: s.culture, talent: s.capabilities.talent, execution: s.capabilities.execution, customerSuccess: s.capabilities.customerSuccess,
    terminal: sc.overall, terminalFinancial: sc.financial, terminalStrategic: sc.strategic, terminalOrganizational: sc.organizational, band: sc.band,
    executive: Object.fromEntries(cards.map(c => [c.role, c.executive])), executiveTeam: cards.reduce((t, c) => t + c.executive, 0) / cards.length,
    waste: g.quarters.reduce((t, q) => t + q.consequence.capability.targets.reduce((u, x) => u + x.wastedSaturation, 0), 0),
    absorptionLoss: g.quarters.reduce((t, q) => t + q.consequence.capability.targets.reduce((u, x) => u + x.absorptionLoss, 0), 0),
    peakLoadRatio: Math.max(...g.quarters.map(q => q.consequence.capability.loadToCapacityRatio)),
    identitiesHold: g.quarters.every(q => q.consequence.identity.holds),
    replayVerified: verifySnapshot(g.snapshot).ok,
    destination: s.destination?.id ?? null, finalOption: s.final.record?.option ?? null,
    contractAccepted: q5 ? q5.accept : null, stance: q6?.recessionStance ?? null,
    recessionActions: q6?.management ? Object.entries(q6.management).map(([k, v]) => (typeof v === 'object' ? `${k}:${(v as { depth?: string }).depth ?? ''}` : `${k}${v === true ? '' : '=' + v}`)).join(', ') || 'none' : 'none',
    expansionTotal: g.quarters.reduce((t, q) => t + (q.input.expansion ?? 0), 0),
    everInsolvent: s.solvency.everInsolvent,
    priceByQuarter: val.points.map(p => p.price), revenueByQuarter: ledgers.map(l => l.revenue), cultureByQuarter: g.quarters.map(q => q.after.culture),
  };
}
