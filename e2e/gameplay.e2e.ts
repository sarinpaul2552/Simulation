/**
 * Batch 5 · 5F — production gameplay E2E: real browsers, real app, real PostgREST/PostgreSQL.
 */
import { test, expect, Page } from '@playwright/test';
import { newPage, createSession, joinTeam, playQuarter, expectPhase, openQuarter, refreshAndExpect, fillDecision } from './helpers';
import { replayInputs, getDecisionSpec, getFinalOutcome, V2_BASE_ENVELOPE } from '../src/production/v2/adapter';
import type { V2PlayerQuarterInput } from '../src/production/v2/types';
import type { V2FinalOptionId } from '../src/simulation/engineV2Final';

type Alloc = V2PlayerQuarterInput['allocation'];
const alloc = (p: Partial<Alloc>, envelope: number = V2_BASE_ENVELOPE): Alloc => {
  const a = { consumer: 0, enterprise: 0, aiProduct: 0, people: 0, universityCredentials: 0, ...p };
  const invested = a.consumer + a.enterprise + a.aiProduct + a.people + a.universityCredentials;
  return { ...a, cashReserve: envelope - invested };
};

/** Team Alpha: build Enterprise + AI, commit to Enterprise AI, accept the contract, weather the recession. */
function alphaPlan(q: number, prior: V2PlayerQuarterInput[]): V2PlayerQuarterInput {
  const base = { consumer: 4, enterprise: 10, aiProduct: 10, people: 4, universityCredentials: 0 };
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: 'enterprise-ai' };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: true } };
    case 6: return { quarter: 6, allocation: alloc(base), management: { pricing: 'discount' } };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'contain' };
    case 8: {
      const spec = getDecisionSpec(replayInputs(prior))!;
      const pick = (['scale-independently', 'raise-growth-capital', 'continue'] as V2FinalOptionId[]).find(id => spec.final!.options.find(o => o.id === id)!.available)!;
      const env = pick === 'scale-independently' ? 45 : pick === 'raise-growth-capital' ? 60 : 30;
      return { quarter: 8, finalOption: pick, allocation: alloc({ ...base, enterprise: base.enterprise + (env - 30) / 2, aiProduct: base.aiProduct + (env - 30) / 2 }, env) };
    }
    default: return { quarter: q, allocation: alloc(base) };
  }
}

/** Team Beta: People-heavy and cash-hungry; borrows in the recession and still runs into distress. */
function betaPlan(q: number): V2PlayerQuarterInput {
  const base = { people: 30 };
  switch (q) {
    case 4: return { quarter: 4, allocation: alloc(base), destination: 'premium-human-ai' };
    case 5: return { quarter: 5, allocation: alloc(base), opportunity: { offerId: 'q5-global-enterprise', accept: true } };
    case 6: return { quarter: 6, allocation: alloc(base), management: { pricing: 'discount' }, financing: [{ kind: 'debt', amount: 10 }] };
    case 7: return { quarter: 7, allocation: alloc(base), crisisResponse: 'absorb' };
    case 8: return { quarter: 8, finalOption: 'stabilize-restructure', allocation: alloc({ people: 10 }) };
    default: return { quarter: q, allocation: alloc(base) };
  }
}

async function facilitatorRow(fac: Page, team: string) {
  return fac.locator(`[data-testid="v2-fac-team"][data-team="${team}"]`);
}

