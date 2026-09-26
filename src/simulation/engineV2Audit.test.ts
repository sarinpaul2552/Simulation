import { describe, it, expect } from 'vitest';
import { runFullAudit, runAuditMatrix, bestDestinationByHistory, V2AuditRow } from '../testlab/utils/v2FullAudit';

const rows = runFullAudit();
const matrix = runAuditMatrix();
const row = (id: string) => rows.find(r => r.history === id)!;
const cell = (h: string, d: string) => matrix.find(r => r.history === h && r.destination === d)!;
const overall = (r: V2AuditRow) => r.score.overall;

describe('Batch 3 · Full Q1–Q8 calibration audit (regression evidence for the ten questions)', () => {
  it('covers the required strategies and all histories × five destinations; every quarter passes every hard gate', () => {
    for (const id of ['consumer100', 'enterprise100', 'ai100', 'people100', 'university100', 'cash100', 'balanced', 'consumer-ai', 'enterprise-ai',
      'evidence-responsive', 'wrong-way', 'aggressive', 'conservative', 'low-trust', 'low-execution', 'low-talent', 'low-cs']) {
      expect(row(id)).toBeDefined();
    }
    expect(matrix.length).toBe(11 * 5);
    for (const r of [...rows, ...matrix]) {
      expect(r.passed).toBe(true);
      expect(r.revenue).toBeCloseTo(r.segments.consumer + r.segments.enterprise + r.segments.university + r.segments.aiNative, 9);
    }
  });

  it('Q1: Consumer AI is no longer universally best — other destinations win or tie for some histories', () => {
    const best = bestDestinationByHistory(matrix);
    const nonConsumer = Object.values(best).filter(b => b.destination !== 'consumer-ai');
    expect(nonConsumer.length).toBeGreaterThanOrEqual(2);
    // Where Consumer AI still wins, it wins narrowly (no dominance)
    for (const b of Object.values(best).filter(x => x.destination === 'consumer-ai')) expect(b.margin).toBeLessThan(6);
  });

  it('Q2: Enterprise AI outperforms when Enterprise preparation supports it', () => {
    expect(bestDestinationByHistory(matrix)['enterprise100'].destination).toBe('enterprise-ai');
    expect(cell('enterprise-ai', 'enterprise-ai').revenue).toBeGreaterThan(cell('enterprise-ai', 'consumer-ai').revenue);
    expect(overall(row('enterprise-ai'))).toBeGreaterThan(overall(row('enterprise100')) + 10);
  });

  it('Q5: Balanced is resilient (top tier, never insolvent) without automatically winning', () => {
    expect(overall(row('balanced'))).toBeGreaterThan(65);
    expect(row('balanced').everInsolvent).toBe(false);
    const top = [...rows].sort((a, b) => overall(b) - overall(a))[0];
    expect(top.history).not.toBe('balanced');
  });

  it('Q6: Cash-heavy survives comfortably but pays strategic opportunity cost', () => {
    const c = row('cash100');
    expect(c.everInsolvent).toBe(false);
    expect(c.cash).toBe(Math.max(...rows.map(r => r.cash)));
    expect(c.score.components.financial.find(x => x.id === 'growth')!.score).toBeLessThan(0.05);
    expect(overall(c)).toBeLessThan(overall(row('balanced')) - 10);
  });

  it('Q7: People-heavy builds organizational strength but struggles commercially; converting it into a strategy helps', () => {
    const p = row('people100');
    // Highest Talent and Organizational Capacity of all strategies; organizational score in the top tier (its own
    // recession cost cuts dent Culture — People-heavy is not immune to its commercial weakness)
    expect(p.capabilities.talent).toBe(Math.max(...rows.map(r => r.capabilities.talent)));
    expect(p.capabilities.organizationalCapacity).toBe(Math.max(...rows.map(r => r.capabilities.organizationalCapacity)));
    expect(p.score.organizational).toBeGreaterThan(65);
    expect(p.score.financial).toBeLessThan(35);
    const converted = Math.max(...matrix.filter(r => r.history === 'people100').map(overall));
    expect(converted).toBeGreaterThan(overall(p) + 10);
  });

  it('Q8: evidence-responsive play beats every stubborn single-bucket strategy and the same-destination 50/50 plan', () => {
    const e = overall(row('evidence-responsive'));
    for (const id of ['consumer100', 'enterprise100', 'ai100', 'people100', 'university100', 'cash100', 'wrong-way']) expect(e).toBeGreaterThan(overall(row(id)));
    expect(e).toBeGreaterThan(overall(row('enterprise-ai')));
  });

  it('Q9: a concentrated strategy with a correct thesis beats breadth; single-bucket concentration does not', () => {
    expect(overall(row('consumer-ai'))).toBeGreaterThan(overall(row('balanced')));
    expect(overall(row('consumer100'))).toBeLessThan(overall(row('balanced')));
    expect(overall(row('ai100'))).toBeLessThan(overall(row('balanced')));
  });

  it('Q10: the same strategy fails when capabilities/support are inadequate', () => {
    expect(overall(row('consumer-ai')) - overall(row('low-talent'))).toBeGreaterThan(20);
    expect(row('low-talent').score.gates.find(g => g.id === 'organizational-collapse')!.triggered).toBe(true);
    expect(overall(row('enterprise-ai'))).toBeGreaterThan(overall(row('low-cs')) + 8);
    expect(overall(row('balanced'))).toBeGreaterThan(overall(row('low-execution')) + 5);
    expect(overall(row('balanced'))).toBeGreaterThan(overall(row('low-trust')) + 5);
  });
});
