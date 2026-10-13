/**
 * Batch 10E — facilitator experience: class discussion (intended → decided → happened → learned), Q3 reveal gating
 * with no override, projector privacy (anonymised labels, selected reflections only), team timelines, the stage
 * clock (never changes the game), the final debrief and the board report's "Intent and outcome".
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, closeAllContexts } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

test.afterEach(closeAllContexts);

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

type Alloc = V2PlayerQuarterInput['allocation'];
const alloc = (p: Partial<Alloc>): Alloc => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
const plan = (q: number, base: Partial<Alloc>): V2PlayerQuarterInput => {
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: 'enterprise-ai' };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: false } };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'contain' };
    case 8: return { quarter: 8, allocation: alloc(base), finalOption: 'continue' };
    default: return { quarter: q, allocation: alloc(base) };
  }
};
const ALPHA = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6 };
const BETA_EARLY = { consumer: 14, enterprise: 6, aiProduct: 2, people: 2 };
const BETA_LATE = { consumer: 4, enterprise: 6, aiProduct: 14, people: 2 }; // a change of direction in Q3

/** Beta picks the last priority option and, in Q3, a different second signal. */
const betaRationale = async (p: Page, q: number) => {
  await p.locator('[data-testid^="v2-priority-"]').last().click();
  if (q === 3) {
    const fold = p.getByTestId('v2-fold-belief');
    if (await fold.getAttribute('open') === null) await fold.locator('summary').click(); // the fold collapses once complete
    const ev = p.locator('[data-testid^="v2-evidence-"]');
    await ev.nth(1).click(); await ev.nth(5).click();
  }
};

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('Batch 10E: facilitator discussion, Q3 gate, projector privacy, timelines, stage clock, final debrief and board report', async ({ browser }) => {
  test.setTimeout(480_000);
  const { page: fac } = await newPage(browser);
  await fac.setViewportSize({ width: 1366, height: 900 });
  const s = await createSession(fac, ['Alpha', 'Beta'], { pacing: 'self' });
  const { page: a } = await newPage(browser);
  const { page: b } = await newPage(browser);
  await joinTeam(a, s.sessionCode, s.teamCodes[0]);
  await joinTeam(b, s.sessionCode, s.teamCodes[1]);

  for (let q = 1; q <= 3; q++) {
    await playQuarter(a, plan(q, ALPHA), { reflection: `Alpha Q${q}: we would weight paid cohorts more` });
    await playQuarter(b, plan(q, q < 3 ? BETA_EARLY : BETA_LATE), { onDecide: p => betaRationale(p, q), reflection: `Beta Q${q}: private thought` });
  }

  // Class discussion at Q3: both teams, four columns, class pattern, Q3 panel gated (no override control exists)
  await fac.getByTestId('v2-fac-tab-compare').click();
  await expect(fac.getByTestId('v2-fac-discussion')).toBeVisible();
  await fac.getByTestId('v2-fac-q-3').click();
  await expect(fac.getByTestId('v2-fac-discussion-table').locator('tbody tr')).toHaveCount(2);
  await expect(fac.getByTestId('v2-fac-pattern')).toContainText('Signals cited:');
  await expect(fac.getByTestId('v2-fac-q3-panel')).toHaveAttribute('data-gate', 'closed');
  await expect(fac.getByTestId('v2-fac-q3-gate')).toContainText('0 of 2 teams');
  await expect(fac.getByTestId('v2-fac-q3-verdict')).toHaveCount(0);
  await expect(fac.getByText(/override/i)).toHaveCount(1); // only the sentence "There is no early override."
  await expect(fac.getByTestId('v2-fac-compare')).toBeVisible(); // financial comparison retained

  // Q4: one team done → still closed; both done → open
  await playQuarter(a, plan(4, ALPHA));
  await expect(fac.getByTestId('v2-fac-q3-gate')).toContainText('1 of 2 teams', { timeout: 20_000 });
  await expect(fac.getByTestId('v2-fac-q3-verdict')).toHaveCount(0);
  await playQuarter(b, plan(4, BETA_LATE), { onDecide: p => betaRationale(p, 4) });
  await expect(fac.getByTestId('v2-fac-q3-panel')).toHaveAttribute('data-gate', 'open', { timeout: 20_000 });
  await expect(fac.getByTestId('v2-fac-q3-verdict')).toHaveCount(8);
  await shot(fac, 'b10e-class-discussion-q3-1366');

  // Projector privacy: anonymised labels, no codes, no reflections until selected
  await fac.getByTestId('v2-fac-q-2').click();
  await fac.getByTestId('v2-fac-projector').click();
  await expect(fac.getByTestId('v2-fac-discussion-table')).toContainText('Team A');
  let body = await fac.locator('body').innerText();
  expect(body).not.toMatch(/Alpha|Beta|private thought|weight paid cohorts/);
  for (const code of s.teamCodes) expect(body).not.toContain(code);
  await expect(fac.getByTestId('v2-fac-note-shown')).toHaveCount(0);
  await expect(fac.getByTestId('v2-fac-notes-projected-empty')).toBeVisible();
  await fac.getByTestId('v2-fac-projector').click(); // back to normal: review and select one note
  await fac.getByTestId('v2-fac-review-notes').locator('summary').click();
  await expect(fac.getByTestId('v2-fac-note')).toHaveCount(2); // Q2 notes only (one per team)
  await fac.getByTestId('v2-fac-note').filter({ hasText: 'Alpha Q2' }).getByTestId('v2-fac-note-toggle').check();
  await fac.getByTestId('v2-fac-projector').click();
  await expect(fac.getByTestId('v2-fac-note-shown')).toHaveCount(1);
  await expect(fac.getByTestId('v2-fac-notes-projected')).toContainText('Team A');
  body = await fac.locator('body').innerText();
  expect(body).toContain('Alpha Q2: we would weight paid cohorts more');
  expect(body).not.toMatch(/Beta Q2|private thought|\bAlpha\b(?! Q2:)/);
  await fac.setViewportSize({ width: 1920, height: 1080 });
  await noHorizontalScroll(fac);
  await shot(fac, 'b10e-class-discussion-projector-1920');
  // Live table in projector: labels, no codes
  await fac.getByTestId('v2-fac-tab-live').click();
  await expect(fac.getByTestId('v2-fac-team').first()).toHaveAttribute('data-team', 'Team A');
  expect(await fac.getByTestId('v2-fac-teams').innerText()).not.toMatch(/Alpha|Beta|TEAM-/);
  await fac.getByTestId('v2-fac-projector').click();
  await fac.setViewportSize({ width: 1366, height: 900 });

  // Stage clock: counts down, never changes the game
  const progressBefore = await fac.getByTestId('v2-fac-progress').allInnerTexts();
  await fac.getByTestId('v2-fac-clock-preset').selectOption('9');
  await expect(fac.getByTestId('v2-fac-clock-time')).toHaveText('9:00');
  await fac.getByTestId('v2-fac-clock-start').click();
  await expect(fac.getByTestId('v2-fac-clock-time')).not.toHaveText('9:00', { timeout: 5_000 });
  await expect(fac.getByTestId('v2-fac-clock')).toHaveAttribute('data-running', 'true');
  await fac.getByTestId('v2-fac-clock-pause').click();
  await fac.getByTestId('v2-fac-clock-reset').click();
  await expect(fac.getByTestId('v2-fac-clock-time')).toHaveText('9:00');
  await fac.waitForTimeout(5_500); // one overview poll
  expect(await fac.getByTestId('v2-fac-progress').allInnerTexts()).toEqual(progressBefore);
  await expectPhase(a, 'briefing', 5);
  await expectPhase(b, 'briefing', 5);

  // Team timelines: a change of direction for Beta in Q3, neutral wording, rules stated
  await fac.getByTestId('v2-fac-tab-debrief').click();
  await expect(fac.getByTestId('v2-debrief-team')).toHaveCount(2);
  const beta = fac.locator('[data-testid="v2-fac-timeline"][data-team-label="Beta"]');
  await expect(beta.locator('tr[data-quarter="3"]')).toHaveAttribute('data-pattern', 'adaptation');
  await expect(beta.locator('tr[data-quarter="2"]')).toHaveAttribute('data-pattern', 'continuity');
  const timelineText = await fac.getByTestId('v2-fac-debrief').innerText();
  expect(timelineText).not.toMatch(/\b(good|bad|poor|excellent|failed|wrong|best|worst)\b/i);
  await expect(fac.getByTestId('v2-fac-rules')).toBeVisible();
  if (SHOTS) await beta.screenshot({ path: `${SHOTS}/b10e-timeline-beta-1366.png` });

  // Alpha finishes: board report with intent and outcome and rationale questions
  for (let q = 5; q <= 8; q++) await playQuarter(a, plan(q, ALPHA));
  await expectPhase(a, 'final');
  await expect(a.getByTestId('v2-intent-outcome').locator('tbody tr')).toHaveCount(8);
  await expect(a.getByTestId('v2-defense-rationale')).toContainText('In Q3 you cited');
  await a.setViewportSize({ width: 375, height: 800 });
  await noHorizontalScroll(a);
  if (SHOTS) { await a.getByTestId('v2-report-intent').screenshot({ path: `${SHOTS}/b10e-intent-375.png` }); await a.getByTestId('v2-defense-rationale').screenshot({ path: `${SHOTS}/b10e-rationale-375.png` }); }

  // Final debrief: partial-data note (Beta still at Q4), agenda, Q3 → Q4 with assessments
  await fac.getByTestId('v2-fac-tab-final').click();
  await expect(fac.getByTestId('v2-fac-final-partial')).toContainText('1 of 2 teams have finished');
  await expect(fac.getByTestId('v2-fac-agenda').locator('li')).toHaveCount(3);
  await expect(fac.getByTestId('v2-fac-endings').locator('tbody tr')).toHaveCount(2);
  await expect(fac.getByTestId('v2-fac-q3-q4')).toContainText('Enterprise');
  await expect(fac.getByTestId('v2-fac-differently')).toBeVisible();
  await shot(fac, 'b10e-final-debrief-1366');
});
