import type { Species } from '../data/types';
import { COUNTRY_CENTROIDS } from '../data/countryCentroids';
import { STATUS_LABEL } from '../data';
import { countryName, fmtEstimate, fmtLength, fmtWeight, fmtYears, mid, type Units } from './format';

/** "/compare/lion-vs-tiger" */
export const pairPath = (a: string, b: string) => `/compare/${a}-vs-${b}`;
/** Shape key for the point cloud: both animals side by side at true scale. */
export const pairShapeKey = (a: string, b: string) => `pair:${a}|${b}`;

export function parsePair(s: string): [string, string] | null {
  const i = s.indexOf('-vs-');
  if (i <= 0) return null;
  const a = s.slice(0, i);
  const b = s.slice(i + 4);
  return a && b && a !== b ? [a, b] : null;
}

// ---------------- real size ----------------

/** Rough adult length by size class, for species whose size class came from research. */
const CLASS_LENGTH_M: Record<string, number> = { xs: 0.04, s: 0.35, m: 1.3, l: 3, xl: 12 };
/** Rough typical length by taxonomic class, for species not researched yet (their size class is a placeholder). */
const TAXON_LENGTH_M: Record<string, number> = {
  Mammalia: 1, Aves: 0.3, Reptilia: 0.8, Amphibia: 0.1, Actinopterygii: 0.4, Elasmobranchii: 2,
  Insecta: 0.03, Arachnida: 0.03, Malacostraca: 0.15, Cephalopoda: 0.6, Gastropoda: 0.05, Clitellata: 0.15, Coelacanthi: 1.8,
};

export interface RealSize {
  /** metres along the measured dimension */
  metres: number;
  /** which model dimension the metres apply to */
  by: 'length' | 'height';
  /** measured standing upright but modelled on all fours (apes) */
  standing: boolean;
  /** from the size class, not from measurements */
  approx: boolean;
}

export function realSize(sp: Species): RealSize {
  const ph = sp.physical;
  if (!ph) {
    const researched = 'research' in sp && !!(sp as { research?: unknown }).research;
    const metres = researched ? CLASS_LENGTH_M[sp.specimen.sizeClass] : TAXON_LENGTH_M[sp.taxonomy.class ?? ''];
    return { metres: metres ?? 1, by: 'length', standing: false, approx: true };
  }
  if (ph.lengthLabel === 'standing height') {
    return { metres: mid(ph.heightM ?? ph.lengthM), by: 'height', standing: ph.heightLabel === 'standing', approx: false };
  }
  // birds are modelled with folded wings, so a wingspan overstates the body: use roughly body length
  const folded = ph.lengthLabel === 'wingspan' && sp.specimen.bodyPlan === 'avian';
  return { metres: mid(ph.lengthM) * (folded ? 0.45 : 1), by: 'length', standing: false, approx: folded };
}

// ---------------- stats ----------------

const STATUS_RANK: Record<string, number> = { LC: 1, NT: 2, VU: 3, EN: 4, CR: 5, EW: 6, EX: 7 };

export interface StatSide {
  /** number the bar is drawn from (null: no data) */
  value: number | null;
  text: string;
}
export interface StatRow {
  key: string;
  label: string;
  a: StatSide;
  b: StatSide;
  /** bars compare on a ladder (status) rather than by size */
  ladder?: boolean;
}

/** The latest global count (regional figures and density indexes don't compare across species). */
export const latestCount = (sp: Species) => (sp.population && !sp.population.scope ? (sp.population.points.at(-1) ?? null) : null);

export function statRows(a: Species, b: Species, units: Units): StatRow[] {
  const side = <T,>(v: T | null | undefined, num: (v: T) => number, text: (v: T) => string): StatSide =>
    v == null ? { value: null, text: '—' } : { value: num(v), text: text(v) };
  const pa = a.physical;
  const pb = b.physical;
  const lengthLabel = pa?.lengthLabel === pb?.lengthLabel && pa?.lengthLabel === 'wingspan' ? 'Wingspan' : 'Length';
  const rows: StatRow[] = [
    { key: 'weight', label: 'Weight', a: side(pa?.weightKg, mid, (r) => fmtWeight(r, units)), b: side(pb?.weightKg, mid, (r) => fmtWeight(r, units)) },
    {
      key: 'length',
      label: lengthLabel,
      a: side(pa && pa.lengthLabel !== 'standing height' ? pa.lengthM : null, mid, (r) => fmtLength(r, units)),
      b: side(pb && pb.lengthLabel !== 'standing height' ? pb.lengthM : null, mid, (r) => fmtLength(r, units)),
    },
    { key: 'height', label: 'Height', a: side(pa?.heightM, mid, (r) => fmtLength(r, units)), b: side(pb?.heightM, mid, (r) => fmtLength(r, units)) },
    { key: 'lifespan', label: 'Lifespan', a: side(pa?.lifespanYrs, mid, fmtYears), b: side(pb?.lifespanYrs, mid, fmtYears) },
    {
      key: 'population',
      label: 'In the wild',
      a: side(latestCount(a), (p) => p.estimate, (p) => `≈ ${fmtEstimate(p.estimate)}`),
      b: side(latestCount(b), (p) => p.estimate, (p) => `≈ ${fmtEstimate(p.estimate)}`),
    },
    {
      key: 'status',
      label: 'Status',
      ladder: true,
      a: side(STATUS_RANK[a.status.iucn] ? a.status.iucn : null, (s) => STATUS_RANK[s], (s) => STATUS_LABEL[s]),
      b: side(STATUS_RANK[b.status.iucn] ? b.status.iucn : null, (s) => STATUS_RANK[s], (s) => STATUS_LABEL[s]),
    },
  ];
  // a row only earns its place when at least one side has data
  return rows.filter((r) => r.a.value != null || r.b.value != null);
}

