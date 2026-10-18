/**
 * NexLearn V3.1 Stage 3B — investment effectiveness indicators on the V3 decision screen (local stack; 1.1 released
 * locally by scripts/v2-local/up.sh). Indicators come from the engine's calculation of the planned quarter.
 *  - current capability, expected effective gain and workload level are shown without expanding anything;
 *  - workload reacts to the plan (Low for a light plan, High for five simultaneous initiatives, with a short note);
 *  - details are behind one collapsed "Details" disclosure; no new screens or confirmations;
 *  - phone width: no sideways scrolling; the quarter still commits normally.
 */
import { test, expect } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, fillDecision, expectPhase, closeAllContexts } from './helpers';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

test.afterEach(closeAllContexts);

const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: 30 - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};

test('V3 decision screen shows engine-backed capability, effective gain and workload; the quarter still commits', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Indicators'], { pacing: 'self', market: 'A', econ: '1.1' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 900 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  const light: V2PlayerQuarterInput = { quarter: 1, allocation: alloc({ consumer: 5 }) };
  await playQuarter(page, light, {
    onDecide: async p => {
      // visible without expansion
      await expect(p.getByTestId('v2-capacity')).toHaveAttribute('data-level', 'low');
      await expect(p.getByTestId('v2-workload-level')).toContainText('Low');
      await expect(p.getByTestId('v2-cap-aiProduct')).toHaveText('AI 10/100');
      await expect(p.getByTestId('v2-cap-consumer')).toHaveText('Consumer 55/100');
      await expect(p.getByTestId('v2-eff-consumer')).toContainText('Expected +');
      await expect(p.getByTestId('v2-eff-consumer')).toContainText('(est.)');
      await expect(p.locator('[data-testid^="v2-saturation-"]')).toHaveCount(0); // nothing near its ceiling in Q1
      // details are collapsed by default
      await expect(p.getByTestId('v2-bucket-est-consumer')).not.toHaveAttribute('open', '');
      // five simultaneous initiatives: the engine's overload threshold is crossed → High, with a one-line note
      await fillDecision(p, { quarter: 1, allocation: alloc({ consumer: 6, enterprise: 6, aiProduct: 6, people: 6, universityCredentials: 6 }) });
      await expect(p.getByTestId('v2-capacity')).toHaveAttribute('data-level', 'high');
      await expect(p.getByTestId('v2-workload-note')).toContainText('culture −');
      // phone width: readable without sideways scrolling
      await p.setViewportSize({ width: 390, height: 844 });
      await expect(p.getByTestId('v2-eff-aiProduct')).toBeVisible();
      expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
      await p.setViewportSize({ width: 1366, height: 900 });
      // back to the light plan, which is then committed as usual
      await fillDecision(p, light);
      await expect(p.getByTestId('v2-capacity')).toHaveAttribute('data-level', 'low');
    },
  });
  await expectPhase(page, 'briefing', 2);
});
