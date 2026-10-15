/**
 * NexLearn V3.1 Stage 2 — verify every stored game in a database dump exactly as a classroom client restores it
 * (gameService.fromResponse: snapshot contract, input log vs resolution log, session engine/path/version match, and a
 * full replay on the game's own engine version). Used by test-v31-migration.sh on the disposable local database.
 *
 *   npx vite-node scripts/v2-local/verify-stored-games.ts <dump.json>
 * where dump.json is a JSON array of v2__game_json(team_id) values (teams that have a game).
 */
import { readFileSync } from 'node:fs';
import { fromResponse } from '../../src/production/v2/gameService';
import type { V2TeamGameResponse } from '../../src/production/v2/api';

declare const process: { argv: string[]; exit(code: number): never };
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')) as V2TeamGameResponse[];
const counts: Record<string, number> = {};
let failures = 0;
for (const r of rows) {
  try {
    const g = fromResponse('dump', r);
    const key = `${g.snapshot.engineVersion}${g.snapshot.marketPath ? ` path ${g.snapshot.marketPath}` : ''} · session econ_version=${String(r.session.econ_version ?? null)}`;
    counts[key] = (counts[key] ?? 0) + 1;
  } catch (e) {
    failures++;
    console.log(`FAIL team ${r.team_id}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
for (const [k, n] of Object.entries(counts).sort()) console.log(`${String(n).padStart(4)}  ${k}`);
console.log(`verified ${rows.length - failures}/${rows.length} stored games`);
if (failures > 0 || rows.length === 0) process.exit(1);
