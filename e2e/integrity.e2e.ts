/**
 * Batch 5 · 5F — voting privacy, double-submit protection, security of codes, V1 fallback and Test Lab.
 */
import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { newPage, createSession, joinTeam, expectPhase, fillDecision, fillDiscussion, ROLES, closeAllContexts } from './helpers';
import { createV2Api } from '../src/production/v2/api';

test.afterEach(closeAllContexts);

const api = createV2Api(createClient('http://localhost:54321', process.env.V2_DB_KEY!, { auth: { persistSession: false } }));
const Q1 = { quarter: 1, allocation: { consumer: 10, enterprise: 10, aiProduct: 10, people: 0, universityCredentials: 0, cashReserve: 0 } };

async function toVote(page: import('@playwright/test').Page) {
  for (let i = 0; i < 5; i++) { await page.getByTestId('v2-open-brief').click(); await page.getByTestId('v2-hide-brief').click(); }
  await page.getByTestId('v2-to-decide').click();
  await fillDecision(page, Q1);
  await fillDiscussion(page, 1);
  await page.getByTestId('v2-to-vote').click();
  await expectPhase(page, 'vote', 1);
}

test('votes stay hidden until all five are in (UI, second device and API), then reveal together; revising clears them', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Voters'], { pacing: 'self', commitment: 'private_vote' });
  const a = await newPage(browser);
  await joinTeam(a.page, s.sessionCode, s.teamCodes[0]);
  await toVote(a.page);
  const b = await newPage(browser); // a second screen on the same team
  await joinTeam(b.page, s.sessionCode, s.teamCodes[0]);
  await expectPhase(b.page, 'vote', 1);
  const votes = ['oppose', 'support', 'concern', 'support'] as const;
  for (const [i, v] of votes.entries()) {
    await a.page.getByTestId('v2-start-vote').click();
    await a.page.getByTestId(`v2-vote-${v}`).click();
    await expect(a.page.getByTestId('v2-next-voter')).toHaveText(ROLES[i + 1]);
    const text = (await a.page.locator('[data-testid="v2-vote-panel"]').innerText()) + (await b.page.reload().then(() => b.page.locator('body').innerText()));
    expect(text).not.toMatch(/Support|Oppose|Concern/);
    const server = await api.getVotes(s.teamCodes[0], 1);
    expect(server.revealed).toBe(false);
    expect(server.votes).toBeNull();
    await expect(a.page.getByTestId('v2-to-commit')).toBeDisabled();
  }
  await a.page.getByTestId('v2-start-vote').click();
  await a.page.getByTestId('v2-vote-oppose').click();
  await expect(a.page.getByTestId('v2-votes-revealed')).toBeVisible();
  await expect(a.page.getByTestId('v2-vote-CEO')).toContainText('Oppose');
  await expect(a.page.getByTestId('v2-vote-Growth')).toContainText('Oppose');
  await b.page.reload();
  await expect(b.page.getByTestId('v2-votes-revealed')).toBeVisible();
  // Revising the decision clears the votes: everyone votes again on the changed decision
  await a.page.getByTestId('v2-revise').click();
  await expectPhase(a.page, 'decide', 1);
  expect((await api.getVotes(s.teamCodes[0], 1)).submitted_roles).toHaveLength(0);
});

test('double submit: two devices committing at once (and a double click) resolve the quarter exactly once', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Twice'], { pacing: 'self', commitment: 'private_vote' });
  const a = await newPage(browser);
  await joinTeam(a.page, s.sessionCode, s.teamCodes[0]);
  await toVote(a.page);
  for (const r of ROLES) { void r; await a.page.getByTestId('v2-start-vote').click(); await a.page.getByTestId('v2-vote-support').click(); }
  await a.page.getByTestId('v2-to-commit').click();
  await expectPhase(a.page, 'commit', 1);
  const b = await newPage(browser);
  await joinTeam(b.page, s.sessionCode, s.teamCodes[0]);
  await expectPhase(b.page, 'commit', 1);
  // Allocation double-submit: the decision is locked once voting started
  await expect(api.saveDraft(s.teamCodes[0], 1, { quarter: 1, input: { quarter: 1, allocation: { ...Q1.allocation, consumer: 30, enterprise: 0, aiProduct: 0 } } })).rejects.toThrow(/locked/);
  await Promise.all([a.page.getByTestId('v2-commit').dblclick(), b.page.getByTestId('v2-commit').click()]);
  await expectPhase(a.page, 'results', 1);
  await expectPhase(b.page, 'results', 1);
  const game = await api.getGame(s.teamCodes[0]);
  expect(game.resolutions).toHaveLength(1);
  expect(game.game!.state_version).toBe(1);
  expect(game.game!.completed_quarter).toBe(1);
  await expect(a.page.getByTestId('v2-error')).toHaveCount(0);
  // Two screens finishing the reflection at once (plus a double click) are harmless: idempotent phase changes
  for (const p of [a.page, b.page]) await p.locator('[data-testid^="v2-learn-"]').first().click();
  await Promise.all([a.page.getByTestId('v2-next-quarter').dblclick(), b.page.getByTestId('v2-next-quarter').click()]);
  await expectPhase(a.page, 'briefing', 2);
  await b.page.reload();
  await expectPhase(b.page, 'briefing', 2);
  await expect(a.page.getByTestId('v2-error')).toHaveCount(0);
  const after = await api.getGame(s.teamCodes[0]);
  expect(after.game!.completed_quarter).toBe(1);
  expect(after.resolutions[0].reflection).toMatch(/"learning":\[/);
});

