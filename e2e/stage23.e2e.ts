/**
 * Batch 8 · Stages 2 & 3 — executive intelligence, visual identity and shareholder value.
 * Plays complete journeys in the browser and checks the share price, valuation bridge, attribution, executive
 * scorecards, the board report and board defense, progressive financing validation and cross-team awards.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string, el?: string) => {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  if (el) await page.getByTestId(el).screenshot({ path: `${SHOTS}/${name}.png` });
  else await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};
const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
function plan(q: number, base: Partial<V2PlayerQuarterInput['allocation']>, dest: V2PlayerQuarterInput['destination'] = 'enterprise-ai'): V2PlayerQuarterInput {
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: dest };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: false } };
    case 6: return { quarter: 6, allocation: alloc(base), management: { pricing: 'raise' } };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'contain' };
    case 8: return { quarter: 8, allocation: alloc(base), finalOption: 'continue' };
    default: return { quarter: q, allocation: alloc(base) };
  }
}
const BASE = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6 };

test('eight quarters: share price, valuation bridge, attribution, scorecards, board report and board defense', async ({ browser }) => {
  test.setTimeout(420_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Northwind'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 860 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await expect(page.getByTestId('v2-topbar-price')).toHaveText('$100.00');

  for (let q = 1; q <= 8; q++) {
    await playQuarter(page, plan(q, BASE), {
      onDecide: async p => {
        if (q === 2) {
          // investment perspectives: lenses per function, no endorsements
          await p.getByTestId('v2-perspectives-aiProduct').locator('summary').click();
          await expect(p.getByTestId('v2-perspectives-aiProduct')).toContainText('CFO');
          expect(await p.getByTestId('v2-perspectives-aiProduct').innerText()).not.toMatch(/recommend|should|agree|disagree|best/i);
          // progressive financing: advanced terms hidden until asked for; limits are validated against the engine
          await expect(p.getByTestId('v2-fin-advanced')).toHaveCount(0);
          await p.getByTestId('v2-fin-toggle').click();
          await expect(p.getByTestId('v2-fin-advanced')).toBeVisible();
          await p.getByTestId('v2-fin-equity').fill('9999');
          await expect(p.getByTestId('v2-fin-errors')).toContainText('exceeds');
          await expect(p.getByTestId('v2-to-vote')).toBeDisabled();
          await p.getByTestId('v2-fin-equity').fill('');
          await p.getByTestId('v2-fin-debt').fill('5');
          await expect(p.getByTestId('v2-fin-notes')).toContainText('interest');
          await p.getByTestId('v2-fin-debt').fill('');
          await expect(p.getByTestId('v2-fin-errors')).toHaveCount(0);
        }
        if (q === 3) {
          await p.getByTestId('v2-perspectives-aiProduct').locator('summary').click();
          await expect(p.getByTestId('v2-bucket-est-aiProduct')).toContainText('Lands');
          await expect(p.getByTestId('v2-alloc-cash-forecast')).toContainText('estimate');
          await shot(p, 's81-02-q3-investment-workspace', 'v2-allocation');
        }
      },
      onResults: async p => {
        await expect(p.getByTestId('v2-fig-price')).toContainText('$');
        if (q === 2) {
          await p.evaluate(() => window.scrollTo(0, 0));
          if (SHOTS) await p.screenshot({ path: `${SHOTS}/s81-01-q2-quarterly-briefing.png` });
          await p.getByTestId('v2-deep').locator('summary').click();
          await p.getByTestId('v2-attr-detail-consumerRetention').click();
          await expect(p.getByTestId('v2-attribution')).toContainText('Recorded movement');
          await p.getByTestId('v2-tab-overview').click();
          await expect(p.getByTestId('v2-health')).toContainText('Δ Q4 ’22');
          await p.getByTestId('v2-tab-commercial').click();
          await p.getByTestId('v2-qsel-commercial-1').click();
          await expect(p.getByTestId('v2-explorer-commercial')).toHaveAttribute('data-quarter', '1');
          await expect(p.getByTestId('v2-qsel-commercial-3')).toBeDisabled(); // no future data
          await p.getByTestId('v2-tab-scorecards').click();
          await p.getByTestId('v2-scorecard-role-CFO').click();
          await expect(p.getByTestId('v2-scorecard-CFO')).toContainText('Operating margin');
          await expect(p.getByTestId('v2-scorecard-table')).toContainText('Interpretation');
          await p.getByTestId('v2-tab-price').click();
          await expect(p.getByTestId('v2-share-price-panel').getByTestId('v2-valuation-bridge')).toBeVisible();
        }
        if (q === 4) { await p.getByTestId('v2-tab-overview').click(); await shot(p, 's81-03-q4-executive-dashboard', 'v2-explore'); }
        if (q === 6) { await p.getByTestId('v2-tab-scorecards').click(); await p.getByTestId('v2-scorecard-role-CFO').click(); await shot(p, 's81-04-q6-cfo-scorecard', 'v2-explore'); }
        if (q === 7) { await p.getByTestId('v2-tab-price').click(); await shot(p, 's81-05-q7-shareholder-value', 'v2-explore'); }
      },
    });
    if (q < 8) await expectPhase(page, 'briefing', q + 1);
  }
  await expectPhase(page, 'final');
  await expect(page.getByTestId('v2-board-verdict')).toContainText('what kind of company');
  await expect(page.locator('[data-testid="v2-board-verdict"] [data-assessment]')).toHaveCount(5);
  await expect(page.getByTestId('v2-defense-prompts')).toContainText('What will the next leadership team inherit?');
  for (const id of ['summary', 'shareholder', 'financial', 'commercial', 'product', 'organization', 'decisions', 'scorecards', 'lessons']) await expect(page.getByTestId(`v2-report-${id}`)).toBeVisible();
  await expect(page.getByTestId('v2-three-measures')).toContainText('Terminal simulation score');
  await expect(page.getByTestId('v2-three-measures')).toContainText('Board assessment');
  await expect(page.getByTestId('v2-three-measures')).toContainText('Shareholder value');
  await expect(page.getByTestId('v2-three-measures')).toContainText('Executive functional scores');
  await expect(page.getByTestId('v2-report-kpis-financial')).toContainText('Operating margin');
  await page.getByTestId('v2-journey-q4').getByRole('button').click();
  await expect(page.getByTestId('v2-decision-history')).toContainText('Major consequence');
  await expect(page.getByTestId('v2-board-defense')).toContainText('Your board gave you NexLearn at $100 per share');
  const reportText = await page.getByTestId('v2-final').innerText();
  expect(reportText).not.toMatch(/NaN|undefined|Infinity/);
  await shot(page, 's81-07b-q8-board-report-mba');
  // Deploy fix: the board report fits a phone without sideways scrolling (four lenses wrap; scorecard summary drops columns)
  await page.setViewportSize({ width: 375, height: 812 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByTestId('v2-scorecard-summary')).toContainText('Executive score');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByTestId('v2-print-report')).toBeHidden(); // print layout hides controls
  await page.emulateMedia({ media: 'screen' });
});

test('cross-team leadership comparison and awards (facilitator only)', async ({ browser }) => {
  test.setTimeout(420_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Alpha', 'Bravo', 'Charlie'], { pacing: 'self' });
  const bases = [BASE, { consumer: 15, aiProduct: 15 }, { consumer: 2 }];
  const dests: V2PlayerQuarterInput['destination'][] = ['enterprise-ai', 'consumer-ai', 'balanced-marketplace'];
  // awards withheld until every team has completed four quarters
  await fac.getByTestId('v2-fac-tab-leadership').click();
  await expect(fac.getByTestId('v2-fac-awards-unavailable')).toBeVisible();
  await Promise.all(s.teamCodes.map(async (code, i) => {
    const { page } = await newPage(browser);
    await joinTeam(page, s.sessionCode, code);
    for (let q = 1; q <= 4; q++) await playQuarter(page, plan(q, bases[i], dests[i]));
  }));
  await fac.getByTestId('v2-fac-tab-live').click();
  await fac.getByTestId('v2-fac-tab-leadership').click();
  await expect(fac.getByTestId('v2-fac-leadership-table')).toContainText('Alpha');
  await expect(fac.getByTestId('v2-fac-awards')).toContainText('Best CFO');
  await expect(fac.getByTestId('v2-fac-awards')).toContainText('role');
  await expect(fac.getByTestId('v2-fac-awards')).toContainText('does not observe individual contributions');

});
