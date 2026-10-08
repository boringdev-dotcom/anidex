/**
 * Adds population and range history to species that were researched before those fields existed.
 * Writes to the database in DATABASE_URL (about $0.35 to $0.50 per species).
 *   npm run research:backfill [-- slug1 slug2] [--force]   (no slugs: every researched species missing them)
 */
import '../../server/env.ts';
import { pool } from '../../server/db/pool.ts';
import { researchPopulation } from '../../server/research.ts';

if (!pool) throw new Error('DATABASE_URL is not set');
const force = process.argv.includes('--force');
const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const rows = await pool.query<{ slug: string; data: Record<string, any> }>(
  `select slug, data from species
    where data ? 'research'
      and ($2 or not (data->'research' ? 'historyAt'))
      and ($1::text[] is null or slug = any($1))
    order by popularity desc`,
  [only.length ? only : null, force],
);
console.log(`${rows.rowCount} species to backfill`);

let total = 0;
for (const { slug, data } of rows.rows) {
  const t0 = Date.now();
  try {
    const { research, ...sp } = data;
    const r = await researchPopulation({ ...sp, ...research.fields } as never);
    const seen = new Set<string>();
    const sources = [...(research.sources ?? []), ...r.sources].filter((s: { url: string }) => !seen.has(s.url) && seen.add(s.url));
    await pool.query(
      `update species
          set data = jsonb_set(data, '{research}', (data->'research') || jsonb_build_object(
                'fields', (data->'research'->'fields') || $2::jsonb,
                'sources', $3::jsonb,
                'historyAt', $4::text,
                'costUsd', coalesce((data->'research'->>'costUsd')::numeric, 0) + $5::numeric)),
              updated_at = now()
        where slug = $1`,
      [slug, JSON.stringify(r.fields), JSON.stringify(sources), r.at, r.costUsd],
    );
    total += r.costUsd;
    const pop = r.fields.population;
    console.log(
      `${slug.padEnd(22)} $${r.costUsd} ${((Date.now() - t0) / 1000).toFixed(0)}s  ` +
        (pop ? `${pop.points.length} points ${pop.points[0].year}-${pop.points.at(-1)!.year} (${pop.unit})` : 'no population figure') +
        `, ${r.fields.rangeHistory?.regions.length ?? 0} range regions`,
    );
  } catch (err) {
    console.error(`${slug.padEnd(22)} FAILED: ${(err as Error).message}`);
  }
}
console.log(`total $${total.toFixed(3)}`);
await pool.end();
