/**
 * Build the "auto" species set from open data.
 *   npm run ingest              (default 200 species)
 *   npm run ingest -- --total 400
 *
 * 1. Wikidata: species with an IUCN status, a GBIF ID and an English Wikipedia article, ranked by
 *    how many language Wikipedias cover them (a good proxy for "well known").
 * 2. GBIF: taxonomy (animals only), Red List category, names, a range from occurrences, countries.
 * 3. Wikipedia: summary text, lead photo; Wikimedia Commons: photo author and licence.
 *
 * Output: src/data/auto/species.jsonl.gz, loaded into Postgres by the server on deploy.
 * All HTTP is cached in scripts/.cache/ingest, so reruns only fetch what is missing.
 */
import { writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { getJSON, pool } from './http.ts';
import type { BodyPlan, IUCNStatus, SizeClass, Species } from '../../src/data/types.ts';
import type { Photo, SpeciesRecord } from '../../src/data/api.ts';

const root = join(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const TOTAL = Number(args[args.indexOf('--total') + 1]) || 200;

// share of the total per group, so the set isn't all big mammals
const QUOTA: [string, number][] = [
  ['mammal', 0.35],
  ['bird', 0.25],
  ['reptile', 0.11],
  ['fish', 0.13],
  ['amphibian', 0.06],
  ['insect', 0.05],
  ['other', 0.05],
];

const REPTILE_ORDERS = new Set(['Squamata', 'Testudines', 'Crocodylia', 'Rhynchocephalia']);
const FISH_CLASSES = new Set(['Actinopterygii', 'Elasmobranchii', 'Chondrichthyes', 'Holocephali', 'Sarcopterygii', 'Myxini', 'Petromyzonti', 'Cephalaspidomorphi']);
const SNAKE_FAMILIES = new Set(['Colubridae', 'Elapidae', 'Viperidae', 'Pythonidae', 'Boidae', 'Natricidae', 'Lamprophiidae', 'Typhlopidae', 'Leptotyphlopidae', 'Homalopsidae', 'Dipsadidae', 'Acrochordidae']);
const EXCLUDE = new Set(['Homo sapiens']);

interface Candidate {
  scientificName: string;
  gbif: number;
  sitelinks: number;
  article: string;
  wikidata: string;
}

interface GbifSpecies {
  key: number;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  canonicalName?: string;
  taxonomicStatus?: string;
  acceptedKey?: number;
}

/** GBIF's current backbone leaves ray-finned fish without a class and ranks reptiles by order. */
function isRayFinnedFish(t: GbifSpecies) {
  return !t.class && t.phylum === 'Chordata' && /iformes$/.test(t.order ?? '');
}

function displayClass(t: GbifSpecies): string {
  const g = group(t);
  if (g === 'reptile') return 'Reptilia';
  if (isRayFinnedFish(t)) return 'Actinopterygii';
  return t.class ?? t.phylum ?? 'Animalia';
}

function group(t: GbifSpecies): string {
  if (isRayFinnedFish(t)) return 'fish';
  if (t.class === 'Mammalia') return 'mammal';
  if (t.class === 'Aves') return 'bird';
  if (t.class === 'Reptilia' || REPTILE_ORDERS.has(t.order ?? '') || t.class === 'Squamata' || t.class === 'Testudines' || t.class === 'Crocodylia') return 'reptile';
  if (t.class === 'Amphibia') return 'amphibian';
  if (FISH_CLASSES.has(t.class ?? '')) return 'fish';
  if (t.class === 'Insecta') return 'insect';
  return 'other';
}

function bodyPlan(t: GbifSpecies): BodyPlan {
  const g = group(t);
  if (g === 'mammal') {
    if (t.order === 'Cetacea' || t.order === 'Sirenia' || (t.order === 'Artiodactyla' && /dae$/.test(t.family ?? '') && ['Balaenopteridae', 'Delphinidae', 'Physeteridae', 'Balaenidae', 'Monodontidae', 'Phocoenidae', 'Ziphiidae', 'Eschrichtiidae', 'Iniidae', 'Platanistidae', 'Pontoporiidae', 'Lipotidae', 'Kogiidae'].includes(t.family ?? ''))) return 'aquatic';
    if (t.order === 'Primates') return 'biped';
    if (t.order === 'Chiroptera') return 'avian';
    return 'quadruped';
  }
  if (g === 'bird') return t.order === 'Sphenisciformes' ? 'biped' : 'avian';
  if (g === 'reptile') return SNAKE_FAMILIES.has(t.family ?? '') ? 'serpentine' : 'quadruped';
  if (g === 'amphibian') return 'amphibian';
  if (g === 'fish') return 'aquatic';
  if (g === 'insect' || t.class === 'Arachnida' || t.class === 'Malacostraca') return 'arthropod';
  return 'aquatic';
}

const STATUS: Record<string, IUCNStatus> = { LC: 'LC', NT: 'NT', VU: 'VU', EN: 'EN', CR: 'CR', EW: 'EW', EX: 'EX', DD: 'DD', NE: 'NE' };

const slugify = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const D2R = Math.PI / 180;
/** Centre of the densest 15-degree area of records (a plain mean drifts poleward for widespread species). */
function densestCentre(pts: { lat: number; lon: number }[]) {
  const cell = (p: { lat: number; lon: number }) => `${Math.floor((p.lat + 90) / 15)}:${Math.floor((p.lon + 180) / 15)}`;
  const counts = new Map<string, number>();
  for (const p of pts) counts.set(cell(p), (counts.get(cell(p)) ?? 0) + 1);
  const [best] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const [r, c] = best.split(':').map(Number);
  const near = pts.filter((p) => {
    const [pr, pc] = cell(p).split(':').map(Number);
    const dc = Math.min(Math.abs(pc - c), 24 - Math.abs(pc - c));
    return Math.abs(pr - r) <= 1 && dc <= 1;
  });
  return meanLatLon(near);
}

function meanLatLon(pts: { lat: number; lon: number }[]) {
  let x = 0, y = 0, z = 0;
  for (const p of pts) {
    x += Math.cos(p.lat * D2R) * Math.cos(p.lon * D2R);
    y += Math.cos(p.lat * D2R) * Math.sin(p.lon * D2R);
    z += Math.sin(p.lat * D2R);
  }
  const lon = Math.atan2(y, x) / D2R;
  const lat = Math.atan2(z, Math.hypot(x, y)) / D2R;
  return { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };
}
const pct = (arr: number[], p: number) => {
  const a = [...arr].sort((m, n) => m - n);
  return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * (a.length - 1))))];
};

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
const country = (c: string) => {
  try {
    return regionNames.of(c) ?? c;
  } catch {
    return c;
  }
};

