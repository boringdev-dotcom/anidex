/**
 * On-demand species research with Claude (web search + structured output).
 * Fills the sections open data can't: threats, how to help, where and when to see it,
 * body measurements and a field note, each backed by sources.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Species } from '../src/data/types.ts';

/** Claude Haiku 5.5 by default; RESEARCH_MODEL can switch it (e.g. claude-opus-5-5 for a deeper pass). */
export const RESEARCH_MODEL = process.env.RESEARCH_MODEL ?? 'claude-haiku-5-5';

/**
 * List prices in $ per million tokens, for the cost log. Haiku 5.5 is priced by prompt length:
 * prompts over 100k tokens pay the higher tier. Web search is $10 per 1,000 searches on every model.
 */
const PRICES: Record<string, { tiers: { upTo: number; input: number; output: number; cacheRead: number }[] }> = {
  'claude-haiku-5-5': {
    tiers: [
      { upTo: 100_000, input: 0.1, output: 0.5, cacheRead: 0.01 },
      { upTo: Infinity, input: 0.5, output: 2.5, cacheRead: 0.05 },
    ],
  },
  'claude-sonnet-5-5': { tiers: [{ upTo: Infinity, input: 2, output: 10, cacheRead: 0.1 }] },
  'claude-opus-5-5': { tiers: [{ upTo: Infinity, input: 4, output: 20, cacheRead: 0.2 }] },
};
const SEARCH_PRICE = 10 / 1000;
/** Web searches per species (main call; the population call gets half). Searches are most of the cost. */
const MAX_SEARCHES = Math.max(1, Number(process.env.RESEARCH_MAX_SEARCHES ?? 6));

function requestCost(model: string, u: Anthropic.Beta.BetaUsage): number {
  const table = PRICES[model] ?? PRICES['claude-opus-5-5'];
  const prompt = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  const t = table.tiers.find((x) => prompt <= x.upTo) ?? table.tiers[table.tiers.length - 1];
  return (
    ((u.input_tokens ?? 0) * t.input +
      (u.cache_creation_input_tokens ?? 0) * t.input * 1.25 +
      (u.cache_read_input_tokens ?? 0) * t.cacheRead +
      (u.output_tokens ?? 0) * t.output) /
      1e6 +
    (u.server_tool_use?.web_search_requests ?? 0) * SEARCH_PRICE
  );
}

