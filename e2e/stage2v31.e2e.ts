/**
 * NexLearn V3.1 Stage 2 — explicit engine-version selection in a real browser (local disposable stack with
 * MIGRATION_V3_1_ENGINE_VERSION.sql applied).
 *  - `?econ=1.1` creates a v3-econ-1.1 session (shown once on the created screen); without the flag nothing changes;
 *  - a team plays Q1–Q2 on 1.1 (including a financed expansion), the game survives a reload (it is restored and
 *    verified by replay on 1.1), and the results equal the same decisions played on a 1.0 session.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, closeAllContexts } from './helpers';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';

test.afterEach(closeAllContexts);
declare const process: { env: Record<string, string | undefined> };
/** Set when the local database keeps 1.1 unreleased, as production does (up.sh with V2_LOCAL_V31_UNRELEASED=1). */
const UNRELEASED = process.env.V2_V31_UNRELEASED === '1';

const alloc = (p: Partial<V2PlayerQuarterInput['allocation']>, budget = 30): V2PlayerQuarterInput['allocation'] => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  return { ...a, cashReserve: budget - (a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials) };
};
const PLAN: V2PlayerQuarterInput[] = [
  { quarter: 1, allocation: alloc({ consumer: 6, enterprise: 8, aiProduct: 8, people: 5 }) },
  { quarter: 2, allocation: alloc({ consumer: 6, enterprise: 10, aiProduct: 10, people: 6 }, 35), financing: [{ kind: 'debt', amount: 5 }], expansion: 5 },
];

async function playTwo(browser: import('@playwright/test').Browser, econ?: '1.1'): Promise<{ kpis: string; page: Page }> {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Versioned'], { pacing: 'self', market: 'B', econ });
  const { page } = await newPage(browser);
  await page.setViewportSize({ width: 1366, height: 860 });
  await joinTeam(page, s.sessionCode, s.teamCodes[0]);
  let kpis = '';
  for (const input of PLAN) await playQuarter(page, input, { onResults: async p => { kpis = (await p.getByTestId('v2-kpis').textContent())!.trim(); } });
  await page.reload();
  await expect(page.getByTestId('v2-team-game')).toBeVisible();
  await expect(page.getByTestId('v2-integrity-error')).toHaveCount(0);
  await expectPhase(page, 'briefing', 3);
  return { kpis, page };
}

test('server-side gate: when 1.1 is not released, ?econ=1.1 creates nothing and says so', async ({ browser }) => {
  test.skip(!UNRELEASED, 'needs a database where 1.1 is unreleased (V2_LOCAL_V31_UNRELEASED=1)');
  const { page } = await newPage(browser);
  await page.goto('/?econ=1.1');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('f@school.edu');
  await page.getByTestId('v2-setup-market-A').click();
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByText('NexLearn V3 engine version 1.1 is not available on this server.')).toBeVisible();
  await expect(page.getByTestId('v2-fac-created')).toHaveCount(0);
  // the released default is unaffected
  await page.goto('/');
  await page.getByTestId('v2-home-facilitator').click();
  await page.getByTestId('v2-setup-email').fill('f@school.edu');
  await page.getByTestId('v2-setup-market-A').click();
  await page.getByTestId('v2-setup-create').click();
  await expect(page.getByTestId('v2-fac-created')).toBeVisible();
});

test('?econ=1.1 creates a v3-econ-1.1 session; without the flag the created screen is unchanged', async ({ browser }) => {
  test.skip(UNRELEASED, '1.1 is unreleased on this database');
  const { page: a } = await newPage(browser);
  await a.goto('/?econ=1.1');
  await a.getByTestId('v2-home-facilitator').click();
  await a.getByTestId('v2-setup-email').fill('f@school.edu');
  await a.getByTestId('v2-setup-market-C').click();
  await a.getByTestId('v2-setup-create').click();
  await expect(a.getByTestId('v2-created-econ-version')).toHaveAttribute('data-version', '1.1');
  const { page: b } = await newPage(browser);
  await b.goto('/');
  await b.getByTestId('v2-home-facilitator').click();
  await b.getByTestId('v2-setup-email').fill('f@school.edu');
  await b.getByTestId('v2-setup-market-C').click();
  await b.getByTestId('v2-setup-create').click();
  await expect(b.getByTestId('v2-fac-created')).toBeVisible();
  await expect(b.getByTestId('v2-created-econ-version')).toHaveCount(0);
});

test('a v3-econ-1.1 team plays Q1–Q2, survives a reload, and reaches exactly the 1.0 results', async ({ browser }) => {
  test.skip(UNRELEASED, '1.1 is unreleased on this database');
  const v11 = await playTwo(browser, '1.1');
  const v10 = await playTwo(browser);
  expect(v11.kpis.length).toBeGreaterThan(0);
  expect(v11.kpis).toBe(v10.kpis);
});
