/**
 * Batch 7 — backward compatibility: the redesigned client against a database WITHOUT the Batch 7 migration
 * (the current production schema). Run only when the stack was started with V2_SKIP_BATCH7=1 and V2_COMPAT=1.
 */
import { test, expect } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, closeAllContexts } from './helpers';

test.afterEach(closeAllContexts);

declare const process: { env: Record<string, string | undefined> };
test.skip(process.env.V2_COMPAT !== '1', 'requires a pre-Batch-7 database (V2_SKIP_BATCH7=1)');

test('pre-migration database: MBA fallback, full quarter loop, debrief falls back to decisions only', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  // Choosing Undergraduate on an old database still creates the session and shows the codes, with a warning
  await fac.goto('/');
  const s = await createSession(fac, ['Compat'], { pacing: 'self', presentation: 'undergraduate' }).catch(async e => { throw e; });
  const pre7 = process.env.V2_COMPAT_LEVEL !== '7';   // '7' = Batch 7 migration applied, Batch 7.5 not
  if (pre7) await expect(fac.getByTestId('v2-fac-mode-unavailable')).toBeVisible();
  // Team Commitment is unavailable before the Batch 7.5 migration: teams keep private voting
  await expect(fac.getByTestId('v2-fac-commit-unavailable')).toBeVisible();
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await expect(page.getByTestId('v2-team-game')).toHaveAttribute('data-mode', pre7 ? 'mba' : 'undergraduate');
  await expect(page.getByTestId('v2-team-game')).toHaveAttribute('data-commitment', 'private_vote');
  const alloc = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6, universityCredentials: 0, cashReserve: 0 };
  await playQuarter(page, { quarter: 1, allocation: alloc });
  await expectPhase(page, 'briefing', 2);
  await fac.reload();
  await fac.getByTestId('v2-fac-tab-debrief').click();
  await expect(fac.getByTestId('v2-debrief-team')).toContainText('Compat');
});

test('choosing a V3 market path on a database without the V3 migration shows a clear message and creates nothing', async ({ browser }) => {
  const { page } = await newPage(browser);
  await page.goto('/');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('facilitator@school.edu');
  await page.getByTestId('v2-setup-market-B').click();
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByText('NexLearn V3 market paths are not available on this database yet')).toBeVisible();
  await expect(page.getByTestId('v2-fac-created')).toHaveCount(0);
});
