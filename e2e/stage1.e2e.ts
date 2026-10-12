/**
 * Batch 8 · Stage 1 — the company experience: NexLearn introduction, calendar quarters, glossary, rewritten role
 * briefings (no recommendations) and the simplified Understand → Discuss & Decide → Commit → Results & Learn flow.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, readBriefings } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string) => { if (SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); } };
const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
const plan = (q: number): V2PlayerQuarterInput => ({ quarter: q, allocation: alloc({ consumer: 8, enterprise: 8, aiProduct: 8, people: 6 }) });

test('NexLearn introduction, calendar quarters, glossary and six-part briefings without recommendations', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Founders'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 860 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0], undefined, { keepIntro: true });

  // 1. Company introduction: fiction clearly labelled; starting position from the engine
  await expect(page.getByTestId('v2-company-intro')).toBeVisible();
  await expect(page.getByTestId('v2-intro-revenue')).toHaveText('$200M');
  await expect(page.getByTestId('v2-intro-position')).toContainText('$170M');
  await expect(page.getByTestId('v2-intro-position')).toContainText('$30M');
  await expect(page.getByTestId('v2-intro-position')).toContainText('15%');
  await expect(page.getByTestId('v2-intro-position')).toContainText('$60M');
  await expect(page.getByTestId('v2-intro-segments')).toContainText('Consumer $140M');
  await expect(page.getByTestId('v2-intro-segments')).toContainText('Enterprise $40M');
  await expect(page.getByTestId('v2-intro-segments')).toContainText('University $16M');
  await expect(page.getByTestId('v2-intro-segments')).toContainText('AI-native $4M');
  await expect(page.getByTestId('v2-intro-story')).toContainText('Fictional');
  await expect(page.getByTestId('v2-intro-position')).toContainText('Q4 2022');
  await shot(page, 's1-01-company-introduction');
  await page.reload();
  await expect(page.getByTestId('v2-company-intro')).toBeVisible(); // still there until the team begins
  await page.getByTestId('v2-intro-begin').click();
  await expectPhase(page, 'briefing', 1);
  await page.reload();
  await expect(page.getByTestId('v2-company-intro')).toHaveCount(0); // seen once per team, survives refresh

  // 2. Calendar quarters + new stage names
  await expect(page.getByTestId('v2-company-strip')).toContainText('Q1 2023');
  await expect(page.getByTestId('v2-briefing')).toContainText('Q1 2023');
  await expect(page.getByTestId('ds-stepper')).toContainText('Understand');
  await expect(page.getByTestId('ds-stepper')).toContainText('Discuss & Decide');

  // 3. Six-part briefing, no recommendations, with tappable definitions
  await page.getByTestId('v2-open-brief').click();
  const brief = page.getByTestId('v2-role-brief');
  for (const part of ['responsibility', 'position', 'evidence', 'uncertain', 'objectives', 'discuss']) await expect(page.getByTestId(`v2-brief-${part}`)).toBeVisible();
  expect(await brief.innerText()).not.toMatch(/recommend|suggested by your data|your data points here|you should/i);
  await expect(page.getByTestId('v2-stance-options')).toHaveCount(0);
  await shot(page, 's1-02-q1-ceo-briefing');
  await page.getByTestId('v2-hide-brief').click();
  await page.getByTestId('v2-open-brief').click(); // CFO
  await expect(brief).toHaveAttribute('data-role', 'CFO');
  await expect(page.getByTestId('v2-brief-position')).toContainText('$60.0M');
  await page.getByTestId('v2-term-operating-margin').click();
  await expect(page.getByTestId('v2-term-pop-operating-margin')).toContainText('$30M operating profit on $200M revenue');
  await shot(page, 's1-03-q1-cfo-briefing-glossary');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('v2-term-pop-operating-margin')).toHaveCount(0);
  await page.getByTestId('v2-hide-brief').click();
  for (let i = 0; i < 3; i++) { await page.getByTestId('v2-open-brief').click(); await page.getByTestId('v2-hide-brief').click(); }

  // Glossary panel and company profile are always one tap away
  await page.getByTestId('v2-open-glossary').click();
  await expect(page.getByTestId('v2-glossary')).toContainText('Customer acquisition cost');
  await page.getByPlaceholder('Search terms…').fill('runway');
  await expect(page.getByTestId('v2-glossary')).not.toContainText('Pricing power');
  await page.keyboard.press('Escape');
  await page.getByTestId('v2-open-company').click();
  await expect(page.getByRole('dialog', { name: 'About NexLearn' })).toBeVisible();
  await page.getByTestId('v2-intro-close').click();

  // 4. Discuss & Decide no longer carries leaders' recommendations
  await page.getByTestId('v2-to-decide').click();
  await expectPhase(page, 'decide', 1);
  await expect(page.getByTestId('v2-recommendations')).toHaveCount(0);
  await expect(page.getByTestId('v2-phase-decide')).toContainText('Discuss and decide');
});

test('three quarters: calendar labels in results and charts; Q3 decision screen', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Calendar'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 860 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await playQuarter(page, plan(1), {
    onResults: async p => {
      await expect(p.getByTestId('v2-explanation')).toContainText('Q1 2023 results');
      await expect(p.getByTestId('v2-figures')).toContainText('Q4 2022:');
    },
  });
  await playQuarter(page, plan(2));
  await expectPhase(page, 'briefing', 3);
  await readBriefings(page);
  await page.getByTestId('v2-to-decide').click();
  await expect(page.getByTestId('v2-phase-decide')).toContainText('Q3 2023');
  await shot(page, 's1-04-q3-decision');
  await page.setViewportSize({ width: 375, height: 760 });
  await shot(page, 's1-05-q3-decision-mobile');
  await page.setViewportSize({ width: 1366, height: 860 });
  // Q3 2023 briefing for the CFO in quarter 3 shows three time points (start, last quarter, now)
  await page.getByText('Back to the challenge').click();
  await expectPhase(page, 'briefing', 3);
  await page.getByRole('button', { name: 'CFO' }).click();
  await expect(page.getByTestId('v2-brief-position')).toContainText('Q4 ’22');
  await expect(page.getByTestId('v2-brief-position')).toContainText('Q1 ’23');
  await shot(page, 's1-06-q3-cfo-briefing');
});

test('introduction on a phone is readable without sideways scrolling', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Phone'], { pacing: 'self', presentation: 'undergraduate' });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 375, height: 760 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0], undefined, { keepIntro: true });
  await expect(page.getByTestId('v2-company-intro')).toBeVisible();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(1);
  await shot(page, 's1-07-intro-mobile-undergraduate');
});
