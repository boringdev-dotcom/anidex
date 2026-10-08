/**
 * Research species now and save the result, exactly as the server's worker does (writes to DATABASE_URL).
 *   node --experimental-strip-types scripts/research/run.ts dodo [ocean-sunfish ...]
 *   node --experimental-strip-types scripts/research/run.ts --all [--concurrency 4] [--budget 40]
 *     every open-data species without research yet, most popular first; stops starting new ones
 *     once the spend reaches the budget (in dollars)
 */
import '../../server/env.ts';
import { pool } from '../../server/db/pool.ts';
import { runResearch } from '../../server/jobs.ts';

if (!pool) throw new Error('DATABASE_URL is not set');
const args = process.argv.slice(2);
const all = args.includes('--all');
const ci = args.indexOf('--concurrency');
const concurrency = Math.max(1, Number(ci >= 0 ? args[ci + 1] : 4));
const bi = args.indexOf('--budget');
const budget = bi >= 0 ? Number(args[bi + 1]) : Infinity;
const slugs = all
  ? (
      await pool.query<{ slug: string }>(
        `select slug from species s
          where tier = 'auto' and not (data ? 'research')
            and not exists (select 1 from jobs j where j.kind = 'research' and j.key = s.slug and j.status in ('queued', 'running'))
          order by popularity desc`,
      )
    ).rows.map((r) => r.slug)
  : args.filter((a, i) => !a.startsWith('--') && !['--concurrency', '--budget'].includes(args[i - 1]));

console.log(`${slugs.length} to research, ${all ? concurrency : 1} at a time`);
let spent = 0;
let failed = 0;
let next = 0;
await Promise.all(
  Array.from({ length: all ? concurrency : 1 }, async () => {
    while (next < slugs.length) {
      if (spent >= budget) break;
      const slug = slugs[next++];
      const t0 = Date.now();
      try {
        const r = await runResearch(pool!, slug);
        spent += r.costUsd;
        const ph = r.fields.physical;
        console.log(
          `${slug.padEnd(28)} $${r.costUsd} ${((Date.now() - t0) / 1000).toFixed(0)}s  ` +
            `measurements: ${ph ? `${ph.weightKg?.join("-") ?? "no weight"} kg, ${ph.lengthM.join("-")} m` : "none"}` +
            `${r.fields.population ? `, population ${r.fields.population.points.length} pts` : ''}`,
        );
      } catch (err) {
        failed++;
        console.log(`${slug.padEnd(28)} FAILED: ${(err as Error).message.slice(0, 160)}`);
      }
    }
  }),
);
const left = slugs.length - next;
console.log(`done: ${next - failed} researched, ${failed} failed, $${spent.toFixed(2)} spent${left ? `, ${left} left (budget reached)` : ''}`);
await pool.end();