function firstSentences(text: string, max = 190): string {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  let out = '';
  for (const s of sentences) {
    if ((out + s).length > max && out) break;
    out += s;
  }
  out = out.trim();
  return out.length > max + 40 ? out.slice(0, max).replace(/\s+\S*$/, '') + '…' : out;
}

// image URLs now carry tracking parameters (?utm_source=...); keep the bare file URL
const bare = (u?: string) => u?.split('?')[0];
const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------------------------------

async function candidates(): Promise<Candidate[]> {
  const q = `SELECT ?item ?name ?gbif ?sitelinks ?article WHERE {
    ?item wdt:P105 wd:Q7432 ; wdt:P141 ?status ; wdt:P846 ?gbif ; wdt:P225 ?name ; wikibase:sitelinks ?sitelinks .
    FILTER(?sitelinks >= 25)
    ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  }`;
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`;
  const d = await getJSON<{ results: { bindings: Record<string, { value: string }>[] } }>(url, { source: 'wikidata', accept: 'application/sparql-results+json', ttlDays: 7 });
  if (!d) throw new Error('Wikidata query failed');
  const seen = new Set<number>();
  return d.results.bindings
    .map((b) => ({
      scientificName: b.name.value,
      gbif: Number(b.gbif.value),
      sitelinks: Number(b.sitelinks.value),
      article: decodeURIComponent(b.article.value.split('/wiki/')[1]),
      wikidata: b.item.value.split('/').pop()!,
    }))
    .filter((c) => Number.isFinite(c.gbif) && !EXCLUDE.has(c.scientificName))
    .sort((a, b) => b.sitelinks - a.sitelinks)
    .filter((c) => (seen.has(c.gbif) ? false : (seen.add(c.gbif), true)));
}

async function build(c: Candidate, t: GbifSpecies): Promise<SpeciesRecord | null> {
  const key = t.key;
  const [iucn, occ, facets, vern, summary] = await Promise.all([
    getJSON<{ code?: string }>(`https://api.gbif.org/v1/species/${key}/iucnRedListCategory`, { source: 'gbif-iucn' }),
    getJSON<{ results: { decimalLatitude?: number; decimalLongitude?: number }[] }>(
      `https://api.gbif.org/v1/occurrence/search?taxonKey=${key}&hasCoordinate=true&hasGeospatialIssue=false&occurrenceStatus=PRESENT&basisOfRecord=HUMAN_OBSERVATION&basisOfRecord=MACHINE_OBSERVATION&basisOfRecord=OCCURRENCE&limit=300`,
      { source: 'gbif-occ' },
    ),
    getJSON<{ facets: { counts: { name: string; count: number }[] }[] }>(
      `https://api.gbif.org/v1/occurrence/search?taxonKey=${key}&facet=country&facetLimit=200&limit=0&basisOfRecord=HUMAN_OBSERVATION&basisOfRecord=MACHINE_OBSERVATION&basisOfRecord=OCCURRENCE`,
      { source: 'gbif-countries' },
    ),
    getJSON<{ results: { vernacularName: string; language?: string }[] }>(`https://api.gbif.org/v1/species/${key}/vernacularNames?limit=200`, { source: 'gbif-vern' }),
    getJSON<{ title: string; description?: string; extract?: string; thumbnail?: { source: string }; originalimage?: { source: string }; content_urls?: { desktop?: { page?: string } }; type?: string }>(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(c.article)}`,
      { source: 'wiki-summary' },
    ),
  ]);
  if (!summary?.extract || summary.type === 'disambiguation') return null;

  // names: the Wikipedia title is the common name readers know
  const title = summary.title.replace(/\s*\(.*?\)\s*/g, '').trim();
  const commonName = title === c.scientificName ? (vern?.results.find((v) => v.language === 'eng')?.vernacularName ?? title) : title;
  const eng = [...new Set((vern?.results ?? []).filter((v) => v.language === 'eng').map((v) => v.vernacularName.trim()))]
    .filter((n) => n.toLowerCase() !== commonName.toLowerCase())
    .slice(0, 6);

  // range from wild occurrence points: robust bbox (5th to 95th percentile) and a spherical mean centroid
  const pts = (occ?.results ?? [])
    .filter((r) => r.decimalLatitude != null && r.decimalLongitude != null)
    .map((r) => ({ lat: r.decimalLatitude!, lon: r.decimalLongitude! }));
  const counts = facets?.facets?.[0]?.counts ?? [];
  if (pts.length < 5 && counts.length === 0) return null;
  const centroid = pts.length ? densestCentre(pts) : { lat: 0, lon: 0 };
  const lats = pts.map((p) => p.lat);
  const lons = pts.map((p) => p.lon);
  const pad = 6;
  const bbox: [number, number, number, number] = pts.length >= 5
    ? [Math.max(-180, pct(lons, 0.03) - pad), Math.max(-90, pct(lats, 0.03) - pad), Math.min(180, pct(lons, 0.97) + pad), Math.min(90, pct(lats, 0.97) + pad)]
    : [-180, -90, 180, 90];
  const countries = counts.slice(0, 40).map((x) => x.name);
  const top = countries.slice(0, 3).map(country);
  const rangeSummary = countries.length
    ? `Recorded in ${counts.length} ${counts.length === 1 ? 'country' : 'countries'}${top.length ? `, most often in ${top.length > 1 ? `${top.slice(0, -1).join(', ')} and ${top[top.length - 1]}` : top[0]}` : ''}.`
    : 'Recorded mostly at sea, away from any one country.';

  // photo credit from Wikimedia Commons
  let photo: Photo | null = null;
  const img = bare(summary.originalimage?.source);
  if (img) {
    const file = decodeURIComponent(img.split('/').pop()!.replace(/^\d+px-/, ''));
    const meta = await getJSON<{ query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value: string }>; descriptionurl?: string }[] }> } }>(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=${encodeURIComponent('File:' + file)}`,
      { source: 'commons' },
    );
    const info = Object.values(meta?.query?.pages ?? {})[0]?.imageinfo?.[0];
    const em = info?.extmetadata ?? {};
    photo = {
      url: img,
      thumb: bare(summary.thumbnail?.source),
      credit: stripHtml(em.Artist?.value) || undefined,
      license: em.LicenseShortName?.value,
      source: info?.descriptionurl,
    };
  }

  const code = STATUS[iucn?.code ?? ''] ?? 'NE';
  const wikiUrl = summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(c.article)}`;
  const gbifUrl = `https://www.gbif.org/species/${key}`;
  const sp: Species = {
    slug: '',
    commonName,
    scientificName: t.canonicalName ?? c.scientificName,
    descriptor: firstSentences(summary.extract),
    aliases: eng,
    taxonomy: { class: displayClass(t), order: t.order ?? '', family: t.family ?? '' },
    gbifTaxonKey: key,
    specimen: { sizeClass: 'm' as SizeClass, bodyPlan: bodyPlan(t) },
    range: {
      summary: rangeSummary,
      centroid,
      bbox,
      regions: top,
      countries,
    },
    status: {
      iucn: code,
      trend: 'unknown',
      threats: [],
      source: { label: 'IUCN Red List category via GBIF', url: gbifUrl },
    },
  };
  return {
    ...sp,
    tier: 'auto',
    photo,
    needsReview: false,
    summary: { text: summary.extract, source: 'Wikipedia', url: wikiUrl, license: 'CC BY-SA 4.0' },
    sources: [
      { label: `Wikipedia: ${summary.title}`, url: wikiUrl },
      { label: 'GBIF species page', url: gbifUrl },
      { label: 'Wikidata', url: `https://www.wikidata.org/wiki/${c.wikidata}` },
    ],
    // popularity: Wikipedia language coverage
    ...({ popularity: c.sitelinks, wikidataId: c.wikidata } as object),
  } as SpeciesRecord;
}

