/** Calibration sweep helper: SWEEP='[["name",{...overrides}]]' npx vitest run scripts/lab/v3/sweep.test.ts */
import { it } from 'vitest';
import { play } from './player';
import { metricsOf } from './metrics';
import { V3_LAB_STRATEGIES } from './strategies';
import { withV3Economics, type DeepPartial, type V3EconomicsConfig } from '../../../src/simulationV3/engineV3Config';
const IDS = ['ai-only', 'ai-led', 'consumer-led', 'enterprise-led', 'university-led', 'premium-builder', 'diversified', 'balanced', 'adaptive', 'enterprise-ai-pair', 'wrong-way', 'people-only'];
const run = (o: DeepPartial<V3EconomicsConfig>) => withV3Economics(o, () => IDS.map(id => metricsOf(play(V3_LAB_STRATEGIES.find(s => s.strategy.id === id)!.strategy, { engine: 'v3', path: 'A' }))));
it.runIf(!!process.env.SWEEP)('sweep (set SWEEP to a JSON list of [name, overrides])', () => {
  const grid: [string, DeepPartial<V3EconomicsConfig>][] = JSON.parse(process.env.SWEEP ?? '[["base",{}]]');
  console.log('cfg'.padEnd(28) + IDS.map(i => i.slice(0, 9).padStart(10)).join(''));
  for (const [name, o] of grid) {
    const ms = run(o);
    console.log(`${name.padEnd(28)}${ms.map(m => m.price.toFixed(1).padStart(10)).join('')}`);
    console.log(`${'  ai/ent/uni rev'.padEnd(28)}${ms.map(m => `${m.segments.aiNative.toFixed(0)}/${m.segments.enterprise.toFixed(0)}/${m.segments.university.toFixed(0)}`.padStart(10)).join('')}`);
    console.log(`${'  culture'.padEnd(28)}${ms.map(m => m.culture.toFixed(0).padStart(10)).join('')}`);
    console.log(`${'  cumOP / terminal'.padEnd(28)}${ms.map(m => `${m.cumulativeOperatingProfit.toFixed(0)}/${m.terminal.toFixed(0)}`.padStart(10)).join('')}`);
  }
});
