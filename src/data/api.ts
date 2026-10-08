/** Shapes returned by the /api endpoints (shared by the server and the client). */
import type { IUCNStatus, Species } from './types';

export interface Photo {
  url: string;
  thumb?: string;
  credit?: string;
  license?: string;
  source?: string;
}

/** Lightweight species row for search, lists and previews. */
export interface SpeciesSummary {
  slug: string;
  commonName: string;
  scientificName: string;
  iucn: IUCNStatus | null;
  class: string | null;
  order: string | null;
  family: string | null;
  tier: 'deep' | 'auto';
  photo: Photo | null;
  /** enough to render the stipple specimen for hover previews */
  specimen: Species['specimen'];
}

/** Full species page payload. */
export interface SpeciesRecord extends Species {
  tier: 'deep' | 'auto';
  photo: Photo | null;
  needsReview: boolean;
  /** text summary and its attribution, for auto pages */
  summary?: { text: string; source: string; url: string; license: string } | null;
  sources?: { label: string; url: string }[];
  /** the species the footer leads to: the curated `next`, or the closest relative */
  nextSummary?: SpeciesSummary | null;
}

export interface ListResponse {
  items: SpeciesSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Stats {
  total: number;
  threatened: number;
  byClass: { name: string; count: number }[];
}
