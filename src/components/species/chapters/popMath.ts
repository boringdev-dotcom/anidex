import type { PopulationPoint, Species } from '../../../data/types';
import { regionState } from '../../../data/rangeState';

export function estimateAt(points: PopulationPoint[], year: number): number {
  if (!points.length) return 0;
  if (year <= points[0].year) return points[0].estimate;
  const last = points[points.length - 1];
  if (year >= last.year) return last.estimate;
  let lo = 0;
  let hi = points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (points[mid].year <= year) lo = mid;
    else hi = mid;
  }
  const a = points[lo];
  const b = points[hi];
  return a.estimate + ((b.estimate - a.estimate) * (year - a.year)) / (b.year - a.year);
}

export interface RangeEvent {
  year: number;
  kind: 'lost' | 'gained';
  region: number;
  name: string;
  note: string;
}

/** Every dated change in the species' range, oldest first. */
export function rangeEvents(sp: Species): RangeEvent[] {
  const out: RangeEvent[] = [];
  (sp.rangeHistory?.regions ?? []).slice(0, 16).forEach((r, i) => {
    if (r.from != null) out.push({ year: r.from, kind: 'gained', region: i, name: r.name, note: r.note });
    if (r.to != null) out.push({ year: r.to, kind: 'lost', region: i, name: r.name, note: r.note });
  });
  return out.sort((a, b) => a.year - b.year || (a.kind === 'lost' ? -1 : 1));
}

/** Occupied / lost counts at a given year. */
export function rangeCounts(sp: Species, year: number) {
  let present = 0;
  let lost = 0;
  let total = 0;
  for (const r of sp.rangeHistory?.regions.slice(0, 16) ?? []) {
    const st = regionState(r, year);
    if (st !== 0) total++;
    if (st === -1) lost++;
    if (st === 1) present++;
  }
  return { present, lost, total };
}
