/**
 * NexLearn V3.1 Stage 4B — the redesigned student journey (v3-econ-1.1 only; local stack with 1.1 released).
 *  - 1.1: Meet Your Company; one Leadership Team Brief (no pass-the-device gate, full briefs on demand); decision guides;
 *    a short commit confirmation (the confirm dialog is kept); a results summary with four KPIs (engine company value),
 *    three outcomes and one chart, the full board paper behind View Details; readable at phone width.
 *  - V2 and v3-econ-1.0 keep the original journey.
 */
import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, closeAllContexts } from './helpers';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

test.afterEach(closeAllContexts);

const plan: V2PlayerQuarterInput = { quarter: 1, allocation: { consumer: 6, enterprise: 6, aiProduct: 6, people: 3, universityCredentials: 3, cashReserve: 6 } };
async function audit(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const bad = r.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  if (bad.length) console.log(label, JSON.stringify(bad.map(v => ({ id: v.id, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })), null, 1));
  expect(bad.map(v => v.id), label).toEqual([]);
}
const noScroll = async (p: import('@playwright/test').Page) => expect(await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

test('v3-econ-1.1: Meet Your Company, the Leadership Team Brief, decision guides, compact commit and results summary', async ({ browser }) => {
  test.setTimeout(240_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Redesign'], { pacing: 'self', market: 'B', econ: '1.1' });
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0], undefined, { keepIntro: true });
  await expect(page.getByTestId('v2-team-game')).toHaveAttribute('data-experience', 'stage4');
  await expect(page.getByTestId('v2-company-intro')).toHaveAttribute('data-variant', 'stage4');
  await expect(page.locator('[data-part]')).toHaveCount(5);
  await expect(page.getByTestId('v2-intro-disclaimer')).toContainText('illustrative comparisons');
  await expect(page.getByTestId('v2-topbar-value')).toBeVisible();
  await audit(page, 'meet your company');
  await page.getByTestId('v2-intro-begin').click();

  // Understand: five executive cards, no device passing, full private briefs one click away
  await expect(page.locator('[data-testid^="v2-exec-"]')).toHaveCount(5);
  await expect(page.getByTestId('v2-to-decide')).toBeEnabled();
  await page.getByTestId('v2-role-briefings').locator('> summary').click();
  await page.getByTestId('v2-full-brief-CFO').locator('> summary').click();
  await expect(page.getByTestId('v2-role-brief')).toHaveAttribute('data-role', 'CFO');
  await audit(page, 'leadership brief');
  await page.setViewportSize({ width: 390, height: 844 });
  await noScroll(page);
  await page.setViewportSize({ width: 1366, height: 900 });

  await playQuarter(page, plan, {
    onDecide: async p => {
      await expect(p.getByTestId('v2-guide-allocation')).toContainText('What could go wrong?');
      await expect(p.getByTestId('v2-pace')).toContainText('2–3 to read, 3–4 to discuss');
      await expect(p.getByTestId('v2-decision-summary')).toHaveCount(0);
      await expect(p.getByTestId('v2-workload-level')).toBeVisible(); // Stage 3B indicators kept
      await audit(p, 'decision');
    },
    onCommit: async p => {
      await expect(p.getByTestId('v2-decision-recap')).toBeVisible();
      await expect(p.getByTestId('v2-resolution-details')).not.toHaveAttribute('open', '');
      await audit(p, 'commit');
    },
    onResults: async p => {
      await expect(p.getByTestId('v2-s4-kpis').locator('.s4-kpi')).toHaveCount(4);
      await expect(p.getByTestId('v2-s4-kpi-value')).toContainText('Company value');
      await expect(p.getByTestId('v2-s4-outcomes').locator('article')).toHaveCount(3);
      await expect(p.locator('[data-testid="v2-s4-chart"] svg.ds-chart')).toHaveCount(1);
      await expect(p.getByTestId('v2-reflection-question')).toBeVisible();
      await audit(p, 'results');
      await p.setViewportSize({ width: 390, height: 844 });
      await noScroll(p);
      await p.setViewportSize({ width: 1366, height: 900 });
    },
  });
  await expectPhase(page, 'briefing', 2);
});

for (const [label, market, econ] of [['V2', 'v2', undefined], ['v3-econ-1.0', 'B', '1.0']] as const) {
  test(`${label} keeps the original journey`, async ({ browser }) => {
    const { page: fac } = await newPage(browser);
    const s = await createSession(fac, ['Original'], { pacing: 'self', market, econ });
    const { page } = await newPage(browser);
    await joinTeam(page, s.sessionCode, s.teamCodes[0], undefined, { keepIntro: true });
    await expect(page.getByTestId('v2-team-game')).not.toHaveAttribute('data-experience', 'stage4');
    await expect(page.getByTestId('v2-company-intro')).not.toHaveAttribute('data-variant', 'stage4');
    await expect(page.getByTestId('v2-topbar-price')).toBeVisible();
    await page.getByTestId('v2-intro-begin').click();
    await expect(page.getByTestId('v2-pass-device')).toBeVisible();
    await expect(page.locator('[data-testid^="v2-exec-"]')).toHaveCount(0);
    await playQuarter(page, plan, {
      onDecide: async p => { await expect(p.getByTestId('v2-decision-summary')).toBeVisible(); await expect(p.getByTestId('v2-guide-allocation')).toHaveCount(0); },
      onResults: async p => { await expect(p.getByTestId('v2-s4-kpis')).toHaveCount(0); await expect(p.getByTestId('v2-figures')).toBeVisible(); },
    });
    await expectPhase(page, 'briefing', 2);
  });
}
