/** Shapes returned by the /api endpoints (shared by the server and the client). */
import type { IUCNStatus, Photo, Species } from './types';

export type { Photo };

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
  sources?: { label: string; url: string }[];
  /** on-demand research (auto pages): present once it has run */
  research?: { state: 'done'; at: string };
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

export type ResearchState = 'done' | 'queued' | 'running' | 'failed' | 'capped' | 'unavailable';
export interface ResearchStatusResponse {
  state: ResearchState;
  position?: number;
  error?: string;
}

/** On-demand 3D specimen generation (pages without a model). */
export type SpecimenState = 'ready' | 'queued' | 'generating' | 'failed' | 'capped' | 'unavailable';
export interface SpecimenStatusResponse {
  state: SpecimenState;
  position?: number;
}