// ---------------- verdict ----------------

export interface Finding {
  label: string;
  /** which side it is about */
  who: 'a' | 'b';
  detail: string;
}

const words = new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 0 });
function times(r: number): string {
  if (r >= 100000) return `${words.format(r)}×`;
  if (r >= 10) return `${Math.round(r).toLocaleString('en-US')}×`;
  return `${r.toFixed(r < 2 ? 1 : 0)}×`;
}

/** Up to four short findings, the most striking first. */
export function findings(a: Species, b: Species): Finding[] {
  const out: (Finding & { weight: number })[] = [];
  const ratio = (x: number, y: number) => (x >= y ? { r: x / y, who: 'a' as const } : { r: y / x, who: 'b' as const });
  if (a.physical && b.physical) {
    const w = ratio(mid(a.physical.weightKg), mid(b.physical.weightKg));
    if (w.r >= 1.15) out.push({ label: 'Heavier', who: w.who, detail: `about ${times(w.r)} the weight`, weight: Math.log(w.r) * 2 });
    const la = realSize(a).metres;
    const lb = realSize(b).metres;
    const l = ratio(la, lb);
    if (l.r >= 1.15) out.push({ label: 'Bigger', who: l.who, detail: `about ${times(l.r)} the size`, weight: Math.log(l.r) * 1.6 });
    const life = ratio(mid(a.physical.lifespanYrs), mid(b.physical.lifespanYrs));
    if (life.r >= 1.2) {
      const sp = life.who === 'a' ? a : b;
      out.push({ label: 'Lives longer', who: life.who, detail: `${fmtYears(sp.physical!.lifespanYrs)} in the wild`, weight: Math.log(life.r) });
    }
  }
  const ca = latestCount(a);
  const cb = latestCount(b);
  if (ca && cb) {
    const p = ratio(cb.estimate, ca.estimate); // rarer = fewer
    const who = p.who === 'a' ? 'a' : 'b';
    if (p.r >= 1.3) out.push({ label: 'Rarer', who, detail: `about ${times(p.r)} fewer in the wild`, weight: Math.log(p.r) * 1.3 });
  }
  const sa = STATUS_RANK[a.status.iucn] ?? 0;
  const sb = STATUS_RANK[b.status.iucn] ?? 0;
  if (sa && sb && sa !== sb) {
    const who = sa > sb ? 'a' : 'b';
    out.push({ label: 'More threatened', who, detail: STATUS_LABEL[(who === 'a' ? a : b).status.iucn], weight: 2.5 + Math.abs(sa - sb) * 0.3 });
  }
  return out
    .sort((x, y) => y.weight - x.weight)
    .slice(0, 4)
    .map(({ label, who, detail }) => ({ label, who, detail }));
}

// ---------------- ranges ----------------

function inBox(code: string, [w, s, e, n]: [number, number, number, number], pad = 3): boolean {
  const c = COUNTRY_CENTROIDS[code];
  if (!c) return false;
  const [lat, lon] = c;
  return lat >= s - pad && lat <= n + pad && lon >= w - pad && lon <= e + pad;
}

/**
 * Countries both species are recorded in. A country only counts when its centre lies inside both
 * species' core range boxes, which drops zoo and stray records (a lion photographed in Paris).
 */
export function sharedCountries(a: Species, b: Species): string[] {
  const bSet = new Set(b.range.countries ?? []);
  return (a.range.countries ?? []).filter((c) => bSet.has(c) && inBox(c, a.range.bbox) && inBox(c, b.range.bbox));
}

export function overlapSentence(a: Species, b: Species): string {
  const shared = sharedCountries(a, b).map(countryName);
  if (!shared.length) return 'Their ranges don’t overlap. In the wild, these two never meet.';
  if (shared.length === 1) return `Both live in ${shared[0]}.`;
  if (shared.length <= 3) return `Both live in ${shared.slice(0, -1).join(', ')} and ${shared.at(-1)}.`;
  return `Both live in ${shared.slice(0, 3).join(', ')} and ${shared.length - 3} more ${shared.length - 3 === 1 ? 'country' : 'countries'}.`;
}