export const researchEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const range = { type: 'object', additionalProperties: false, required: ['min', 'max'], properties: { min: { type: 'number' }, max: { type: 'number' } } };
const source = { type: 'object', additionalProperties: false, required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } };
// Kept flat on purpose: optional values use 0 or "" instead of null unions, because every anyOf
// grows the compiled output grammar and the API rejects grammars that get too large.
const POPULATION = {
  type: 'object',
  additionalProperties: false,
  required: ['unit', 'points', 'source', 'note'],
  properties: {
    unit: { type: 'string' },
    points: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['year', 'estimate', 'low', 'high'],
        properties: { year: { type: 'integer' }, estimate: { type: 'number' }, low: { type: 'number' }, high: { type: 'number' } },
      },
    },
    source,
    note: { type: 'string' },
  },
};
const RANGE_HISTORY = {
  type: 'object',
  additionalProperties: false,
  required: ['regions', 'source'],
  properties: {
    regions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'lat', 'lon', 'radius', 'from', 'to', 'note'],
        properties: { name: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, radius: { type: 'number' }, from: { type: 'integer' }, to: { type: 'integer' }, note: { type: 'string' } },
      },
    },
    source,
  },
};
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'threats', 'help', 'sightings', 'physical', 'specimen', 'sources'],
  properties: {
    status: {
      type: 'object',
      additionalProperties: false,
      required: ['trend', 'assessedYear'],
      properties: {
        trend: { type: 'string', enum: ['increasing', 'decreasing', 'stable', 'unknown'] },
        assessedYear: { type: 'integer' },
      },
    },
    threats: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['title', 'detail'], properties: { title: { type: 'string' }, detail: { type: 'string' } } },
    },
    help: {
      type: 'object',
      additionalProperties: false,
      required: ['actions', 'orgs'],
      properties: {
        actions: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'detail', 'url'],
            properties: { title: { type: 'string' }, detail: { type: 'string' }, url: { type: 'string' } },
          },
        },
        orgs: {
          type: 'array',
          items: { type: 'object', additionalProperties: false, required: ['name', 'url'], properties: { name: { type: 'string' }, url: { type: 'string' } } },
        },
      },
    },
    sightings: {
      type: 'object',
      additionalProperties: false,
      required: ['places', 'bestMonths', 'tip'],
      properties: {
        places: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'country', 'lat', 'lon', 'note'],
            properties: { name: { type: 'string' }, country: { type: 'string' }, lat: { type: 'number' }, lon: { type: 'number' }, note: { type: 'string' } },
          },
        },
        bestMonths: { type: 'array', items: { type: 'integer' } },
        tip: { type: 'string' },
      },
    },
    physical: {
      type: 'object',
      additionalProperties: false,
      required: ['weightKg', 'weightNote', 'heightM', 'heightLabel', 'lengthM', 'lengthLabel', 'lifespanYrs', 'fact', 'compare'],
      properties: {
        weightKg: range,
        weightNote: { type: 'string' },
        heightM: range,
        heightLabel: { type: 'string', enum: ['at shoulder', 'standing', 'none'] },
        lengthM: range,
        lengthLabel: { type: 'string', enum: ['nose to tail tip', 'head and body', 'wingspan', 'total length', 'standing height', 'shell length'] },
        lifespanYrs: range,
        fact: { type: 'string' },
        compare: { type: 'string', enum: ['human', 'hand'] },
      },
    },
    specimen: {
      type: 'object',
      additionalProperties: false,
      required: ['sizeClass', 'length', 'height', 'bulk', 'neck', 'tail'],
      properties: {
        sizeClass: { type: 'string', enum: ['xs', 's', 'm', 'l', 'xl'] },
        length: { type: 'number' },
        height: { type: 'number' },
        bulk: { type: 'number' },
        neck: { type: 'number' },
        tail: { type: 'number' },
      },
    },
    sources: { type: 'array', items: source },
  },
} as const;

/** Measurements alone: the follow-up when the main research comes back without usable ones. */
const PHYSICAL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['physical', 'sources'],
  properties: { physical: SCHEMA.properties.physical, sources: { type: 'array', items: source } },
} as const;

/**
 * Population and range history, researched in a second call alongside the main one (one schema
 * with everything compiles to a grammar the API rejects as too large). Also used by the backfill.
 */
const POPULATION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['population', 'rangeHistory', 'sources'],
  properties: { population: POPULATION, rangeHistory: RANGE_HISTORY, sources: { type: 'array', items: source } },
} as const;

interface Range {
  min: number;
  max: number;
}

export interface ResearchOutput {
  status: { trend: Species['status']['trend']; assessedYear: number };
  threats: { title: string; detail: string }[];
  help: { actions: { title: string; detail: string; url: string }[]; orgs: { name: string; url: string }[] };
  sightings: { places: { name: string; country: string; lat: number; lon: number; note: string }[]; bestMonths: number[]; tip: string };
  physical: Omit<NonNullable<Species['physical']>, 'weightKg' | 'heightM' | 'heightLabel' | 'lengthM' | 'lifespanYrs' | 'source'> & {
    heightLabel: 'at shoulder' | 'standing' | 'none';
    weightKg: Range;
    heightM: Range;
    lengthM: Range;
    lifespanYrs: Range;
    weightNote: string;
  };
  specimen: { sizeClass: Species['specimen']['sizeClass']; length: number; height: number; bulk: number; neck: number; tail: number };
  sources: { label: string; url: string }[];
}

