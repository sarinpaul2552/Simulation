import { it } from 'vitest';
import { replayInputs } from '../../src/production/v2/adapter';
import { gameHistory } from '../../src/production/v2/insights/history';
import { valuationSeries } from '../../src/production/v2/insights/valuation';
import { allScorecards, computeAwards } from '../../src/production/v2/insights/executive';
import type { V2PlayerQuarterInput } from '../../src/production/v2/types';
const al = (c: number, e: number, a: number, p: number, u: number, t = 30) => ({ consumer: c, enterprise: e, aiProduct: a, people: p, universityCredentials: u, cashReserve: t - c - e - a - p - u });
function team(alloc: (q: number) => ReturnType<typeof al>, dest: string, opp: boolean, q8: ReturnType<typeof al>, mgmt: object = {}): V2PlayerQuarterInput[] {
  return [1,2,3,4,5,6,7,8].map(q => ({ quarter: q, allocation: q === 8 ? q8 : alloc(q),
    ...(q === 4 ? { destination: dest } : {}), ...(q === 5 ? { opportunity: { offerId: 'q5-global-enterprise', accept: opp } } : {}),
    ...(q === 6 ? { management: mgmt } : {}), ...(q === 7 ? { crisisResponse: 'remediate' } : {}), ...(q === 8 ? { finalOption: 'scale-independently' } : {}) } as V2PlayerQuarterInput));
}
const B = al(5,5,5,5,5);
export const TEAMS = {
  Alpha: team(() => B, 'balanced-marketplace', false, al(10,8,7,5,5,45)),
  Beta: team(q => q === 2 ? al(5,10,10,5,0) : q === 3 ? al(5,12,8,5,0) : B, 'enterprise-ai', true, al(5,12,9,5,5,45)),
  Gamma: team(() => al(15,0,15,0,0), 'consumer-ai', false, al(22,0,19,0,0,45), { hiringFreeze: true }),
};
it('expected production figures', () => {
  const recs = Object.entries(TEAMS).map(([name, inputs]) => ({ teamId: name, teamName: name, records: gameHistory(replayInputs(inputs)) }));
  for (const t of recs) {
    const v = valuationSeries(t.records);
    console.log(t.teamName, 'prices', v.points.map(p => p.price.toFixed(2)).join(' '), '| rev', t.records[7].after.revenue.toFixed(1), 'cash', t.records[7].after.cash.toFixed(1),
      '| exec', allScorecards(t.records).map(c => `${c.role}:${c.executive.toFixed(1)}/${c.functional.toFixed(1)}`).join(' '));
  }
  const aw = computeAwards(recs);
  console.log('awards', aw.reason, aw.awards.map(a => `${a.label}: ${a.winners.join('&')} ${a.score.toFixed(1)}`).join(' | '));
});