// ------------------------------------------------------------------------------------------

const curated = readdirSync(join(root, 'src', 'data', 'species'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(root, 'src', 'data', 'species', f), 'utf8')) as Species);
const curatedKeys = new Set(curated.map((s) => s.gbifTaxonKey));
const curatedNames = new Set(curated.map((s) => s.scientificName.split(' ').slice(0, 2).join(' ')));
const taken = new Set(curated.map((s) => s.slug));

const all = await candidates();
console.log(`${all.length} Wikidata candidates`);

// classify the most-covered candidates until every quota has room to choose from
const want = new Map(QUOTA.map(([g, share]) => [g, Math.round(share * TOTAL)]));
const pick = new Map<string, { c: Candidate; t: GbifSpecies }[]>(QUOTA.map(([g]) => [g, []]));
const scan = all.slice(0, Math.min(all.length, TOTAL * 12));
const taxa = await pool(scan, 8, (c) => getJSON<GbifSpecies>(`https://api.gbif.org/v1/species/${c.gbif}`, { source: 'gbif-species' }), 'gbif taxa');
scan.forEach((c, i) => {
  const t = taxa[i];
  if (!t || t.kingdom !== 'Animalia') return;
  if (curatedKeys.has(t.key) || curatedNames.has(c.scientificName.split(' ').slice(0, 2).join(' '))) return;
  pick.get(group(t))!.push({ c, t });
});

