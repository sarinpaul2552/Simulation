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

test('?econ=1.1 creates a v3-econ-1.1 session; without the flag the created screen is unchanged', async ({ browser }) => {
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
  const v11 = await playTwo(browser, '1.1');
  const v10 = await playTwo(browser);
  expect(v11.kpis.length).toBeGreaterThan(0);
  expect(v11.kpis).toBe(v10.kpis);
});
