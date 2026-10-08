import type { Species } from '../data/types';

function scoreField(q: string, text: string): number {
  const t = text.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80 - t.length * 0.1;
  const words = t.split(/[\s-]+/);
  if (words.some((w) => w.startsWith(q))) return 65 - t.length * 0.1;
  const idx = t.indexOf(q);
  if (idx >= 0) return 50 - idx;
  // subsequence match with gap penalty
  let ti = 0;
  let gaps = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found < 0) return 0;
    gaps += found - ti;
    ti = found + 1;
  }
  return Math.max(1, 30 - gaps * 2);
}

export function searchSpecies(list: Species[], query: string, limit = 6): Species[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return list
    .map((s) => {
      const fields = [s.commonName, s.scientificName, ...s.aliases, s.taxonomy.family, s.taxonomy.order];
      const score = Math.max(...fields.map((f, i) => scoreField(q, f) * (i < 2 ? 1 : 0.85)));
      return { s, score };
    })
    .filter((r) => r.score > 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.s);
}
