/**
 * Client data layer. Species live in the API; pages load them through `fetchSpecies` (router loaders),
 * which fills an in-memory cache. Rendering and the 3D scene then read synchronously with `getSpecies`.
 */
import type { Species, Variant } from './types';
import type { ListResponse, ResearchStatusResponse, SpeciesRecord, SpeciesSummary, Stats } from './api';

const full = new Map<string, SpeciesRecord>();
const summaries = new Map<string, SpeciesSummary>();
const inflight = new Map<string, Promise<SpeciesRecord | null>>();
/** slugs whose next load must bypass the browser's HTTP cache (research just landed) */
const stale = new Set<string>();

export class Moved extends Error {
  constructor(public to: string) {
    super(`moved to ${to}`);
  }
}

async function getJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  if (r.status === 301) throw new Moved(((await r.json()) as { redirect: string }).redirect);
  if (!r.ok) throw Object.assign(new Error(`${r.status} ${url}`), { status: r.status });
  return r.json() as Promise<T>;
}

export function rememberSummaries(items: (SpeciesSummary | null | undefined)[]) {
  for (const s of items) if (s) summaries.set(s.slug, s);
}

/** Load (and cache) a full species. Resolves null for unknown slugs; throws Moved for renamed ones. */
export function fetchSpecies(slug: string): Promise<SpeciesRecord | null> {
  const hit = full.get(slug);
  if (hit) return Promise.resolve(hit);
  let p = inflight.get(slug);
  if (!p) {
    const reload = stale.delete(slug);
    p = getJSON<SpeciesRecord>(`/api/species/${encodeURIComponent(slug)}`, reload ? { cache: 'reload' } : undefined)
      .then((sp) => {
        full.set(sp.slug, sp);
        rememberSummaries([sp.nextSummary]);
        return sp;
      })
      .catch((e) => {
        if (e instanceof Moved) throw e;
        if ((e as { status?: number }).status === 404) return null;
        throw e;
      })
      .finally(() => inflight.delete(slug));
    inflight.set(slug, p);
  }
  return p;
}

/** Drop a cached species so the next load refetches it (after research lands). */
export function forgetSpecies(slug: string) {
  full.delete(slug);
  stale.add(slug);
}

export async function researchStatus(slug: string, start = false): Promise<ResearchStatusResponse> {
  return getJSON<ResearchStatusResponse>(`/api/species/${encodeURIComponent(slug)}/research`, start ? { method: 'POST' } : undefined);
}

/** Warm the cache, e.g. on hover, so the page opens instantly. */
export const prefetchSpecies = (slug: string) => void fetchSpecies(slug).catch(() => {});

export async function searchSpecies(q: string, signal?: AbortSignal): Promise<SpeciesSummary[]> {
  if (!q.trim()) return [];
  const { items } = await getJSON<{ items: SpeciesSummary[] }>(`/api/search?q=${encodeURIComponent(q)}`, { signal });
  rememberSummaries(items);
  return items;
}

export async function listSpecies(params: Record<string, string | number | undefined>): Promise<ListResponse> {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][]);
  const res = await getJSON<ListResponse>(`/api/species?${qs}`);
  rememberSummaries(res.items);
  return res;
}

export async function relatedSpecies(slug: string, limit = 6): Promise<SpeciesSummary[]> {
  const { items } = await getJSON<{ items: SpeciesSummary[] }>(`/api/species/${encodeURIComponent(slug)}/related?limit=${limit}`);
  rememberSummaries(items);
  return items;
}

let statsP: Promise<Stats> | null = null;
export const fetchStats = () => (statsP ??= getJSON<Stats>('/api/stats').catch((e) => ((statsP = null), Promise.reject(e))));

/** Synchronous read of a loaded species (pages and the 3D scene). */
export function getSpecies(slug: string | undefined | null): SpeciesRecord | undefined {
  return slug ? full.get(slug) : undefined;
}

export function getSummary(slug: string): SpeciesSummary | undefined {
  return summaries.get(slug);
}

/** Shape keys are a species slug, or "<species>--<variant>" for a subspecies. */
export const variantKey = (sp: Species, v: Variant) => `${sp.slug}--${v.slug}`;

export interface SpecimenSource {
  key: string;
  specimen: Species['specimen'];
}

/** Resolve a shape key to the specimen settings to build (variants inherit their species' body plan). */
export function getSpecimenSource(key: string): SpecimenSource | undefined {
  const [base, sub] = key.split('--');
  const sp = full.get(base);
  const specimen = sp?.specimen ?? summaries.get(base)?.specimen;
  if (!specimen) return undefined;
  if (!sub) return { key, specimen };
  const v = sp?.variants?.find((x) => x.slug === sub);
  if (!v) return { key, specimen };
  return { key, specimen: { ...specimen, model: v.specimen?.model ?? specimen.model, tilt: v.specimen?.tilt ?? specimen.tilt } };
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
  DD: 'Data Deficient',
  NE: 'Not Evaluated',
};

export const STATUS_SHORT: Record<string, string> = {
  LC: 'Least concern',
  NT: 'Near threatened',
  VU: 'Vulnerable',
  EN: 'Endangered',
  CR: 'Critically endangered',
  EW: 'Extinct in the wild',
  EX: 'Extinct',
  DD: 'Data deficient',
  NE: 'Not evaluated',
};
