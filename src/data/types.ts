export type IUCNStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX';
export type SizeClass = 'xs' | 's' | 'm' | 'l' | 'xl';
export type BodyPlan = 'quadruped' | 'biped' | 'serpentine' | 'avian' | 'aquatic' | 'arthropod' | 'amphibian';
export type SpecimenFeature =
  | 'trunk'
  | 'bigEars'
  | 'roundEars'
  | 'pointyEars'
  | 'horns'
  | 'beak'
  | 'flippers'
  | 'gills'
  | 'mane'
  | 'hump';

export type Trend = 'increasing' | 'stable' | 'decreasing' | 'unknown';

export interface Source {
  label: string;
  url: string;
  year?: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface PopulationPoint {
  year: number;
  estimate: number;
  low?: number;
  high?: number;
}

export interface RangeRegion {
  /** Short place name shown in the caption, e.g. "Bali". */
  name: string;
  lat: number;
  lon: number;
  /** Approximate radius of the area in degrees (0.5 to 15). */
  radius: number;
  /** Year the species was first present here, if it arrived or was reintroduced within the timeline. */
  from?: number;
  /** Year the species was lost here (last record, declared extinct, or extirpated).
   *  If `from` is later than `to`, it was lost in `to` and returned in `from`. */
  to?: number;
  /** One sentence shown when the scrubber passes this event. */
  note: string;
}

export interface Species {
  slug: string;
  commonName: string;
  scientificName: string;
  /** One line shown under the hero title. */
  descriptor: string;
  /** Extra search terms. */
  aliases: string[];
  taxonomy: { class: string; order: string; family: string };
  /** GBIF backbone usageKey, pre-resolved and checked by scripts/resolve-gbif.ts */
  gbifTaxonKey: number;

  specimen: {
    sizeClass: SizeClass;
    bodyPlan: BodyPlan;
    /** 0..1 nudges for the procedural body plan */
    proportions?: { length?: number; height?: number; bulk?: number; neck?: number; tail?: number };
    /** Optional silhouette details for the procedural specimen. */
    features?: SpecimenFeature[];
    /** Drop a GLB at /public/models/<slug>.glb and reference it here. Nothing else changes. */
    model?: { url: string; scale?: number; yaw?: number };
  };

  range: {
    summary: string;
    centroid: LatLon;
    /** [west, south, east, north] in degrees. Used to mask out captive records. */
    bbox: [number, number, number, number];
    regions: string[];
    /** ISO-3166 alpha-2 codes */
    countries: string[];
  };

  /**
   * Where the species has disappeared from, or returned to, over time. Drawn on the globe
   * in the population chapter and driven by the year scrubber.
   */
  rangeHistory?: {
    regions: RangeRegion[];
    source: Source;
    note?: string;
  };

  population: {
    unit: string;
    points: PopulationPoint[];
    source: Source;
    note?: string;
  };

  status: {
    iucn: IUCNStatus;
    assessed: number;
    trend: Trend;
    threats: { title: string; detail: string }[];
    source: Source;
  };

  sightings: {
    places: { name: string; country: string; lat: number; lon: number; note?: string }[];
    /** 1..12 */
    bestMonths: number[];
    tip?: string;
  };

  help: {
    actions: { title: string; detail: string; url?: string }[];
    orgs: { name: string; url: string }[];
  };

  /** Slug of the species shown in the footer. */
  next: string;
}
