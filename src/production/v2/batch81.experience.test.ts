/**
 * Batch 8.1 — quarterly briefing (Level 1), investment considerations, board verdict and board defense.
 */
import { describe, it, expect } from 'vitest';
import { allAuditRuns } from './testing/auditStrategies';
import { materialDevelopments, boardQuestion } from './insights/briefing';
import { boardVerdict, defensePrompts, VERDICT_RULES } from './insights/boardVerdict';
import { quarterAttribution } from './insights/attribution';
import { cashBridge } from './insights/consequences';
import { BUCKET_PERSPECTIVES } from './content/bucketPerspectives';
import { V2_BUCKET_CURVES } from '../../simulation/engineV2Capabilities';
import { V2_PRESENTATION_MODES, pick } from './content/modes';
import { startingCompany } from './insights/history';

const runs = allAuditRuns();
const run = (id: string) => runs.find(r => r.id === id)!;
const BAD = /NaN|undefined|Infinity|\[object/;

describe('Level 1 quarterly briefing', () => {
  it('three developments (commercial, decision, capability) every quarter, from recorded results', () => {
    for (const r of runs) for (const rec of r.records) for (const mode of V2_PRESENTATION_MODES) {
      const devs = materialDevelopments(rec, mode);
      expect(devs.map(d => d.kind)).toEqual(['commercial', 'decision', 'capability']);
      for (const d of devs) expect(JSON.stringify(d)).not.toMatch(BAD);
      const com = devs[0];
      const row = quarterAttribution(rec).find(x => x.label === com.label);
      if (row) expect(com.movement.replace(/[▲▼■]\s/, '')).toContain(Math.abs(row.movement).toFixed(1));
    }
  });
  it('direction and effect are separate: a rising acquisition cost is unfavourable', () => {
    let seen = false;
    for (const r of runs) for (const rec of r.records) for (const d of materialDevelopments(rec, 'mba')) {
      if (d.label.startsWith('Cost to win') && d.direction === 'up') { expect(d.effect).toBe('unfavourable'); seen = true; }
    }
    expect(seen).toBe(true);
  });
  it('the board question follows documented rules and never names an unannounced event', () => {
    const FUTURE = /recession|downturn|crisis|offer|contract|acquisition|final option/i;
    for (const r of runs) for (let q = 1; q <= 7; q++) {
      const bq = boardQuestion(r.records, q);
      expect(['liquidity', 'cash', 'load', 'deadline', 'revenue-down', 'maturing', 'price']).toContain(bq.rule);
      if (q < 5) expect(bq.text).not.toMatch(FUTURE);
      expect(bq.text).not.toMatch(BAD);
    }
    expect(boardQuestion(run('insolvency').records, 7).rule).toMatch(/liquidity|cash/);
  });
  it('cash bridges reconcile exactly for every audit strategy (opening + OP − investment − events + financing = closing)', () => {
    for (const r of runs) for (const rec of r.records) {
      const b = cashBridge(rec);
      expect(b.reconciles).toBe(true);
      expect(Math.abs(b.opening + b.operatingProfit - b.investment - b.eventCosts + b.financing - b.closing)).toBeLessThan(1e-9);
    }
  });
});

describe('investment considerations', () => {
  it('maturation timing quoted to the CFO matches the engine schedules', () => {
    for (const [bucket, per] of Object.entries(BUCKET_PERSPECTIVES)) {
      const sched = V2_BUCKET_CURVES[bucket as keyof typeof V2_BUCKET_CURVES].maturationSchedule.map(x => Math.round(x * 100));
      const mba = pick('mba', per.CFO!);
      const m = /\((\d+) \/ (\d+) \/ (\d+)%\)/.exec(mba);
      if (m) expect([+m[1], +m[2], +m[3]]).toEqual(sched);
      else expect(mba).toMatch(new RegExp(`${sched[0]}%`)); // e.g. "≈50% in-quarter"
    }
  });
  it('every bucket presents at least four functional considerations, none of them a recommendation', () => {
    for (const per of Object.values(BUCKET_PERSPECTIVES)) {
      expect(Object.keys(per).length).toBeGreaterThanOrEqual(4);
      for (const t of Object.values(per)) for (const mode of V2_PRESENTATION_MODES) expect(pick(mode, t!)).not.toMatch(/\b(should|recommend|best|must|always|never)\b/i);
    }
  });
});

describe('Q8 board verdict and defense', () => {
  it('five dimensions with a documented rule and start/end evidence for every strategy', () => {
    for (const r of runs) {
      const v = boardVerdict(r.records);
      expect(v.map(d => d.id)).toEqual(['financial', 'commercial', 'product', 'organization', 'strategy']);
      for (const d of v) {
        expect(['Strong', 'Mixed', 'Weak']).toContain(d.assessment);
        expect(d.rule).toBe(VERDICT_RULES[d.id]);
        expect(d.evidence.length).toBeGreaterThan(0);
        expect(JSON.stringify(d)).not.toMatch(BAD);
      }
    }
  });
  it('assessments follow the rules (spot checks)', () => {
    const ins = boardVerdict(run('insolvency').records);
    expect(ins.find(d => d.id === 'financial')!.assessment).toBe('Weak');
    const org = boardVerdict(run('value-over-org').records).find(d => d.id === 'organization')!;
    expect(run('value-over-org').records[7].after.culture).toBeLessThan(startingCompany().culture - 8);
    expect(org.assessment).toBe('Weak');
    const cash = boardVerdict(run('cash100').records).find(d => d.id === 'commercial')!;
    expect(run('cash100').records[7].after.revenue).toBeLessThan(200);
    expect(cash.assessment).toBe('Weak');
  });
  it('the verdict discriminates between strategies (not every team gets the same profile)', () => {
    const profiles = new Set(runs.map(r => boardVerdict(r.records).map(d => d.assessment[0]).join('')));
    expect(profiles.size).toBeGreaterThanOrEqual(10);
  });
  it('defense prompts cite recorded evidence; "failed" is claimed only when revenue ended below its start', () => {
    for (const r of runs) {
      const ps = defensePrompts(r.records);
      expect(ps.length).toBe(6);
      for (const p of ps) expect(p.evidence).not.toMatch(BAD);
      const failed = ps.find(p => p.question.startsWith('Which investment failed'));
      if (failed) {
        const m = /yet ([\w-]+) revenue ended at \$([\d.]+)M, below its Q4 2022 level of \$([\d.]+)M/.exec(failed.evidence)!;
        expect(m).not.toBeNull();
        expect(+m[2]).toBeLessThan(+m[3]);
      }
    }
  });
});
