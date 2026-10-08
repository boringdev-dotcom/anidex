import type { RangeRegion } from './types';

/**
 * State of a range region in a given year: 1 present, -1 lost, 0 not yet occupied.
 * When `from` is later than `to`, the species was lost and later returned (e.g. Sariska: lost 2004, back 2008).
 */
export function regionState(r: RangeRegion, year: number): 1 | 0 | -1 {
  const { from, to } = r;
  if (from != null && to != null && from > to) {
    if (year < to) return 1;
    if (year < from) return -1;
    return 1;
  }
  if (from != null && year < from) return 0;
  if (to != null && year >= to) return -1;
  return 1;
}