const chosen: { c: Candidate; t: GbifSpecies }[] = [];
for (const [g, n] of want) chosen.push(...pick.get(g)!.slice(0, Math.ceil(n * 1.25))); // headroom for drops
console.log('pool by group:', [...pick].map(([g, l]) => `${g} ${l.length}`).join(', '));

const built = await pool(chosen, 6, ({ c, t }) => build(c, t).catch((e) => (console.warn('\n', c.scientificName, e.message), null)), 'species');

// keep the quotas, in popularity order within each group
const out: SpeciesRecord[] = [];
for (const [g, n] of want) {
  const recs = chosen
    .map((x, i) => ({ g: group(x.t), r: built[i] }))
    .filter((x) => x.g === g && x.r)
    .map((x) => x.r!)
    .slice(0, n);
  out.push(...recs);
}
for (const r of out) {
  let slug = slugify(r.commonName) || slugify(r.scientificName);
  if (taken.has(slug)) slug = slugify(`${r.commonName} ${r.scientificName}`);
  taken.add(slug);
  r.slug = slug;
}

const file = join(root, 'src', 'data', 'auto', 'species.jsonl.gz');
writeFileSync(file, gzipSync(out.map((r) => JSON.stringify(r)).join('\n') + '\n'));
const byGroup = QUOTA.map(([g]) => `${g} ${out.filter((r) => group({ key: 0, class: r.taxonomy.class, order: r.taxonomy.order, family: r.taxonomy.family, phylum: 'Chordata' }) === g).length}`).join(', ');
console.log(`wrote ${out.length} species to src/data/auto/species.jsonl.gz (${byGroup})`);
console.log('photos:', out.filter((r) => r.photo).length, '| statuses:', JSON.stringify(out.reduce<Record<string, number>>((a, r) => ((a[r.status.iucn] = (a[r.status.iucn] ?? 0) + 1), a), {})));
