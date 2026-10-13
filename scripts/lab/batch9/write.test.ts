/** LAB_WRITE=1 npx vitest run scripts/lab/batch9/write.test.ts — runs every Batch 9 experiment and writes the raw results. */
import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import * as X from './experiments';
import { CANDIDATES, PACKAGES, evaluatePackages, gridUnder } from './proposals';
import { VERSIONS, MIXES, rebaseOverrides, variableCostAt } from './runner';
import { LAB_STRATEGIES, EXTRA_STRATEGIES } from './strategies';
import { V2_COST_CALIBRATION } from '../../../src/simulation/engineV2Costs';
declare const process: { env: Record<string, string | undefined> };

it.skipIf(!process.env.LAB_WRITE)('write Batch 9 lab results', () => {
  const t0 = performance.now();
  const core = X.coreRuns();
  const coreQuarters = core.map(r => ({ id: r.id, label: r.label, family: r.family, destination: r.destination, quarters: r.quarters }));
  const out = {
    meta: {
      generated: new Date().toISOString(), commit: execSync('git rev-parse --short HEAD').toString().trim(),
      engineDiff: execSync('git diff --stat 003f697 -- src/simulation src/production/v2/adapter.ts').toString().trim() || 'none',
      versions: VERSIONS,
      strategies: [...LAB_STRATEGIES, ...EXTRA_STRATEGIES].map(s => ({ id: s.strategy.id, name: s.strategy.name, family: s.family, allocation: s.allocationText, description: s.strategy.description })),
      scenarios: X.SCENARIOS.map(s => ({ id: s.id, label: s.label, description: s.description })),
      mixes: Object.fromEntries(Object.entries(MIXES).map(([k, m]) => { const o = rebaseOverrides(m); return [k, { ...m, overrides: o, rebasedFixedPool: 170 - variableCostAt(m, o.consumerAcquisitionSpend), naiveQ0VariableCost: variableCostAt(m, V2_COST_CALIBRATION.variable.consumerAcquisitionSpend) }]; })),
    },
    core: core.map(X.summarize), coreQuarters,
    destinationSweep: X.destinationSweep(),
    grid: X.gridRuns(),
    marginal: X.marginalReturns(),
    mixes: X.mixRuns(), steadyState: X.steadyStateCheck(),
    sensitivity: X.sensitivityRuns(),
    contract: X.contractAudit(), financing: X.financingAudit(), recession: X.recessionAudit(), envelope: X.envelopeChecks(),
    horizon: X.horizonRuns(),
    proposals: {
      candidates: CANDIDATES.map(c => ({ id: c.id, label: c.label, rationale: c.rationale, overrides: c.overrides().map(o => ({ target: o.target, from: o.obj[o.key], to: o.value })) })),
      packages: PACKAGES,
      results: evaluatePackages(['authored', 'consumer-weak', 'enterprise-boom', 'ai-boom', 'no-disruption', 'severe-recession']),
      grid: PACKAGES.map(p => ({ pkg: p.id, ...gridUnder(p.parts) })),
    },
  };
  mkdirSync('docs/batch9', { recursive: true });
  writeFileSync('docs/batch9/lab-results.json', JSON.stringify(out));
  console.log('runs written in', ((performance.now() - t0) / 1000).toFixed(1), 's; grid rows', out.grid.length);
}, 600_000);
