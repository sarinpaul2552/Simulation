import { ARC_STRATEGIES, runArc, V2ArcRun, V2ArcOptions, MATRIX_HISTORIES } from './v2ScenarioArc';
import { V2_DESTINATION_IDS, V2DestinationId } from '../../simulation/engineV2Destination';
import { scoreV2Company, V2TerminalScore } from '../../simulation/engineV2Scoring';

/**
 * FULL Q1–Q8 CALIBRATION AUDIT (Batch 3, Test Lab only)
 *
 * Plays complete eight-quarter games (scenario Q1–Q8, Q5 opportunity, Q6 recession response, liquidity/financing,
 * Q7 crisis, Q8 final decision) and reports the economics and terminal score of the company built.
 */

export interface V2AuditRow {
  id: string;
  label: string;
  history: string;
  destination: V2DestinationId | null;
  revenue: number;
  segments: { consumer: number; enterprise: number; university: number; aiNative: number };
  operatingCost: number;
  operatingProfit: number;
  margin: number;
  cash: number;
  debt: number;
  financing: { equity: number; debtDrawn: number; partner: number; restructurings: number; ownership: number; interestPaid: number };
  culture: number;
  trust: number;
  execution: number;
  capabilities: Record<string, number>;
  q5Accepted: boolean | null;
  q6Actions: string;
  crisis: { type: string; severity: number; response: string } | null;
  q8Options: string[];
  q8Choice: string | null;
  everInsolvent: boolean;
  insolventAtEnd: boolean;
  score: V2TerminalScore;
  passed: boolean;
}

export function auditRow(run: V2ArcRun, label = run.strategy.name, history = run.strategy.id): V2AuditRow {
  const s = run.finalState;
  const L = s.ledgerHistory[s.ledgerHistory.length - 1];
  const rounds = s.financing.rounds;
  const sumKind = (k: string) => rounds.filter(r => r.kind === k).reduce((t, r) => t + r.amount, 0);
  const q5 = run.quarters[4]?.decisions?.opportunity;
  const q6 = run.quarters[5]?.decisions?.management;
  const crisis = s.crisis.record;
  const fin = s.final.record;
  return {
    id: `${history}→${s.destination?.id ?? 'none'}`,
    label,
    history,
    destination: s.destination?.id ?? null,
    revenue: L.revenue,
    segments: { ...s.segmentRevenue },
    operatingCost: L.operatingCost,
    operatingProfit: L.operatingProfit,
    margin: L.revenue > 0 ? L.operatingProfit / L.revenue : 0,
    cash: s.cash,
    debt: s.financing.debt,
    financing: {
      equity: sumKind('equity'), debtDrawn: sumKind('debt'), partner: sumKind('partner'), restructurings: rounds.filter(r => r.kind === 'restructure').length,
      ownership: s.financing.ownership, interestPaid: s.financing.cumulativeInterest,
    },
    culture: s.culture,
    trust: s.trust,
    execution: s.capabilities.execution,
    capabilities: { ...s.capabilities, productQuality: s.productQuality, organizationalCapacity: s.organizationalCapacity },
    q5Accepted: q5 ? q5.accept : null,
    q6Actions: q6 ? Object.keys(q6).join('+') || 'none' : 'n/a',
    crisis: crisis ? { type: crisis.assessment.type, severity: crisis.assessment.severity, response: crisis.response } : null,
    q8Options: fin ? fin.availability.filter(o => o.available).map(o => o.id) : [],
    q8Choice: fin ? fin.option : null,
    everInsolvent: s.solvency.everInsolvent,
    insolventAtEnd: s.cash < 0,
    score: scoreV2Company(s),
    passed: run.passed,
  };
}

/** Every arc strategy, played Q1–Q8 with its own policy. */
export function runFullAudit(options: V2ArcOptions = {}): V2AuditRow[] {
  return ARC_STRATEGIES.map(st => auditRow(runArc(st, 8, options)));
}

/** Q1–Q3 histories × all five Q4 destinations, destination-aligned spending after Q4 and destination-rational policy. */
export function runAuditMatrix(histories: string[] = MATRIX_HISTORIES): V2AuditRow[] {
  const rows: V2AuditRow[] = [];
  for (const h of histories) {
    const st = ARC_STRATEGIES.find(s => s.id === h)!;
    for (const d of V2_DESTINATION_IDS) {
      // The history's own Q5–Q8 policy is replaced by the destination-rational default (only Q1–Q3 is "history").
      const r = runArc({ ...st, policy: undefined }, 8, { destination: d, postQ4Allocation: 'aligned' });
      rows.push(auditRow(r, `${st.name} → ${d}`, h));
    }
  }
  return rows;
}

/** Best destination (by overall score) for each history in the matrix. */
export function bestDestinationByHistory(rows: V2AuditRow[]): Record<string, { destination: V2DestinationId; overall: number; runnerUp: V2DestinationId; margin: number }> {
  const out: Record<string, { destination: V2DestinationId; overall: number; runnerUp: V2DestinationId; margin: number }> = {};
  for (const h of [...new Set(rows.map(r => r.history))]) {
    const rs = rows.filter(r => r.history === h).sort((a, b) => b.score.overall - a.score.overall);
    out[h] = { destination: rs[0].destination!, overall: rs[0].score.overall, runnerUp: rs[1].destination!, margin: rs[0].score.overall - rs[1].score.overall };
  }
  return out;
}
