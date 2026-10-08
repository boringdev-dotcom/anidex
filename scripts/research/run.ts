/**
 * Research species now and save the result, exactly as the server's worker does (writes to DATABASE_URL).
 *   node --experimental-strip-types scripts/research/run.ts dodo [ocean-sunfish ...]
 *   node --experimental-strip-types scripts/research/run.ts --all [--concurrency 4]
 *     every open-data species without research yet, most popular first
 */
import '../../server/env.ts';
import { pool } from '../../server/db/pool.ts';
import { runResearch } from '../../server/jobs.ts';

if (!pool) throw new Error('DATABASE_URL is not set');
const args = process.argv.slice(2);
const all = args.includes('--all');
const ci = args.indexOf('--concurrency');
const concurrency = Math.max(1, Number(ci >= 0 ? args[ci + 1] : 4));
const slugs = all
  ? (
      await pool.query<{ slug: string }>(
        `select slug from species s
          where tier = 'auto' and not (data ? 'research')
            and not exists (select 1 from jobs j where j.kind = 'research' and j.key = s.slug and j.status in ('queued', 'running'))
          order by popularity desc`,
      )
    ).rows.map((r) => r.slug)
  : args.filter((a) => !a.startsWith('--') && a !== String(concurrency));

console.log(`${slugs.length} to research, ${all ? concurrency : 1} at a time`);
let spent = 0;
let failed = 0;
let next = 0;
await Promise.all(
  Array.from({ length: all ? concurrency : 1 }, async () => {
    while (next < slugs.length) {
      const slug = slugs[next++];
      const t0 = Date.now();
      try {
        const r = await runResearch(pool!, slug);
        spent += r.costUsd;
        const ph = r.fields.physical;
        console.log(
          `${slug.padEnd(28)} $${r.costUsd} ${((Date.now() - t0) / 1000).toFixed(0)}s  ` +
            `measurements: ${ph ? `${ph.weightKg.join('-')} kg, ${ph.lengthM.join('-')} m` : 'none'}` +
            `${r.fields.population ? `, population ${r.fields.population.points.length} pts` : ''}`,
        );
      } catch (err) {
        failed++;
        console.log(`${slug.padEnd(28)} FAILED: ${(err as Error).message.slice(0, 160)}`);
      }
    }
  }),
);
console.log(`done: ${slugs.length - failed} researched, ${failed} failed, $${spent.toFixed(2)} spent`);
await pool.end();
