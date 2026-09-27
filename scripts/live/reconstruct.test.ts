/**
 * Batch 6 · 6G — economic reconstruction of a LIVE game.
 *
 * Input: a JSON export (per team) taken in the browser from `v2_get_game`: the committed input log, a SHA-256 of the
 * stored snapshot (keys in jsonb order), and a projection of the stored state. This test replays the input log with the
 * frozen engine and requires the stored snapshot to be bit-identical and every projected figure to match exactly.
 * Skipped unless V2_LIVE_RECON points at the export (never contains codes, PINs or keys).
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { replayInputs, getFinalOutcome, canonical } from '../../src/production/v2/adapter';
import { toStorable } from '../../src/production/v2/snapshot';
import type { V2PlayerQuarterInput } from '../../src/production/v2/types';

declare const process: { env: Record<string, string | undefined> };
const FILE = process.env.V2_LIVE_RECON;

interface LiveExport {
  team: string; completed: number; nres: number; inputs: V2PlayerQuarterInput[]; snapInputsEqual: boolean; snapHash: string;
  ledger: [number, number, number, number, number][]; segments: Record<string, number>; debt: number; rounds: string[];
  caps: Record<string, number>; pq: number; culture: number; trust: number; commercial: Record<string, number>;
  destination: string; crisis: [string, number, string]; final: [string, string[]]; solvency: [string, boolean];
  ui: { overall: string; financial: string; strategic: string; organizational: string };
}

describe.skipIf(!FILE)('Batch 6 · live game reconstruction with the frozen V2 engine', () => {
  const data = FILE ? (JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, LiveExport>) : {};
  for (const [name, live] of Object.entries(data)) {
    it(`${name}: stored snapshot and every figure reproduce exactly from the committed decisions`, () => {
      expect(live.completed).toBe(8);
      expect(live.nres).toBe(8);
      expect(live.snapInputsEqual).toBe(true);
      const snap = replayInputs(live.inputs);
      const s = snap.state;
      const hash = createHash('sha256').update(JSON.stringify(canonical(toStorable(snap)))).digest('hex');
      const bitIdentical = hash === live.snapHash; console.log(`${name}: stored snapshot bit-identical to Node replay: ${bitIdentical}`);
      expect(s.ledgerHistory.map(l => [l.quarter, l.revenue, l.operatingCost, l.operatingProfit, l.closingCash])).toEqual(live.ledger);
      expect({ ...s.segmentRevenue }).toEqual(live.segments);
      expect(s.financing.debt).toBe(live.debt);
      expect(s.financing.rounds.map(r => `${r.kind}:${r.amount}`)).toEqual(live.rounds);
      expect({ ...s.capabilities }).toEqual(live.caps);
      expect([s.productQuality, s.culture, s.trust]).toEqual([live.pq, live.culture, live.trust]);
      const { competitorBenchmarks: _b, ...commercial } = s.commercial;
      void _b;
      expect(commercial).toEqual(live.commercial);
      expect(s.destination?.id).toBe(live.destination);
      const c = s.crisis.record!;
      expect([c.assessment.type, c.assessment.severity, c.response]).toEqual(live.crisis);
      const f = s.final.record!;
      expect([f.option, f.availability.filter(o => o.available).map(o => o.id)]).toEqual(live.final);
      expect([s.solvency.status, s.solvency.distressed]).toEqual(live.solvency);
      const score = getFinalOutcome(snap).score;
      expect([score.overall, score.financial, score.strategic, score.organizational].map(x => x.toFixed(1)))
        .toEqual([live.ui.overall, live.ui.financial, live.ui.strategic, live.ui.organizational]);
    });
  }
});
