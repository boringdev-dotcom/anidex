import type { PopulationPoint } from '../../../data/types';

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

export function maxEstimate(points: PopulationPoint[]): number {
  return Math.max(...points.map((p) => p.estimate), 1);
}
