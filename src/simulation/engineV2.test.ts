import { describe, it, expect } from 'vitest';
import {
  getV2Baseline,
  calculateV2QuarterConsequence,
  calculateV2Ledger,
  checkV2AccountingIdentity,
  applyV2Consequence,
  validateV2Allocation,
  V2Allocation,
} from './engineV2';
import { getQ1Baseline, calculateQ2Consequence } from './engine';
import { V2_SCENARIOS, runV2Scenario, runV2Strategy } from '../testlab/utils/v2Diagnostics';
import { allocationStrategies } from '../testlab/utils/testPresets';

const alloc = (p: Partial<V2Allocation>): V2Allocation => ({
  consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, cashReserve: 0, ...p,
});

describe('V2 accounting identity: deterministic scenarios', () => {
  for (const scenario of V2_SCENARIOS) {
    it(scenario.name, () => {
      const result = runV2Scenario(scenario);
      const failures = [
        ...result.quarters.flatMap(q => q.checks.filter(c => !c.passed).map(c => `Q${q.quarter} ${c.id}: ${c.details}`)),
        ...result.expectationChecks.flatMap((list, i) => list.filter(c => !c.passed).map(c => `Q${i + 1} ${c.id}: ${c.details}`)),
      ];
      expect(failures).toEqual([]);
      expect(result.passed).toBe(true);
    });
  }
});

describe('V2 ledger semantics', () => {
  it('positive cash generation: closing = opening + OP − strategic (60 + 30 − 10 = 80)', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 10, cashReserve: 20 }), strategicEnvelope: 30,
    });
    expect(c.ledger.closingCash).toBe(80);
    expect(c.ledger.netCashFlow).toBe(20);
  });

  it('Cash Reserve is not an inflow', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30,
    });
    expect(c.ledger.strategicInvestment).toBe(0);
    expect(c.ledger.cashReserveRetained).toBe(30);
    expect(c.ledger.closingCash).toBe(90); // not 120
  });

  it('strategic investment is separate from operating cost', () => {
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 1, allocation: alloc({ consumer: 10, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5 }), strategicEnvelope: 30,
    });
    expect(c.ledger.operatingCost).toBe(170);
    expect(c.ledger.operatingProfit).toBe(30);
    expect(c.ledger.strategicInvestment).toBe(30);
    expect(c.ledger.closingCash).toBe(60);
  });

  it('cash is real cash, not ΔOperatingProfit (unchanged OP still adds full OP to cash)', () => {
    // V1 Q2–Q6 would add (newOP − previousOP) ≈ 0 here; V2 adds the full $30M.
    const c = calculateV2QuarterConsequence(getV2Baseline(), {
      quarter: 2, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30,
    });
    expect(c.ledger.closingCash - c.ledger.openingCash).toBe(30);
  });

  it('no cash floor: negative cash is preserved exactly', () => {
    const opening = { ...getV2Baseline(), cash: 3 };
    const c = calculateV2QuarterConsequence(opening, {
      quarter: 2, allocation: alloc({ aiProduct: 30 }), strategicEnvelope: 30,
      operatingInputs: { revenue: 150, operatingCost: 170 },
    });
    expect(c.ledger.closingCash).toBe(-47); // 3 − 20 − 30; V1 Q2 would floor at 5
    expect(c.flags).toContain('NEGATIVE_CASH');
    expect(c.flags).toContain('CASH_CROSSED_BELOW_ZERO');
    const next = applyV2Consequence(opening, c);
    expect(next.cash).toBe(-47);
  });

  it('financing is an explicit line fixed at 0', () => {
    const l = calculateV2Ledger(getV2Baseline(), { quarter: 1, allocation: alloc({ cashReserve: 30 }), strategicEnvelope: 30 });
    expect(l.financing).toBe(0);
    expect(l.financingItems).toEqual([]);
  });

  it('identity checker detects a tampered ledger', () => {
    const l = calculateV2Ledger(getV2Baseline(), { quarter: 1, allocation: alloc({ consumer: 30 }), strategicEnvelope: 30 });
    expect(checkV2AccountingIdentity(l).holds).toBe(true);
    expect(checkV2AccountingIdentity({ ...l, closingCash: Math.max(5, l.closingCash - 100) }).holds).toBe(false);
    expect(checkV2AccountingIdentity({ ...l, operatingProfit: l.operatingProfit + 1 }).holds).toBe(false);
  });

  it('rejects invalid allocations', () => {
    expect(() => validateV2Allocation(alloc({ consumer: 31 }), 30)).toThrow();
    expect(() => validateV2Allocation(alloc({ consumer: -1, cashReserve: 31 }), 30)).toThrow();
  });

  it('does not mutate opening state', () => {
    const opening = getV2Baseline();
    const snapshot = JSON.stringify(opening);
    const c = calculateV2QuarterConsequence(opening, { quarter: 1, allocation: alloc({ consumer: 30 }), strategicEnvelope: 30 });
    applyV2Consequence(opening, c);
    expect(JSON.stringify(opening)).toBe(snapshot);
  });
});

describe('V2 Q1→Q8 strategy runs: identity holds every quarter', () => {
  for (const strategy of Object.values(allocationStrategies)) {
    for (const mode of ['carried-forward', 'stress-loss'] as const) {
      it(`${strategy.id} / ${mode}`, () => {
        const run = runV2Strategy(strategy, mode);
        expect(run.quarters).toHaveLength(8);
        expect(run.passed).toBe(true);
        // opening of each quarter links to prior close
        run.quarters.forEach((q, i) => {
          if (i > 0) expect(q.consequence.ledger.openingCash).toBe(run.quarters[i - 1].consequence.ledger.closingCash);
        });
      });
    }
  }
});

describe('V1 frozen baseline is unchanged', () => {
  it('V1 Q2 still applies its original floor/ΔOP semantics (regression guard, not a V2 behaviour)', () => {
    const s = { ...getQ1Baseline(), cash: 1 };
    const c = calculateQ2Consequence(
      { consumerGrowth: 0, enterpriseSales: 0, aiProduct: 0, instructorPeople: 0, universityCredential: 0, customerSuccess: 0, marketing: 0, cash: 30 },
      null, false, [], s
    );
    expect(c.__diagnostic__cashLedger?.closingCash).toBeGreaterThanOrEqual(5);
  });
});
