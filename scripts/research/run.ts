/**
 * Research species now and save the result, exactly as the server's worker does (writes to DATABASE_URL).
 * Useful to redo a species whose research came back thin.
 *   node --experimental-strip-types scripts/research/run.ts dodo [ocean-sunfish ...]
 */
import '../../server/env.ts';
import { pool } from '../../server/db/pool.ts';
import { runResearch } from '../../server/jobs.ts';

if (!pool) throw new Error('DATABASE_URL is not set');
for (const slug of process.argv.slice(2)) {
  const t0 = Date.now();
  const r = await runResearch(pool, slug);
  const ph = r.fields.physical;
  console.log(`${slug.padEnd(22)} $${r.costUsd} ${((Date.now() - t0) / 1000).toFixed(0)}s  measurements: ${ph ? `${ph.weightKg.join('-')} kg, ${ph.lengthM.join('-')} m` : 'none'}`);
}
await pool.end();