test('security: invalid codes cannot read or write; tampered storage fails safely', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Secure'], { pacing: 'self' });
  const { page } = await newPage(browser);
  await page.goto('/');
  await page.getByTestId('v2-home-team').click();
  await page.getByTestId('v2-join-session').fill(s.sessionCode);
  await page.getByTestId('v2-join-team').fill('TEAM-000000');
  await page.getByTestId('v2-join-go').click();
  await expect(page.getByTestId('v2-error')).toContainText('Invalid or expired team code');
  await page.getByTestId('v2-join-session').fill('ISB-000000');
  await page.getByTestId('v2-join-team').fill(s.teamCodes[0]);
  await page.getByTestId('v2-join-go').click();
  await expect(page.getByTestId('v2-error')).toContainText('Invalid or expired session code');
  // Facilitator resume with a wrong PIN
  await page.goto('/');
  await page.getByTestId('v2-home-resume').click();
  await page.getByTestId('v2-resume-code').fill(s.sessionCode);
  await page.getByTestId('v2-resume-pin').fill(s.adminPin === '0000' ? '1111' : '0000');
  await page.getByTestId('v2-resume-go').click();
  await expect(page.getByTestId('v2-error')).toContainText('Invalid admin PIN');
  // Tampered local storage (forged team code) → server rejects; the app shows an error instead of any game
  await page.evaluate(() => localStorage.setItem('v2_team_session', JSON.stringify({ sessionCode: 'ISB-X', teamCode: 'TEAM-FORGED' })));
  await page.goto('/');
  await expect(page.getByTestId('v2-error')).toContainText('Invalid or expired team code');
  await expect(page.getByTestId('v2-team-game')).toHaveCount(0);
  // Direct REST access to tables with the public key returns nothing
  const res = await page.evaluate(async key => {
    const r = await fetch('http://localhost:54321/rest/v1/v2_team_games?select=*', { headers: { apikey: key } });
    return { status: r.status, body: await r.text() };
  }, process.env.V2_DB_KEY!);
  expect(res.status).toBeGreaterThanOrEqual(400);
});

test('V1 fallback is hidden by default and reachable behind the developer flag; Test Lab still loads', async ({ browser }) => {
  const { page } = await newPage(browser);
  await page.goto('/');
  await expect(page.getByTestId('v2-home')).toBeVisible();
  await expect(page.getByTestId('v2-open-legacy')).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem('ENABLE_V1_FALLBACK', 'true'));
  await page.reload();
  await page.getByTestId('v2-open-legacy').click();
  await expect(page.getByText('Business Simulation V4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Team Member' })).toBeVisible();
  await page.goto('/devlab');
  await expect(page.getByText('Exit Test Lab')).toBeVisible();
  await expect(page.getByTestId('v2-home')).toHaveCount(0);
});

test('one device per player: each player sees only their own brief and casts only their own vote', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Devices'], { pacing: 'self', mode: 'individual_device', commitment: 'private_vote' });
  const devices = [];
  for (const role of ROLES) {
    const d = await newPage(browser);
    await joinTeam(d.page, s.sessionCode, s.teamCodes[0], role);
    await expect(d.page.getByTestId('v2-role-brief')).toHaveAttribute('data-role', role);
    await expect(d.page.getByTestId('v2-role-brief')).toHaveCount(1);
    devices.push({ role, page: d.page });
  }
  const ceo = devices[0].page;
  await ceo.getByTestId('v2-to-decide').click();
  await fillDecision(ceo, Q1);
  await fillDiscussion(ceo, 1);
  await ceo.getByTestId('v2-to-vote').click();
  for (const [i, d] of devices.entries()) {
    await expectPhase(d.page, 'vote', 1); // other devices follow the team's step
    await expect(d.page.getByTestId('v2-vote-private')).toHaveAttribute('data-role', d.role);
    await d.page.getByTestId(i % 2 ? 'v2-vote-oppose' : 'v2-vote-support').click();
    if (i < 4) await expect(d.page.getByTestId('v2-waiting-votes')).toBeVisible();
  }
  for (const d of devices) await expect(d.page.getByTestId('v2-votes-revealed')).toBeVisible();
  await expect(ceo.getByTestId('v2-vote-CFO')).toContainText('Oppose');
});

