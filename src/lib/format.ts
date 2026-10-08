const nf = new Intl.NumberFormat('en-US');
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

export const fmt = (n: number) => nf.format(Math.round(n));
export const fmtCompact = (n: number) => compact.format(n);

/** Round to a sensible number of significant figures for an estimate readout. */
export function fmtEstimate(n: number): string {
  if (n >= 100000) return fmt(Math.round(n / 1000) * 1000);
  if (n >= 10000) return fmt(Math.round(n / 100) * 100);
  if (n >= 100) return fmt(Math.round(n / 10) * 10);
  if (n >= 10) return fmt(Math.round(n));
  return n.toFixed(n < 1 ? 2 : 1);
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

/** Turn [11,12,1,2,3] into "Nov to Mar" style ranges, handling wraparound. */
export function monthRanges(months: number[]): string {
  const set = new Set(months);
  if (set.size === 12) return 'Year-round';
  if (set.size === 0) return '';
  // find a start month whose previous month is not in the set
  const runs: [number, number][] = [];
  const visited = new Set<number>();
  for (let m = 1; m <= 12; m++) {
    if (!set.has(m) || visited.has(m)) continue;
    const prev = m === 1 ? 12 : m - 1;
    if (set.has(prev)) continue;
    let end = m;
    visited.add(m);
    while (set.has(end === 12 ? 1 : end + 1) && !visited.has(end === 12 ? 1 : end + 1)) {
      end = end === 12 ? 1 : end + 1;
      visited.add(end);
    }
    runs.push([m, end]);
  }
  return runs
    .map(([a, b]) => (a === b ? MONTHS_SHORT[a - 1] : `${MONTHS_SHORT[a - 1]} to ${MONTHS_SHORT[b - 1]}`))
    .join(', ');
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export function countryName(code: string): string {
  try {
    return regionNames?.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
