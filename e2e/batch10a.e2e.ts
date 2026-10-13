/**
 * Batch 10A — student learning experience: quarter framing, structured rationale, optional allocation prefill,
 * reflection persistence across refresh, and the gated Q3 signal reveal (desktop and 375px).
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, readBriefings, fillDiscussion, refreshAndExpect } from './helpers';
import { V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

declare const process: { env: Record<string, string | undefined> };
const SHOTS = process.env.V2_SHOTS_DIR;
const shot = async (page: Page, name: string) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

type Alloc = V2PlayerQuarterInput['allocation'];
const alloc = (p: Partial<Alloc>): Alloc => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: V2_BASE_ENVELOPE - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
const base = { consumer: 6, enterprise: 8, aiProduct: 10, people: 6 };
const plan = (q: number): V2PlayerQuarterInput =>
  q === 4 ? { quarter: 4, allocation: alloc(base), destination: 'enterprise-ai' }
    : q === 5 ? { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: false } }
      : { quarter: q, allocation: alloc(base) };

async function noHorizontalScroll(page: Page) {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(1);
}

test('Batch 10A: distinct Q1–Q3 framing, prefill, rationale, reflection persistence and the gated signal reveal', async ({ browser }) => {
  test.setTimeout(240_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Learning'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);

  // Q1: initial bets — no prefill is offered (no previous quarter)
  await expectPhase(page, 'briefing', 1);
  await playQuarter(page, plan(1), {
    onDecide: async p => {
      await expect(p.getByTestId('v2-decision-heading')).toHaveText('Where should we place our initial bets?');
      await expect(p.getByTestId('v2-pace')).toHaveAttribute('data-pace', 'fast');
      await expect(p.getByTestId('v2-prefill-offer')).toHaveCount(0);
    },
  });

  // Q2: stance framing; explicit prefill copies Q1's amounts without committing anything
  await expectPhase(page, 'briefing', 2);
  await readBriefings(page);
  await page.getByTestId('v2-to-decide').click();
  await expectPhase(page, 'decide', 2);
  await expect(page.getByTestId('v2-decision-heading')).toHaveText('Accelerate, maintain or reconsider?');
  await expect(page.getByTestId('v2-prefill-offer')).toBeVisible();
  await page.getByTestId('v2-prefill').click();
  for (const [b, v] of Object.entries(base)) await expect(page.getByTestId(`v2-alloc-${b}`)).toHaveValue(String(v));
  await expect(page.getByTestId('v2-prefill-offer')).toHaveCount(0); // never offered over a started allocation
  await expect(page.getByTestId('v2-to-vote')).toBeDisabled(); // rationale still required; nothing committed
  await expectPhase(page, 'decide', 2);
  await fillDiscussion(page, 2);
  for (const w of [1366, 375]) { await page.setViewportSize({ width: w, height: 800 }); await noHorizontalScroll(page); await shot(page, `b10a-q2-decision-${w}`); }
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.waitForTimeout(800);
  await refreshAndExpect(page, 'decide', 2); // the prefilled draft and the rationale survive a refresh
  await expect(page.getByTestId('v2-alloc-aiProduct')).toHaveValue('10');
  await expect(page.locator('[data-testid^="v2-priority-"] input:checked')).toHaveCount(1);
  await page.getByTestId('v2-to-vote').click();
  await expectPhase(page, 'risk', 2);
  await expect(page.getByTestId('v2-resolution-priority')).toBeVisible();
  await page.getByTestId('v2-agreement-agreed').click();
  await page.getByTestId('v2-commit-team').click();
  await page.getByTestId('v2-confirm-confirm').click();
  await expectPhase(page, 'results', 2);
  await expect(page.getByTestId('v2-signal-reveal')).toHaveCount(0);
  await page.locator('[data-testid^="v2-learn-"]').first().click();
  await page.getByTestId('v2-next-quarter').click();

  // Q3: evidence citation; refresh at every phase (including the reflection) — no reveal yet
  await playQuarter(page, plan(3), {
    refreshEveryPhase: true,
    onDecide: async p => { await expect(p.getByTestId('v2-decision-heading')).toHaveText('Which evidence do we trust?'); await expect(p.locator('[data-testid^="v2-evidence-"] input:checked')).toHaveCount(2); await expect(p.getByTestId('v2-fold-belief').locator('summary')).toContainText('2 signals cited'); },
    onResults: async p => { await refreshAndExpect(p, 'results', 3); await expect(p.getByTestId('v2-signal-reveal')).toHaveCount(0); },
  });

  // Q4: the reveal opens in Results & Learn, on desktop and phone
  await playQuarter(page, plan(4), {
    onResults: async p => {
      const reveal = p.getByTestId('v2-signal-reveal');
      await expect(reveal).toHaveAttribute('open', '');
      await expect(reveal.locator('[data-signal]')).toHaveCount(8);
      await expect(reveal.getByText('you cited this')).toHaveCount(2);
      await expect(reveal.locator('[data-verdict="not-assessed"]')).toHaveCount(1);
      for (const w of [1366, 375]) { await p.setViewportSize({ width: w, height: 800 }); await noHorizontalScroll(p); if (SHOTS) await reveal.screenshot({ path: `${SHOTS}/b10a-q4-reveal-${w}.png` }); }
      await p.setViewportSize({ width: 1366, height: 820 });
      await refreshAndExpect(p, 'results', 4);
      await expect(p.getByTestId('v2-signal-reveal')).toHaveCount(1);
    },
  });

  // Q5: still available, collapsed
  await playQuarter(page, plan(5), {
    onResults: async p => { await expect(p.getByTestId('v2-signal-reveal')).toHaveCount(1); await expect(p.getByTestId('v2-signal-reveal')).not.toHaveAttribute('open', ''); },
  });
});
