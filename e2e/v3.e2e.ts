/**
 * NexLearn V3 (Batch 10F) — the integrated product in a real browser, against the local disposable stack with the V3
 * migration applied (scripts/v2-local/up.sh).
 *
 * Path B session, facilitator-paced, two teams:
 *  - Team "Delta" (desktop, shared device): all eight quarters — financed budget expansion (Q2), strategic commitment
 *    (Q4), the consortium contract with the budget claim and "make room" (Q5), the recession stance with a hiring
 *    freeze that moves People to cash (Q6), crisis (Q7), final decision (Q8), the board report;
 *  - Team "Echo" (mobile 390×844): Q1–Q4 with a refresh at every phase; no horizontal scroll;
 *  - facilitator: path shown and fixed; opens every quarter; Q3 assessments gated until both teams finish Q4 and then
 *    shown in path B wording; projector shows no codes or PIN;
 *  - invalid decisions are blocked with a named reason (contract without room; stance missing).
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, openQuarter, expectPhase } from './helpers';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';
import { PATH_B_CONTENT } from '../src/production/v2/content/pathB';

type Alloc = V2PlayerQuarterInput['allocation'];
const alloc = (p: Partial<Alloc>, budget = 30): Alloc => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: budget - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
const BAL = { consumer: 5, enterprise: 5, aiProduct: 5, people: 5, universityCredentials: 5 };
const ENT = { enterprise: 12, aiProduct: 10, people: 8 };

const DELTA: V2PlayerQuarterInput[] = [
  { quarter: 1, allocation: alloc(BAL) },
  { quarter: 2, allocation: alloc({ enterprise: 14, aiProduct: 12, people: 9 }, 35), financing: [{ kind: 'debt', amount: 5 }], expansion: 5 },
  { quarter: 3, allocation: alloc(ENT) },
  { quarter: 4, allocation: alloc(ENT), destination: 'enterprise-ai' },
  { quarter: 5, allocation: alloc(ENT), opportunity: { offerId: 'q5-enterprise-consortium', accept: true } },
  { quarter: 6, allocation: alloc(ENT), recessionStance: 'cut', management: { hiringFreeze: true } },
  { quarter: 7, allocation: alloc(ENT), crisisResponse: 'contain' },
  { quarter: 8, allocation: alloc(ENT), finalOption: 'continue' },
];
const ECHO = (q: number): V2PlayerQuarterInput => q === 4
  ? { quarter: 4, allocation: alloc({ consumer: 12, aiProduct: 12, people: 6 }), destination: 'consumer-ai' }
  : { quarter: q, allocation: alloc({ consumer: 12, aiProduct: 12, people: 6 }) };

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test('NexLearn V3: path B session, two teams (desktop + mobile), V3 decisions, gated path-specific reveal, board report', async ({ browser }) => {
  test.setTimeout(600_000);
  const { page: fac } = await newPage(browser);
  await fac.setViewportSize({ width: 1366, height: 900 });
  const s = await createSession(fac, ['Delta', 'Echo'], { market: 'B' });
  await expect(fac.getByTestId('v2-fac-market')).toHaveAttribute('data-path', 'B');
  await expect(fac.getByTestId('v2-fac-market')).toContainText('Enterprise Transformation');

  const { page: d } = await newPage(browser);
  await d.setViewportSize({ width: 1366, height: 900 });
  const { page: e } = await newPage(browser);
  await e.setViewportSize({ width: 390, height: 844 });
  await joinTeam(d, s.sessionCode, s.teamCodes[0]);
  await joinTeam(e, s.sessionCode, s.teamCodes[1]);

  for (let q = 1; q <= 8; q++) {
    if (q > 1) await openQuarter(fac, q);
    const input = DELTA[q - 1];
    await playQuarter(d, input, {
      onDecide: async p => {
        if (q === 2) {
          // the briefing is path B's: employers fund AI reskilling (a signal only path B has)
          await expect(p.getByTestId('v2-budget-expansion')).toContainText('$5.0M');
        }
        if (q === 5) {
          await expect(p.getByTestId('v2-opp-claim')).toContainText('of your $30M budget');
          // the plan keeps no cash, so the claim blocks it until the team makes room
          await expect(p.getByTestId('v2-validation')).toContainText('claims');
          await p.getByTestId('v2-opp-make-room').click();
          await expect(p.getByTestId('v2-opp-make-room')).toHaveCount(0);
        }
        if (q === 6) {
          await expect(p.getByTestId('v2-stance')).toBeVisible();
          await expect(p.getByTestId('v2-alloc-people')).toHaveValue('0'); // the freeze moved People to cash
        }
      },
      onResults: async p => {
        if (q === 4) {
          const reveal = p.getByTestId('v2-signal-reveal');
          await expect(reveal).toBeVisible();
          await expect(reveal).toContainText(PATH_B_CONTENT.revealSummary.slice(0, 40));
        }
      },
      reflection: `Delta Q${q}`,
    });
    if (q <= 4) {
      await playQuarter(e, ECHO(q), { refreshEveryPhase: true, reflection: `Echo Q${q}` });
      await noHorizontalScroll(e);
    }
    if (q === 3) {
      // Q3 gate: nobody has completed Q4 yet — the facilitator sees no assessments
      await fac.getByTestId('v2-fac-tab-compare').click();
      await fac.getByTestId('v2-fac-q-3').click();
      await expect(fac.getByTestId('v2-fac-q3-panel')).toHaveAttribute('data-gate', 'closed');
      await expect(fac.getByTestId('v2-fac-q3-gate')).toContainText('0 of 2 teams');
      await expect(fac.getByTestId('v2-fac-q3-verdict')).toHaveCount(0);
      await fac.getByTestId('v2-fac-tab-live').click();
    }
  }
  await expectPhase(d, 'final');
  await expect(d.getByTestId('v2-final-market')).toContainText('Enterprise Transformation');
  await expect(d.getByTestId('v2-final')).toContainText('consortium programme');

  // facilitator: both teams finished Q4 → path B assessments are shown
  await fac.getByTestId('v2-fac-tab-compare').click();
  await fac.getByTestId('v2-fac-q-3').click();
  const panel = fac.getByTestId('v2-fac-q3-panel');
  await expect(panel).toHaveAttribute('data-gate', 'open', { timeout: 20_000 });
  await expect(fac.getByTestId('v2-fac-q3-verdict')).toHaveCount(8);
  await expect(panel).toContainText(PATH_B_CONTENT.q3Assessments.find(a => a.id === 'q3-ai-engagement')!.showed.slice(0, 30));
  // projector: no PIN, no team codes
  await fac.getByTestId('v2-fac-projector').click();
  const text = await fac.locator('body').innerText();
  expect(text).not.toContain(s.adminPin);
  for (const c of s.teamCodes) expect(text).not.toContain(c);
});

test('NexLearn V3 path C: the recession stance is required and enforced in the UI; V2 sessions remain available', async ({ browser }) => {
  test.setTimeout(400_000);
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Solo'], { market: 'C', pacing: 'self' });
  await expect(fac.getByTestId('v2-fac-market')).toHaveAttribute('data-path', 'C');
  const { page: t } = await newPage(browser);
  await joinTeam(t, s.sessionCode, s.teamCodes[0]);
  const base = { consumer: 12, aiProduct: 12, people: 6 };
  for (let q = 1; q <= 5; q++) {
    const input: V2PlayerQuarterInput = { quarter: q, allocation: alloc(base) };
    if (q === 4) input.destination = 'consumer-ai';
    if (q === 5) input.opportunity = { offerId: 'q5-vendor-consolidation', accept: false };
    await playQuarter(t, input, { reflection: `Q${q}` });
  }
  // Q6: no stance → blocked with a named reason; cost actions disabled until the stance is "Cut"; "Slow" needs $5M cash
  await playQuarter(t, { quarter: 6, allocation: alloc(base), recessionStance: 'slow' }, {
    onDecide: async p => {
      await expect(p.getByTestId('v2-stance-slow-short')).toBeVisible();
      await expect(p.getByTestId('v2-to-vote')).toBeDisabled();
      await p.getByTestId('v2-stance-make-room').click();
      await expect(p.getByTestId('v2-stance-slow-short')).toHaveCount(0);
      await p.getByTestId('v2-stance-protect').click();
      await expect(p.getByTestId('v2-mgmt-freeze')).toBeDisabled();
      await p.getByTestId('v2-stance-slow').click();
    },
  });
  // the stored game is a V3 path C game and replays (the results stage verifies the stored snapshot on load)
  await t.reload();
  await expectPhase(t, 'briefing', 7);

  const v2 = await newPage(browser);
  const s2 = await createSession(v2.page, ['Old'], { market: 'v2', pacing: 'self' });
  await expect(v2.page.getByTestId('v2-fac-market')).toHaveAttribute('data-path', 'v2');
  expect(s2.teamCodes).toHaveLength(1);
});