interface HistoryOutput {
  population: PopulationOutput;
  rangeHistory: RangeHistoryOutput;
  sources: { label: string; url: string }[];
}

interface PopulationOutput {
  unit: string;
  /** low and high are 0 when no range was published */
  points: { year: number; estimate: number; low: number; high: number }[];
  source: { label: string; url: string };
  note: string;
}

interface RangeHistoryOutput {
  /** from and to are 0 when not applicable */
  regions: { name: string; lat: number; lon: number; radius: number; from: number; to: number; note: string }[];
  source: { label: string; url: string };
}

export interface ResearchResult {
  at: string;
  model: string;
  costUsd: number;
  /** set once population and range history have been researched */
  historyAt?: string;
  fields: Partial<Species>;
  sources: { label: string; url: string }[];
}

const SYSTEM = `You research animal species for AniDex, a public wildlife encyclopedia. Readers trust it, so accuracy matters more than completeness.

Use web search to verify every fact. Prefer the IUCN Red List, national wildlife agencies, peer-reviewed papers, museums and zoos (Smithsonian, San Diego Zoo Wildlife Alliance), Animal Diversity Web, and major conservation NGOs. Never invent numbers, places or organisations. If something is genuinely unknown, use the closest well-supported value and keep the text honest about it (for example an empty threats list, or trend "unknown").

Unknown or not-applicable values: use 0 for numbers and years, an empty string for text and links, an empty list for lists, and {"min":0,"max":0} for a range. Never put a guess in their place.

Writing style: plain, factual sentences. Each threat detail, action detail, place note and the field note is one sentence, under 120 characters. Never use em dashes or en dashes; use commas, periods or "to".

Fields:
- status: the IUCN population trend and the year of the latest assessment, from the Red List page if you can reach it.
- threats: the 3 to 5 main threats.
- help: 3 or 4 concrete things an ordinary person can do, plus 2 or 3 reputable organisations working on this species or its habitat (real URLs).
- sightings: 3 to 5 real, publicly visitable places where people reliably see it in the wild (national parks, reserves, reefs, birding sites), with coordinates to 2 decimals; best months to see it there (1 to 12); one tip explaining the timing. If wild viewing is not realistic (very rare, deep sea, extinct), return an empty places list and say why in the tip.
- physical: typical adult ranges, not records. If no published weight exists (common for insects), give {"min":0,"max":0} rather than an estimate. For extinct species, use the published estimates from skeletons, specimens and historical accounts (they exist for most, e.g. the dodo's weight). Units: kilograms, metres, years. Shoulder height for four-legged animals, standing height for upright ones, no height (heightM 0 to 0, heightLabel "none") for fish, snakes, insects and similar. Length includes the tail unless lengthLabel says otherwise; wingspan for birds and butterflies is fine. lifespanYrs is lifespan in the wild ({"min":0,"max":0} if unknown). fact is one striking, verified fact about its body or physiology. compare is "hand" only if adults are under 0.4 m long.
- specimen: shape hints for a stylised 3D figure, each 0 to 1: length (body length relative to height), height (leg length), bulk (heaviness), neck, tail; sizeClass xs (insect) to xl (elephant, whale).
- population: the global wild population over time, built ONLY from published estimates (IUCN assessments past and present, range-wide surveys, census reports, peer-reviewed papers). The point is to show the trend, so search specifically for historical figures: older IUCN assessments, past range-wide surveys, and review papers that tabulate earlier estimates. Most well-studied species have several across decades. One point per year with a real published figure, oldest first, ideally 3 to 8 points. estimate is the published figure, or the midpoint of a published range with low and high set to that range (low and high are 0 when no range was published). Prefer figures that count the same thing; if the record mixes total and mature-individual counts, use what was published and explain it in note. unit is short, under 40 characters, e.g. "lions in the wild" or "mature individuals". note is one sentence on how reliable and comparable the numbers are (empty if there are no points). Use a single point only when no earlier figure was ever published. If no credible global figure exists, return an empty points list. Never interpolate, extrapolate or round an estimate into existence.
- rangeHistory: places where the species was lost (extirpated, last recorded) or came back (reintroduced, recolonised) since about 1800, for the globe. Each region is a short place name, a centre with coordinates to 1 decimal, a radius in degrees (0.5 to 15) covering the area, the year it was lost (to) and/or the year it returned (from; later than to if it was lost then returned), using 0 for a year that does not apply, and one sentence. Include 2 to 4 regions where it still lives with both years 0, so the map shows what remains. Up to 12 regions. If nothing is documented, return an empty list. source is the main page you used (empty label and url if none).
- sources: every page you relied on, label plus URL.`;

