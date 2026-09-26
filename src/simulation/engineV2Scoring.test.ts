import { describe, it, expect } from 'vitest';
import { ARC_STRATEGIES, runArc, liquidityPolicy } from '../testlab/utils/v2ScenarioArc';
import { scoreV2Company, V2_SCORING_CALIBRATION } from './engineV2Scoring';
import { getV2Baseline, type V2TeamState } from './engineV2';
import engineV2Source from './engineV2.ts?raw';
import scoringSource from './engineV2Scoring.ts?raw';

const strat = (id: string) => ARC_STRATEGIES.find(s => s.id === id)!;
const final = (id: string, extra: object = {}) => runArc(strat(id), 8, extra).finalState;
const K = V2_SCORING_CALIBRATION;
/** Batch 4: a genuinely cash-thin company ($30M opening cash, People100 policy) for insolvency mechanics. People100 itself
 *  is no longer unproductive (People builds Product Quality), so it no longer runs out of cash by Q8 on its own. */
const thinPeople = () => ({ ...ARC_STRATEGIES.find(s => s.id === 'people100')!, id: 'people100-thin-cash', opening: () => ({ ...getV2Baseline(), cash: 30 }) });


describe('Batch 3: terminal scoring (Financial / Strategic / Organizational + viability gates)', () => {
  it('scoring never feeds back into economics: engine does not import it; scoring is pure', () => {
    expect(engineV2Source).not.toMatch(/engineV2Scoring/);
    expect(scoringSource).not.toMatch(/calculateV2QuarterConsequence|applyV2Consequence/);
    const s = final('balanced');
    const before = JSON.stringify(s);
    const a = scoreV2Company(s), b = scoreV2Company(s);
    expect(JSON.stringify(s)).toBe(before);
    expect(a).toEqual(b);
  });

  it('dimensions are 0–100; overall = weighted blend − weakest-link penalty, then gates', () => {
    for (const st of ARC_STRATEGIES) {
      const sc = scoreV2Company(final(st.id));
      for (const x of [sc.financial, sc.strategic, sc.organizational, sc.overall]) { expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThanOrEqual(100); }
      const blended = K.weights.financial * sc.financial + K.weights.strategic * sc.strategic + K.weights.organizational * sc.organizational;
      expect(sc.blended).toBeCloseTo(blended, 9);
      const pen = K.weakestLink.penalty * Math.max(0, K.weakestLink.threshold - Math.min(sc.financial, sc.strategic, sc.organizational));
      const caps = sc.gates.filter(g => g.triggered).map(g => g.cap!);
      expect(sc.overall).toBeCloseTo(Math.max(0, Math.min(100, Math.min(blended - pen, ...caps))), 9);
    }
  });

  it('catastrophic insolvency + strong culture/organization cannot produce a high result', () => {
    const s = runArc(thinPeople(), 8, { policy: { liquidity: liquidityPolicy('refuse') } }).finalState;
    const sc = scoreV2Company(s);
    expect(sc.gates.find(g => g.id === 'terminal-insolvency')!.triggered).toBe(true);
    expect(sc.organizational).toBeGreaterThan(55);
    expect(sc.overall).toBeLessThanOrEqual(K.gates.terminalInsolvency.overallCap);
    expect(sc.financial).toBeLessThanOrEqual(K.gates.terminalInsolvency.financialCap);
  });

  it('huge profit with a destroyed organization/trust is not an automatic winner', () => {
    const s = final('consumer-ai');
    const healthy = scoreV2Company(s);
    const hollow: V2TeamState = { ...s, trust: 30, culture: 35, capabilities: { ...s.capabilities, talent: 25, execution: 30 }, organizationalCapacity: 30 };
    const sc = scoreV2Company(hollow);
    expect(sc.financial).toBeGreaterThan(60); // the profit is still there
    expect(sc.gates.find(g => g.id === 'organizational-collapse')!.triggered).toBe(true);
    expect(sc.overall).toBeLessThanOrEqual(K.gates.organizationalCollapse.overallCap);
    expect(sc.overall).toBeLessThan(healthy.overall - 20);
  });

  it('scores the company built, not the destination picked', () => {
    // Same destination, different companies → materially different results
    const ca = ['consumer-ai', 'consumer100', 'low-talent', 'ai100'].map(id => scoreV2Company(final(id)).overall);
    expect(Math.max(...ca) - Math.min(...ca)).toBeGreaterThan(15);
    // Different destinations can both be strong
    expect(scoreV2Company(final('evidence-responsive')).overall).toBeGreaterThan(65);
    expect(scoreV2Company(final('balanced')).overall).toBeGreaterThan(65);
    expect(scoringSource).not.toMatch(/'consumer-ai'|'enterprise-ai'|'premium-human-ai'|'university-infrastructure'/);
  });

  it('no arbitrary cliffs: small state changes move the score smoothly (away from gates)', () => {
    const s = final('balanced');
    const a = scoreV2Company(s).overall;
    const b = scoreV2Company({ ...s, cash: s.cash + 2 }).overall;
    const c = scoreV2Company({ ...s, culture: s.culture - 1 }).overall;
    expect(Math.abs(b - a)).toBeLessThan(1);
    expect(Math.abs(c - a)).toBeLessThan(1);
  });

  it('strategic sale: realized offer counts as shareholder value; strategic optionality ends', () => {
    const sold = runArc(strat('consumer-ai'), 8, { policy: { final: () => 'strategic-sale' } }).finalState;
    const sc = scoreV2Company(sold);
    expect(sc.sold).toBe(true);
    expect(sc.shareholderValue).toBeCloseTo(sold.final.record!.saleOffer! * sold.financing.ownership, 6);
    expect(sc.components.strategic.find(c => c.id === 'optionality')!.score).toBe(0);
  });

  it('dilution and debt are visible in the financial dimension', () => {
    const s = final('balanced');
    const base = scoreV2Company(s).financial;
    const diluted = scoreV2Company({ ...s, financing: { ...s.financing, ownership: 0.85 } }).financial;
    const levered = scoreV2Company({ ...s, financing: { ...s.financing, debt: 150 } }).financial;
    expect(diluted).toBeLessThan(base);
    expect(levered).toBeLessThan(base);
  });
});
