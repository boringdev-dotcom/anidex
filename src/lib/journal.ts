/**
 * The visitor's field journal: every species they have opened, or solved in the daily puzzle,
 * numbered in the order they first met it. Kept in this browser only.
 */
import { useSyncExternalStore } from 'react';
import type { IUCNStatus, Species } from '../data/types';

const STORE = 'anidex-journal';

export type Via = 'viewed' | 'guessed';
export interface Entry {
  slug: string;
  /** order of first meeting, from 1 */
  n: number;
  name: string;
  sci: string;
  cls: string;
  iucn: IUCNStatus | null;
  /** first met, ISO date */
  at: string;
  via: Via[];
}

let cache: Record<string, Entry> | null = null;
const listeners = new Set<() => void>();

function read(): Record<string, Entry> {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(STORE) ?? '{}');
    cache = v && typeof v === 'object' ? v : {};
  } catch {
    cache = {};
  }
  return cache!;
}

function write(all: Record<string, Entry>) {
  cache = all;
  try {
    localStorage.setItem(STORE, JSON.stringify(all));
  } catch {
    /* private mode: kept for this visit only */
  }
  listeners.forEach((l) => l());
}

/** Add a species (or a new way of meeting it). Returns the entry if this was its first time in the journal. */
export function record(sp: Species, via: Via): Entry | null {
  const all = read();
  const had = all[sp.slug];
  if (had) {
    if (!had.via.includes(via)) write({ ...all, [sp.slug]: { ...had, via: [...had.via, via] } });
    return null;
  }
  const entry: Entry = {
    slug: sp.slug,
    n: Object.keys(all).length + 1,
    name: sp.commonName,
    sci: sp.scientificName,
    cls: sp.taxonomy.class,
    iucn: sp.status.iucn ?? null,
    at: new Date().toISOString(),
    via: [via],
  };
  write({ ...all, [sp.slug]: entry });
  return entry;
}

export const entries = () => Object.values(read()).sort((a, b) => b.n - a.n);

export function clearJournal() {
  write({});
}

// keep tabs in step: a page opened in another tab adds to this one's count
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE) return;
    cache = null;
    listeners.forEach((l) => l());
  });
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

/** The journal, re-rendering when it changes. */
export function useJournal(): Record<string, Entry> {
  return useSyncExternalStore(subscribe, read);
}

/** Titles earned by the number of species recorded. */
export const RANKS = [
  { at: 1, title: 'Visitor' },
  { at: 5, title: 'Field assistant' },
  { at: 10, title: 'Naturalist' },
  { at: 25, title: 'Field biologist' },
  { at: 50, title: 'Curator' },
  { at: 100, title: 'Keeper of the Dex' },
];

export function rankFor(count: number) {
  const i = RANKS.findLastIndex((r) => count >= r.at);
  return { current: i >= 0 ? RANKS[i] : null, next: RANKS[i + 1] ?? null };
}
