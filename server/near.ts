/**
 * "What lives near me": which AniDex species have recent wild observations around a point.
 *
 * One GBIF occurrence query, faceted by species, over a box around the visitor's (already rounded)
 * location, restricted to our species and to field observations (no zoo, museum or fossil records).
 * Results are kept only where the point also lies in the species' core range box, which drops the
 * odd escaped pet or mislabelled record.
 */
import { repo } from './repo.ts';
import type { SpeciesSummary } from '../src/data/api.ts';

const GBIF = 'https://api.gbif.org/v1/occurrence/search';
const UA = 'AniDex/1.0 (https://github.com/boringdev-dotcom/anidex)';

export interface NearResult {
  /** half-width of the searched box, roughly, in km */
  radiusKm: number;
  items: (SpeciesSummary & { records: number })[];
}

let keysCache: { at: number; list: Awaited<ReturnType<typeof repo.ranges>> } | null = null;
async function speciesRanges() {
  if (!keysCache || Date.now() - keysCache.at > 10 * 60_000) keysCache = { at: Date.now(), list: await repo.ranges() };
  return keysCache.list;
}

/** results per rounded cell, for a day (the same city asks the same question) */
const cache = new Map<string, { at: number; value: NearResult }>();

/** GBIF rejects URLs past about 4 KB, so the species keys go out in chunks and the counts merge. */
async function facetCounts(lat: number, lon: number, deg: number, keys: number[]): Promise<Map<number, number>> {
  const chunks: number[][] = [];
  for (let i = 0; i < keys.length; i += 100) chunks.push(keys.slice(i, i + 100));
  const maps = await Promise.all(chunks.map((c) => facetChunk(lat, lon, deg, c)));
  return new Map(maps.flatMap((m) => [...m]));
}

async function facetChunk(lat: number, lon: number, deg: number, keys: number[]): Promise<Map<number, number>> {
  const dLon = Math.min(deg / Math.max(0.2, Math.cos((lat * Math.PI) / 180)), 20);
  const p = new URLSearchParams({
    limit: '0',
    hasCoordinate: 'true',
    hasGeospatialIssue: 'false',
    occurrenceStatus: 'PRESENT',
    year: `2000,${new Date().getFullYear()}`,
    decimalLatitude: `${Math.max(-90, lat - deg)},${Math.min(90, lat + deg)}`,
    decimalLongitude: `${Math.max(-180, lon - dLon)},${Math.min(180, lon + dLon)}`,
    facet: 'speciesKey',
    facetLimit: '300',
  });
  for (const b of ['HUMAN_OBSERVATION', 'MACHINE_OBSERVATION', 'OBSERVATION']) p.append('basisOfRecord', b);
  for (const k of keys) p.append('taxonKey', String(k));
  const res = await fetch(`${GBIF}?${p}`, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`GBIF ${res.status}`);
  const body = (await res.json()) as { facets?: { counts: { name: string; count: number }[] }[] };
  return new Map((body.facets?.[0]?.counts ?? []).map((c) => [Number(c.name), c.count]));
}

/**
 * Birds are photographed far more than anything else, so a pure ranking is a wall of birds.
 * Keep the order by records, but never let one class run more than two in a row while others wait.
 */
function mixClasses<T extends { r: { cls: string | null } }>(list: T[]): T[] {
  const out: T[] = [];
  const rest = [...list];
  while (rest.length) {
    const last2 = out.slice(-2).map((x) => x.r.cls);
    const runOf = last2.length === 2 && last2[0] === last2[1] ? last2[0] : undefined;
    const i = runOf === undefined ? 0 : Math.max(0, rest.findIndex((x) => x.r.cls !== runOf));
    out.push(rest.splice(i, 1)[0]);
  }
  return out;
}

const inBox = (lat: number, lon: number, [w, s, e, n]: [number, number, number, number], pad: number) =>
  lat >= s - pad && lat <= n + pad && lon >= w - pad && lon <= e + pad;

export async function nearMe(lat: number, lon: number): Promise<NearResult> {
  const cell = `${lat}|${lon}`;
  const hit = cache.get(cell);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.value;

  const ranges = await speciesRanges();
  const byKey = new Map(ranges.map((r) => [r.gbifKey, r]));
  let result: NearResult = { radiusKm: 0, items: [] };
  // about 110 km first; quiet places (oceans, deserts) get a wider look
  for (const deg of [1, 3]) {
    const counts = await facetCounts(lat, lon, deg, [...byKey.keys()]);
    const found = mixClasses(
      [...counts]
        .map(([key, records]) => ({ r: byKey.get(key), records }))
        .filter((x): x is { r: NonNullable<typeof x.r>; records: number } => !!x.r && inBox(lat, lon, x.r.bbox, 2 + deg))
        .sort((a, b) => b.records - a.records)
        .slice(0, 24),
    );
    const summaries = new Map((await repo.summaries(found.map((f) => f.r.slug))).map((s) => [s.slug, s]));
    result = {
      radiusKm: Math.round(deg * 111),
      items: found.flatMap((f) => {
        const s = summaries.get(f.r.slug);
        return s ? [{ ...s, records: f.records }] : [];
      }),
    };
    if (result.items.length >= 3) break;
  }
  if (cache.size > 2000) cache.clear();
  cache.set(cell, { at: Date.now(), value: result });
  return result;
}
