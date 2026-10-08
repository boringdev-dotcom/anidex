import type { Species } from './types';

const modules = import.meta.glob<Species>('./species/*.json', { eager: true, import: 'default' });

const bySlug = new Map<string, Species>();
for (const sp of Object.values(modules)) bySlug.set(sp.slug, sp);

/** Order follows the `next` chain from the first species, then anything left over. */
function buildOrder(): Species[] {
  const out: Species[] = [];
  const seen = new Set<string>();
  let cur = bySlug.get('bengal-tiger') ?? bySlug.values().next().value;
  while (cur && !seen.has(cur.slug)) {
    out.push(cur);
    seen.add(cur.slug);
    cur = bySlug.get(cur.next);
  }
  const rest = [...bySlug.values()].filter((s) => !seen.has(s.slug)).sort((a, b) => a.commonName.localeCompare(b.commonName));
  return out.concat(rest);
}

export const allSpecies: Species[] = buildOrder();

export function getSpecies(slug: string | undefined): Species | undefined {
  return slug ? bySlug.get(slug) : undefined;
}

export function indexOf(slug: string): number {
  return allSpecies.findIndex((s) => s.slug === slug);
}

export function nextSpecies(sp: Species): Species {
  return bySlug.get(sp.next) ?? allSpecies[(indexOf(sp.slug) + 1) % allSpecies.length];
}

export const STATUS_ORDER = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'] as const;

export const STATUS_LABEL: Record<string, string> = {
  LC: 'Least Concern',
  NT: 'Near Threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically Endangered',
  EW: 'Extinct in the Wild',
  EX: 'Extinct',
};

export const STATUS_SHORT: Record<string, string> = {
  LC: 'Least concern',
  NT: 'Near threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically endangered',
  EW: 'Extinct in the wild',
  EX: 'Extinct',
};