test('team commitment: one device commits; a second device and a double click cannot resolve twice; no votes are created', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Together'], { pacing: 'self' });
  const a = await newPage(browser);
  await joinTeam(a.page, s.sessionCode, s.teamCodes[0]);
  await expect(a.page.getByTestId('v2-team-game')).toHaveAttribute('data-commitment', 'team_commitment');
  for (let i = 0; i < 5; i++) { await a.page.getByTestId('v2-open-brief').click(); await a.page.getByTestId('v2-hide-brief').click(); }
  await a.page.getByTestId('v2-to-decide').click();
  await fillDecision(a.page, Q1);
  await fillDiscussion(a.page, 1);
  await a.page.getByTestId('v2-to-vote').click();
  await expectPhase(a.page, 'risk', 1);
  const b = await newPage(browser);
  await joinTeam(b.page, s.sessionCode, s.teamCodes[0]);
  await expectPhase(b.page, 'risk', 1);
  for (const p of [a.page, b.page]) await p.getByTestId('v2-agreement-discussed').click();
  // Cancelling the confirmation changes nothing
  await a.page.getByTestId('v2-commit-team').click();
  await a.page.getByTestId('v2-confirm-cancel').click();
  await expectPhase(a.page, 'risk', 1);
  await a.page.getByTestId('v2-commit-team').click();
  await b.page.getByTestId('v2-commit-team').click();
  await Promise.all([a.page.getByTestId('v2-confirm-confirm').dblclick(), b.page.getByTestId('v2-confirm-confirm').click()]);
  await expectPhase(a.page, 'results', 1);
  await b.page.reload();
  await expectPhase(b.page, 'results', 1);
  const game = await api.getGame(s.teamCodes[0]);
  expect(game.resolutions).toHaveLength(1);
  expect(game.game!.state_version).toBe(1);
  expect(game.resolutions[0].agreement).toBe('discussed');
  expect((await api.getVotes(s.teamCodes[0], 1)).submitted_roles).toHaveLength(0);
  await expect(a.page.getByTestId('v2-reflect-agreement')).toContainText('different opinions');
});

test('team commitment on individual devices: only the team leader commits; the others follow', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Leaders'], { pacing: 'self', mode: 'individual_device' });
  const devices: { role: (typeof ROLES)[number]; page: import('@playwright/test').Page }[] = [];
  for (const role of ['CEO', 'CFO'] as const) { const d = await newPage(browser); await joinTeam(d.page, s.sessionCode, s.teamCodes[0], role); devices.push({ role, page: d.page }); }
  const [ceo, cfo] = devices.map(d => d.page);
  await cfo.getByTestId('v2-to-decide').click();
  await fillDecision(cfo, Q1);
  await fillDiscussion(cfo, 1);
  await cfo.getByTestId('v2-to-vote').click();
  await expectPhase(cfo, 'risk', 1);
  await expect(cfo.getByTestId('v2-waiting-commit')).toBeVisible();
  await expect(cfo.getByTestId('v2-commit-team')).toBeDisabled();
  await expectPhase(ceo, 'risk', 1); // follows the team's step by polling
  await ceo.getByTestId('v2-agreement-leader').click();
  await ceo.getByTestId('v2-commit-team').click();
  await ceo.getByTestId('v2-confirm-confirm').click();
  await expectPhase(ceo, 'results', 1);
  await expectPhase(cfo, 'results', 1);
  expect((await api.getGame(s.teamCodes[0])).resolutions[0].agreement).toBe('leader');
});

test('facilitator switches a live session to private voting and back; existing teams follow the new rule', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Flex'], { pacing: 'self' });
  await expect(fac.getByTestId('v2-fac-commit-team_commitment')).toHaveAttribute('aria-checked', 'true');
  await fac.getByTestId('v2-fac-commit-private_vote').click();
  await expect(fac.getByTestId('v2-fac-commit-private_vote')).toHaveAttribute('aria-checked', 'true');
  const t = await newPage(browser);
  await joinTeam(t.page, s.sessionCode, s.teamCodes[0]);
  await expect(t.page.getByTestId('v2-team-game')).toHaveAttribute('data-commitment', 'private_vote');
  await toVote(t.page);
  await expect(t.page.getByTestId('v2-vote-panel')).toBeVisible();
  await fac.getByTestId('v2-fac-commit-team_commitment').click();
  await t.page.reload();
  await expect(t.page.getByTestId('v2-team-game')).toHaveAttribute('data-commitment', 'team_commitment');
  await expect(t.page.getByTestId('v2-team-commitment')).toBeVisible();
  await t.page.getByTestId('v2-agreement-agreed').click();
  await t.page.getByTestId('v2-commit-team').click();
  await t.page.getByTestId('v2-confirm-confirm').click();
  await expectPhase(t.page, 'results', 1);
});