type ResearchInput = Species & { summary?: { text: string } | null };

const describe = (sp: ResearchInput) => `Common name: ${sp.commonName}
Scientific name: ${sp.scientificName}
Class / order / family: ${sp.taxonomy.class} / ${sp.taxonomy.order} / ${sp.taxonomy.family}
IUCN category already on the page: ${sp.status.iucn}
Range summary: ${sp.range.summary}
${sp.summary?.text ? `Wikipedia summary: ${sp.summary.text}` : ''}`;

/** One structured research call with web search; resumes server-side pauses and totals the cost. */
async function ask<T>(user: string, schema: unknown, maxSearches: number): Promise<{ out: T; costUsd: number; model: string }> {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: user }];
  let response: Anthropic.Beta.BetaMessage | null = null;
  let cost = 0;
  // server-side web search can pause after its iteration limit; resume a few times at most
  for (let turn = 0; turn < 4; turn++) {
    const stream = client.beta.messages.stream({
      model: RESEARCH_MODEL,
      max_tokens: 32000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: (process.env.RESEARCH_EFFORT as 'low' | 'medium' | 'high' | undefined) ?? 'medium', format: { type: 'json_schema', schema: schema as Record<string, unknown> } },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: maxSearches }],
      messages,
    });
    response = await stream.finalMessage();
    cost += requestCost(response.model in PRICES ? response.model : RESEARCH_MODEL, response.usage);
    if (response.stop_reason !== 'pause_turn') break;
    messages.push({ role: 'assistant', content: response.content });
  }
  if (!response) throw new Error('no response');
  if (response.stop_reason === 'refusal') throw new Error('research declined by the model');
  if (response.stop_reason === 'max_tokens') throw new Error('research output was cut off');
  const text = response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return { out: JSON.parse(text) as T, costUsd: Math.round(cost * 1000) / 1000, model: response.model };
}

export async function researchSpecies(sp: ResearchInput): Promise<ResearchResult> {
  const [main, history] = await Promise.all([
    ask<ResearchOutput>(
      `Research this species and fill every field. Leave population and range history aside; they are researched separately.\n\n${describe(sp)}`,
      SCHEMA,
      MAX_SEARCHES,
    ),
    // the page is still useful without a population chart, so this one may fail on its own
    ask<HistoryOutput>(historyPrompt(sp), POPULATION_SCHEMA, Math.ceil(MAX_SEARCHES / 2)).catch((err) => {
      console.warn(`[research] population for ${sp.slug} failed: ${(err as Error).message}`);
      return null;
    }),
  ]);
  const at = new Date().toISOString();
  if (process.env.RESEARCH_DEBUG) console.log('[research] raw physical', JSON.stringify(main.out.physical));
  let base = toFields(sp, main.out);
  let extraCost = 0;
  // the model sometimes leaves weight or length at 0; one short follow-up asks for the measurements alone
  if (!base.fields.physical?.weightKg) {
    const retry = await ask<Pick<ResearchOutput, 'physical' | 'sources'>>(
      `Research only the physical measurements of this species (plus the sources you used). Weight and length must be real published ranges, never 0.\n\n${describe(sp)}`,
      PHYSICAL_SCHEMA,
      3,
    ).catch(() => null);
    if (retry) {
      extraCost = retry.costUsd;
      if (process.env.RESEARCH_DEBUG) console.log('[research] retry physical', JSON.stringify(retry.out.physical));
      const redo = toFields(sp, { ...main.out, physical: retry.out.physical, sources: [...main.out.sources, ...retry.out.sources] });
      // keep the follow-up only if it knows more (a weight, or any measurements at all)
      if (redo.fields.physical && (redo.fields.physical.weightKg || !base.fields.physical)) {
        base = { fields: { ...base.fields, physical: redo.fields.physical }, sources: redo.sources };
      }
    }
  }
  const seen = new Set<string>();
  const sources = [...base.sources, ...cleanSources(history?.out.sources ?? [])].filter((x) => !seen.has(x.url) && seen.add(x.url));
  return {
    at,
    ...(history ? { historyAt: at } : {}),
    model: main.model,
    costUsd: Math.round((main.costUsd + (history?.costUsd ?? 0) + extraCost) * 1000) / 1000,
    fields: { ...base.fields, ...(history ? historyFields(history.out) : {}) },
    sources,
  };
}

