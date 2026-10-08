/**
 * Research one or more species locally and print the result and its cost (does not write anything).
 *   node --experimental-strip-types scripts/research/try.ts lion axolotl
 */
import '../../server/env.ts';
import { loadAuto } from '../../server/db/seed.ts';
import { researchSpecies } from '../../server/research.ts';

const all = loadAuto();
for (const slug of process.argv.slice(2)) {
  const sp = all.find((s) => s.slug === slug);
  if (!sp) {
    console.log('unknown slug', slug);
    continue;
  }
  const t0 = Date.now();
  const r = await researchSpecies(sp);
  console.log(`\n=== ${sp.commonName} · $${r.costUsd} · ${((Date.now() - t0) / 1000).toFixed(0)}s · ${r.model}`);
  console.log(JSON.stringify(r.fields, null, 1).slice(0, 3500));
  console.log('sources:', r.sources.map((s) => s.url).join('\n  '));
}