test('Q1→Q8: two teams, facilitator pacing, refresh at every phase, facilitator reconnect, exact economics, no leakage', async ({ browser }) => {
  let { ctx: facCtx, page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Alpha', 'Beta', 'Gamma']);
  const { page: alpha } = await newPage(browser);
  const { page: beta } = await newPage(browser);
  await joinTeam(alpha, s.sessionCode, s.teamCodes[0]);
  await joinTeam(beta, s.sessionCode, s.teamCodes[1]);
  const alphaInputs: V2PlayerQuarterInput[] = [];
  const betaInputs: V2PlayerQuarterInput[] = [];

  for (let q = 1; q <= 8; q++) {
    const ai = alphaPlan(q, alphaInputs);
    const bi = betaPlan(q);

    await playQuarter(alpha, ai, {
      refreshEveryPhase: true,
      onDecide: async page => {
        if (q === 7) {
          // Q7 crisis survives refresh: severity band shown equals the engine's, choice persists
          const spec = getDecisionSpec(replayInputs(alphaInputs))!;
          await expect(page.getByTestId('v2-crisis-band')).toHaveText(spec.crisis!.band);
          await page.waitForTimeout(700);
          await refreshAndExpect(page, 'decide', 7);
          await expect(page.getByTestId('v2-crisis-contain')).toBeChecked();
          await expect(page.getByTestId('v2-crisis-band')).toHaveText(spec.crisis!.band);
        }
        if (q === 8) {
          const spec = getDecisionSpec(replayInputs(alphaInputs))!;
          for (const o of spec.final!.options) {
            if (o.available) await expect(page.getByTestId(`v2-final-${o.id}`)).toBeEnabled();
            else await expect(page.getByTestId(`v2-final-${o.id}`)).toBeDisabled();
          }
        }
      },
    });
    alphaInputs.push(ai);
    await playQuarter(beta, bi, {
      votes: { CEO: 'support', CFO: 'oppose', Product: 'concern', People: 'support', Growth: 'oppose' },
      onDecide: async page => {
        if (q === 8) {
          const spec = getDecisionSpec(replayInputs(betaInputs))!;
          for (const o of spec.final!.options) {
            if (o.available) await expect(page.getByTestId(`v2-final-${o.id}`)).toBeEnabled();
            else await expect(page.getByTestId(`v2-final-${o.id}`)).toBeDisabled();
          }
          expect(spec.final!.options.find(o => o.id === 'stabilize-restructure')!.available).toBe(true);
        }
      },
    });
    betaInputs.push(bi);

    // Server-side economics equal the frozen engine for the same inputs (displayed values)
    for (const [page, inputs] of [[alpha, alphaInputs], [beta, betaInputs]] as const) {
      const expected = replayInputs(inputs).state;
      if (q < 8) await expect(page.getByTestId('v2-waiting')).toBeVisible();
      await expect(page.getByTestId('v2-completed')).toHaveText(String(q));
      await expect(page.getByTestId('v2-cash')).toHaveText(`${expected.cash < 0 ? '−' : ''}$${Math.abs(expected.cash).toFixed(1)}M`);
    }

    // Facilitator view
    await fac.reload();
    await expect(await facilitatorRow(fac, 'Alpha')).toContainText(`${q}/8 done`);
    await expect(await facilitatorRow(fac, 'Beta')).toContainText(`${q}/8 done`);
    await expect(await facilitatorRow(fac, 'Gamma')).toContainText('Not joined');
    if (q >= 4) {
      await expect((await facilitatorRow(fac, 'Alpha')).getByTestId('v2-fac-destination')).toHaveText('AI-powered Enterprise Learning Company');
      await expect(alpha.getByTestId('v2-destination')).toHaveText('AI-powered Enterprise Learning Company');
    } else {
      await expect((await facilitatorRow(fac, 'Alpha')).getByTestId('v2-fac-destination')).toHaveText('—');
    }
    if (q >= 6) {
      // Q6 financing persists (and shows on the facilitator view, headline only)
      await expect((await facilitatorRow(fac, 'Beta')).getByTestId('v2-fac-finance')).toContainText('debt');
      const st = replayInputs(betaInputs).state;
      expect(st.financing.rounds.some(r => r.quarter === 6 && r.kind === 'debt')).toBe(true);
      await beta.reload();
      await expect(beta.getByTestId('v2-completed')).toHaveText(String(q));
    }
    if (q >= 7) {
      const st = replayInputs(betaInputs).state;
      if (st.solvency.distressed) {
        await expect(beta.getByTestId('v2-distressed')).toBeVisible();
        await expect((await facilitatorRow(fac, 'Beta')).getByTestId('v2-fac-finance')).toContainText('distressed');
      }
    }
    // Facilitator view never leaks private information
    const facText = await fac.locator('body').innerText();
    for (const leak of ['private brief', 'our thesis', 'Support', 'Oppose', 'Concern', 'Measured (our own data', 'Engineering:', 'Finance:']) expect(facText).not.toContain(leak);
    // Teams never see each other
    expect(await alpha.locator('body').innerText()).not.toContain('Beta');
    expect(await beta.locator('body').innerText()).not.toContain('Alpha');

    if (q === 3) {
      // Facilitator reconnect: close the browser, reopen elsewhere, resume by code + PIN → exact same state
      await facCtx.close();
      ({ ctx: facCtx, page: fac } = await newPage(browser));
      await fac.goto('/');
      await fac.getByTestId('v2-home-resume').click();
      await fac.getByTestId('v2-resume-code').fill(s.sessionCode);
      await fac.getByTestId('v2-resume-pin').fill(s.adminPin);
      await fac.getByTestId('v2-resume-go').click();
      await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText('Q3');
      await expect(await facilitatorRow(fac, 'Alpha')).toContainText('3/8 done');
      // …and a refresh of the facilitator page keeps the session (reconnect without re-entering codes)
      await fac.reload();
      await expect(fac.getByTestId('v2-fac-open-quarter')).toHaveText('Q3');
    }
    if (q < 8) {
      await openQuarter(fac, q + 1);
      await expectPhase(alpha, 'briefing', q + 1);
      await expectPhase(beta, 'briefing', q + 1);
    }
  }

  // Final outcome: frozen terminal score + earned Q8 option, for both teams, survives refresh
  for (const [page, inputs] of [[alpha, alphaInputs], [beta, betaInputs]] as const) {
    await expectPhase(page, 'final');
    await page.reload();
    await expectPhase(page, 'final');
    const out = getFinalOutcome(replayInputs(inputs));
    await expect(page.getByTestId('v2-final-overall')).toHaveText(out.score.overall.toFixed(1));
    await expect(page.getByTestId('v2-final-financial')).toHaveText(out.score.financial.toFixed(1));
    await expect(page.getByTestId('v2-final-strategic')).toHaveText(out.score.strategic.toFixed(1));
    await expect(page.getByTestId('v2-final-organizational')).toHaveText(out.score.organizational.toFixed(1));
  }
  await fac.reload();
  const alphaOut = getFinalOutcome(replayInputs(alphaInputs));
  await expect((await facilitatorRow(fac, 'Alpha')).getByTestId('v2-fac-final')).toContainText(alphaOut.score.overall.toFixed(1));
  // Facilitator integrity audit: every team's stored state replays exactly from its committed decisions
  await fac.getByTestId('v2-fac-verify').click();
  await expect((await facilitatorRow(fac, 'Alpha')).getByTestId('v2-fac-integrity')).toHaveText('verified');
  await expect((await facilitatorRow(fac, 'Beta')).getByTestId('v2-fac-integrity')).toHaveText('verified');
});

test('reconnect: closing the team browser mid-quarter and rejoining restores the exact step and draft', async ({ browser }) => {
  const { page: fac } = await newPage(browser);
  const s = await createSession(fac, ['Solo'], { pacing: 'self' });
  const first = await newPage(browser);
  await joinTeam(first.page, s.sessionCode, s.teamCodes[0]);
  for (let i = 0; i < 5; i++) { await first.page.getByTestId('v2-open-brief').click(); await first.page.getByTestId('v2-hide-brief').click(); }
  await first.page.getByTestId('v2-to-decide').click();
  await fillDecision(first.page, { quarter: 1, allocation: alloc({ consumer: 7, aiProduct: 13 }) });
  await first.page.waitForTimeout(800);
  await first.ctx.close();
  const second = await newPage(browser); // a different device: empty storage, must rejoin with codes
  await joinTeam(second.page, s.sessionCode, s.teamCodes[0]);
  await expectPhase(second.page, 'decide', 1);
  await expect(second.page.getByTestId('v2-alloc-consumer')).toHaveValue('7');
  await expect(second.page.getByTestId('v2-alloc-aiProduct')).toHaveValue('13');
  await expect(second.page.getByTestId('v2-alloc-reserve')).toHaveText('$10.0M');
  // Same browser reopened later: storage remembers the team, no codes needed
  const url = second.page.url();
  const reopened = await second.ctx.newPage();
  await reopened.goto(url);
  await expectPhase(reopened, 'decide', 1);
});
