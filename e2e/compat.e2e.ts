/**
 * Batch 7 — backward compatibility: the redesigned client against a database WITHOUT the Batch 7 migration
 * (the current production schema). Run only when the stack was started with V2_SKIP_BATCH7=1 and V2_COMPAT=1.
 */
import { test, expect } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase } from './helpers';

declare const process: { env: Record<string, string | undefined> };
test.skip(process.env.V2_COMPAT !== '1', 'requires a pre-Batch-7 database (V2_SKIP_BATCH7=1)');

test('pre-migration database: MBA fallback, full quarter loop, debrief falls back to decisions only', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  // Choosing Undergraduate on an old database still creates the session and shows the codes, with a warning
  await fac.goto('/');
  const s = await createSession(fac, ['Compat'], { pacing: 'self', presentation: 'undergraduate' }).catch(async e => { throw e; });
  await expect(fac.getByTestId('v2-fac-mode-unavailable')).toBeVisible();
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  await expect(page.getByTestId('v2-team-game')).toHaveAttribute('data-mode', 'mba');
  const alloc = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6, universityCredentials: 0, cashReserve: 0 };
  await playQuarter(page, { quarter: 1, allocation: alloc });
  await expectPhase(page, 'briefing', 2);
  await fac.reload();
  await fac.getByTestId('v2-fac-tab-debrief').click();
  await expect(fac.getByTestId('v2-debrief-team')).toContainText('Compat');
});
