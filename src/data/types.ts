export type IUCNStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR' | 'EW' | 'EX' | 'DD' | 'NE';
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

/** A subspecies or distinct population shown in the species' "family" chapter. */
export interface Variant {
  slug: string;
  name: string;
  /** Traditional scientific name, e.g. "Panthera tigris altaica". */
  trinomial: string;
  /** Modern grouping, e.g. "mainland" or "sunda" for tigers. */
  group?: string;
  alive: boolean;
  /** Approximate year it was gone (extinct ones). */
  extinctBy?: number | null;
  wild?: { estimate: number | null; year: number | null; label: string };
  /** Short status label, e.g. "Critically endangered". */
  status: string;
  /** Adult male total length in metres [min, max]. Also scales the specimen. */
  lengthM: [number, number];
  weightKg: [number, number];
  coat: string;
  range: string;
  centroid?: LatLon;
  source?: Source;
  /** Overrides on top of the parent species' specimen (its own GLB, prompt detail, tilt). */
  specimen?: {
    model?: { url: string; scale?: number; yaw?: number };
    promptDetail?: string;
    tilt?: number;
  };
}

/** Body measurements for the hero's stats row, measurement lines and size comparison. */
export interface Physical {
  weightKg: [number, number];
  weightNote?: string;
  heightM: [number, number] | null;
  heightLabel: 'at shoulder' | 'standing' | null;
  lengthM: [number, number];
  lengthLabel: string;
  lifespanYrs: [number, number];
  fact: string;
  compare: 'human' | 'hand';
  source: Source;
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
    /** Extra visual detail for the model-generation prompt (scripts/generate-models.ts). */
    promptDetail?: string;
    /** Exposure tweak per theme (about -0.3 to 0.3) on top of the automatic exposure. Positive = more ink. */
    tone?: { dark?: number; light?: number };
    /** Camera tilt in radians so flat animals (butterflies, whales) are seen partly from above. Default 0.08. */
    tilt?: number;
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

  /** Absent when no published time series exists (most auto pages). */
  population?: {
    unit: string;
    points: PopulationPoint[];
    source: Source;
    note?: string;
  };

  status: {
    iucn: IUCNStatus;
    assessed?: number;
    trend: Trend;
    threats: { title: string; detail: string }[];
    source: Source;
  };

  sightings?: {
    places: { name: string; country: string; lat: number; lon: number; note?: string }[];
    /** 1..12 */
    bestMonths: number[];
    tip?: string;
  };

  help?: {
    actions: { title: string; detail: string; url?: string }[];
    orgs: { name: string; url: string }[];
  };

  physical?: Physical;

  /** Subspecies or populations, shown in their own chapter when present. */
  variants?: Variant[];
  /** Short taxonomy note shown above the variants. */
  taxonomyNote?: string;

  /** Slug of the species shown in the footer (curated pages); auto pages use the closest relative. */
  next?: string;
}
