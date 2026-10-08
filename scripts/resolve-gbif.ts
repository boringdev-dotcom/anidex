/**
 * Checks every species JSON against the GBIF backbone.
 *   npm run gbif:check
 *
 * For each file it looks up the scientific name and reports whether the stored gbifTaxonKey
 * is the accepted usage key, so typos and synonym keys are caught before they ship.
 * It also prints how many georeferenced records GBIF holds, which drives the globe's range layer.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'src', 'data', 'species');

interface Match {
  usageKey?: number;
  acceptedUsageKey?: number;
  status?: string;
  matchType?: string;
  scientificName?: string;
  speciesKey?: number;
}

let problems = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
  const sp = JSON.parse(readFileSync(join(dir, file), 'utf8')) as { slug: string; scientificName: string; gbifTaxonKey: number };
  const m = (await (await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(sp.scientificName)}`)).json()) as Match;
  const accepted = m.acceptedUsageKey ?? m.usageKey;
  const cap = (await (await fetch(`https://api.gbif.org/v2/map/occurrence/density/capabilities.json?taxonKey=${sp.gbifTaxonKey}`)).json()) as { total?: number };
  // a subspecies may deliberately use its parent species key, which carries far more records
  const ok = sp.gbifTaxonKey === accepted || sp.gbifTaxonKey === m.usageKey || sp.gbifTaxonKey === m.speciesKey;
  if (!ok) problems++;
  console.log(
    `${ok ? 'ok  ' : 'DIFF'} ${sp.slug.padEnd(26)} stored ${String(sp.gbifTaxonKey).padEnd(9)} gbif ${String(accepted).padEnd(9)} ${(m.matchType ?? '').padEnd(6)} ${m.status ?? ''}  records ${cap.total ?? '?'}`,
  );
}
if (problems) {
  console.log(`\n${problems} species differ from GBIF's match. Check them by hand; a synonym match can be correct.`);
  process.exitCode = 1;
}