const historyPrompt = (sp: ResearchInput) =>
  `Research only the population and rangeHistory fields for this species (plus the sources you used).\n\n${describe(sp)}`;

/** Population and range history only, for species researched before those fields existed. */
export async function researchPopulation(sp: ResearchInput) {
  const { out, costUsd, model } = await ask<HistoryOutput>(historyPrompt(sp), POPULATION_SCHEMA, Math.ceil(MAX_SEARCHES / 2));
  return { at: new Date().toISOString(), model, costUsd, fields: historyFields(out), sources: cleanSources(out.sources) };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
const pair = (r: Range | null): [number, number] | null =>
  r && Number.isFinite(r.min) && Number.isFinite(r.max) && r.max > 0 ? [Math.min(r.min, r.max), Math.max(r.min, r.max)] : null;
const short = (s: string, n = 160) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s).replace(/[–—]/g, ', ');

/** Turn the model's output into the page's own Species fields (validated and tidied). */
export function toFields(sp: Species, o: ResearchOutput): Pick<ResearchResult, 'fields' | 'sources'> {
  const p = o.physical;
  // a weight the model itself flags as an unverified guess doesn't get published
  const unverified = /unverified|(search|tools?)[^.]{0,20}(unavailable|failed)|not a (verified|published)|confirm before/i.test(p.weightNote ?? '');
  const weight = unverified ? null : pair(p.weightKg);
  // upright animals sometimes come back with a standing height but no length: measure them by height
  const standingOnly = !pair(p.lengthM) && p.heightLabel === 'standing' && !!pair(p.heightM);
  const length = pair(p.lengthM) ?? (standingOnly ? pair(p.heightM) : null);
  const life = pair(p.lifespanYrs);
  // length is the core; an unknown weight (many butterflies) or wild lifespan (sunfish, dodo) shouldn't drop the rest
  const physical = length
      ? {
          weightKg: weight ?? undefined,
          weightNote: weight && p.weightNote && p.weightNote.length <= 40 ? p.weightNote : undefined,
          heightM: pair(p.heightM),
          heightLabel: pair(p.heightM) && p.heightLabel !== 'none' ? p.heightLabel : null,
          lengthM: length,
          lengthLabel: standingOnly ? 'standing height' : p.lengthLabel,
          lifespanYrs: life ?? undefined,
          fact: short(p.fact, 140),
          compare: p.compare,
          source: o.sources[0] ?? { label: 'Researched sources', url: '' },
        }
      : undefined;
  const places = o.sightings.places
    .filter((x) => Math.abs(x.lat) <= 90 && Math.abs(x.lon) <= 180 && x.name)
    .slice(0, 6)
    .map((x) => ({ ...x, note: short(x.note, 140) }));
  const months = [...new Set(o.sightings.bestMonths.filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b);
  const fields: Partial<Species> = {
    status: {
      ...sp.status,
      trend: o.status.trend,
      ...(o.status.assessedYear ? { assessed: o.status.assessedYear } : {}),
      threats: o.threats.slice(0, 5).map((t) => ({ title: short(t.title, 60), detail: short(t.detail) })),
    },
    help: {
      actions: o.help.actions.slice(0, 4).map((a) => ({ title: short(a.title, 60), detail: short(a.detail), ...(a.url ? { url: a.url } : {}) })),
      orgs: o.help.orgs.filter((x) => /^https?:\/\//.test(x.url)).slice(0, 3),
    },
    sightings: places.length ? { places, bestMonths: months.length ? months : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], tip: short(o.sightings.tip, 200) } : undefined,
    physical,
    specimen: {
      ...sp.specimen,
      sizeClass: o.specimen.sizeClass,
      proportions: {
        length: clamp01(o.specimen.length),
        height: clamp01(o.specimen.height),
        bulk: clamp01(o.specimen.bulk),
        neck: clamp01(o.specimen.neck),
        tail: clamp01(o.specimen.tail),
      },
    },
  };
  return { fields, sources: cleanSources(o.sources) };
}

const isUrl = (u: string | undefined | null): u is string => !!u && /^https?:\/\//.test(u);
const cleanSources = (list: { label: string; url: string }[]) => list.filter((s) => isUrl(s.url)).slice(0, 14);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Validate the population series and range history (drop anything that can't be drawn honestly). */
export function historyFields(o: Pick<HistoryOutput, 'population' | 'rangeHistory'>): Pick<Species, 'population' | 'rangeHistory'> {
  const thisYear = new Date().getFullYear();
  const out: Pick<Species, 'population' | 'rangeHistory'> = {};
  const p = o.population;
  if (p && isUrl(p.source?.url)) {
    const byYear = new Map<number, NonNullable<Species['population']>['points'][number]>();
    for (const pt of p.points ?? []) {
      const year = num(pt.year);
      const est = num(pt.estimate);
      if (year == null || est == null || est <= 0 || year < 1700 || year > thisYear) continue;
      const low = num(pt.low);
      const high = num(pt.high);
      byYear.set(Math.round(year), {
        year: Math.round(year),
        estimate: est,
        ...(low != null && high != null && low <= est && est <= high && low > 0 ? { low, high } : {}),
      });
    }
    const points = [...byYear.values()].sort((a, b) => a.year - b.year).slice(-12);
    if (points.length && p.unit?.trim()) {
      out.population = {
        // long units carry their caveats in parentheses; the note already says that
        unit: short(p.unit.trim().length > 40 ? p.unit.replace(/\s*\([^)]*\)/g, '').trim() : p.unit.trim(), 48),
        points,
        source: { label: short(p.source.label || 'Published estimates', 160), url: p.source.url },
        ...(p.note ? { note: short(p.note, 220) } : {}),
      };
    }
  }
  const h = o.rangeHistory;
  const regions = (h?.regions ?? [])
    .filter((r) => r.name && Math.abs(r.lat) <= 90 && Math.abs(r.lon) <= 180)
    .map((r) => {
      const from = num(r.from);
      const to = num(r.to);
      return {
        name: short(r.name, 40),
        lat: Math.round(r.lat * 10) / 10,
        lon: Math.round(r.lon * 10) / 10,
        radius: Math.min(15, Math.max(0.5, num(r.radius) ?? 2)),
        ...(from != null && from >= 1700 && from <= thisYear ? { from: Math.round(from) } : {}),
        ...(to != null && to >= 1700 && to <= thisYear ? { to: Math.round(to) } : {}),
        note: short(r.note, 140),
      };
    })
    .slice(0, 12);
  // only worth a map when something actually changed
  if (regions.some((r) => r.from != null || r.to != null)) {
    const src = h.source && isUrl(h.source.url) ? h.source : out.population?.source;
    if (src) out.rangeHistory = { regions, source: { label: short(src.label, 160), url: src.url } };
  }
  return out;
}
