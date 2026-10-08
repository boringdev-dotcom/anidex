/**
 * On-demand species research with Claude (web search + structured output).
 * Fills the sections open data can't: threats, how to help, where and when to see it,
 * body measurements and a field note, each backed by sources.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { Species } from '../src/data/types.ts';

export const RESEARCH_MODEL = 'claude-opus-5-5';
// Claude Opus 5.5 list prices ($ per token) and web search ($ per search), for the cost log
const PRICE = { input: 4 / 1e6, output: 20 / 1e6, cacheRead: 0.2 / 1e6, search: 10 / 1000 };

export const researchEnabled = () => !!process.env.ANTHROPIC_API_KEY;

const range = { type: 'object', additionalProperties: false, required: ['min', 'max'], properties: { min: { type: 'number' }, max: { type: 'number' } } };
const nullableRange = { anyOf: [range, { type: 'null' }] };
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
        assessedYear: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
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
            properties: { title: { type: 'string' }, detail: { type: 'string' }, url: { anyOf: [{ type: 'string' }, { type: 'null' }] } },
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
        weightNote: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        heightM: nullableRange,
        heightLabel: { anyOf: [{ type: 'string', enum: ['at shoulder', 'standing'] }, { type: 'null' }] },
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
    sources: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['label', 'url'], properties: { label: { type: 'string' }, url: { type: 'string' } } },
    },
  },
} as const;

interface Range {
  min: number;
  max: number;
}

export interface ResearchOutput {
  status: { trend: Species['status']['trend']; assessedYear: number | null };
  threats: { title: string; detail: string }[];
  help: { actions: { title: string; detail: string; url: string | null }[]; orgs: { name: string; url: string }[] };
  sightings: { places: { name: string; country: string; lat: number; lon: number; note: string }[]; bestMonths: number[]; tip: string };
  physical: Omit<NonNullable<Species['physical']>, 'weightKg' | 'heightM' | 'lengthM' | 'lifespanYrs' | 'source'> & {
    weightKg: Range;
    heightM: Range | null;
    lengthM: Range;
    lifespanYrs: Range;
    weightNote: string | null;
  };
  specimen: { sizeClass: Species['specimen']['sizeClass']; length: number; height: number; bulk: number; neck: number; tail: number };
  sources: { label: string; url: string }[];
}

export interface ResearchResult {
  at: string;
  model: string;
  costUsd: number;
  fields: Partial<Species>;
  sources: { label: string; url: string }[];
}

const SYSTEM = `You research animal species for AniDex, a public wildlife encyclopedia. Readers trust it, so accuracy matters more than completeness.

Use web search to verify every fact. Prefer the IUCN Red List, national wildlife agencies, peer-reviewed papers, museums and zoos (Smithsonian, San Diego Zoo Wildlife Alliance), Animal Diversity Web, and major conservation NGOs. Never invent numbers, places or organisations. If something is genuinely unknown, use the closest well-supported value and keep the text honest about it (for example an empty threats list, or trend "unknown").

Writing style: plain, factual sentences. Each threat detail, action detail, place note and the field note is one sentence, under 120 characters. Never use em dashes or en dashes; use commas, periods or "to".

Fields:
- status: the IUCN population trend and the year of the latest assessment, from the Red List page if you can reach it.
- threats: the 3 to 5 main threats.
- help: 3 or 4 concrete things an ordinary person can do, plus 2 or 3 reputable organisations working on this species or its habitat (real URLs).
- sightings: 3 to 5 real, publicly visitable places where people reliably see it in the wild (national parks, reserves, reefs, birding sites), with coordinates to 2 decimals; best months to see it there (1 to 12); one tip explaining the timing. If wild viewing is not realistic (very rare, deep sea, extinct), return an empty places list and say why in the tip.
- physical: typical adult ranges, not records. Units: kilograms, metres, years. Shoulder height for four-legged animals, standing height for upright ones, null height for fish, snakes, insects and similar. Length includes the tail unless lengthLabel says otherwise; wingspan for birds and butterflies is fine. lifespanYrs is lifespan in the wild. fact is one striking, verified fact about its body or physiology. compare is "hand" only if adults are under 0.4 m long.
- specimen: shape hints for a stylised 3D figure, each 0 to 1: length (body length relative to height), height (leg length), bulk (heaviness), neck, tail; sizeClass xs (insect) to xl (elephant, whale).
- sources: every page you relied on, label plus URL.`;

export async function researchSpecies(sp: Species & { summary?: { text: string } | null }): Promise<ResearchResult> {
  const client = new Anthropic();
  const user = `Research this species and fill every field.

Common name: ${sp.commonName}
Scientific name: ${sp.scientificName}
Class / order / family: ${sp.taxonomy.class} / ${sp.taxonomy.order} / ${sp.taxonomy.family}
IUCN category already on the page: ${sp.status.iucn}
Range summary: ${sp.range.summary}
${sp.summary?.text ? `Wikipedia summary: ${sp.summary.text}` : ''}`;

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
      output_config: { effort: (process.env.RESEARCH_EFFORT as 'low' | 'medium' | 'high' | undefined) ?? 'medium', format: { type: 'json_schema', schema: SCHEMA as unknown as Record<string, unknown> } },
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 12 }],
      messages,
    });
    response = await stream.finalMessage();
    const u = response.usage;
    cost +=
      (u.input_tokens ?? 0) * PRICE.input +
      (u.cache_creation_input_tokens ?? 0) * PRICE.input * 1.25 +
      (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead +
      (u.output_tokens ?? 0) * PRICE.output +
      (u.server_tool_use?.web_search_requests ?? 0) * PRICE.search;
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
  const out = JSON.parse(text) as ResearchOutput;
  return { at: new Date().toISOString(), model: response.model, costUsd: Math.round(cost * 1000) / 1000, ...toFields(sp, out) };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));
const pair = (r: Range | null): [number, number] | null =>
  r && Number.isFinite(r.min) && Number.isFinite(r.max) && r.max > 0 ? [Math.min(r.min, r.max), Math.max(r.min, r.max)] : null;
const short = (s: string, n = 160) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s).replace(/[–—]/g, ', ');

/** Turn the model's output into the page's own Species fields (validated and tidied). */
export function toFields(sp: Species, o: ResearchOutput): Pick<ResearchResult, 'fields' | 'sources'> {
  const p = o.physical;
  const weight = pair(p.weightKg);
  const length = pair(p.lengthM);
  const life = pair(p.lifespanYrs);
  const physical =
    weight && length && life
      ? {
          weightKg: weight,
          weightNote: p.weightNote && p.weightNote.length <= 40 ? p.weightNote : undefined,
          heightM: pair(p.heightM),
          heightLabel: p.heightM && p.heightLabel ? p.heightLabel : null,
          lengthM: length,
          lengthLabel: p.lengthLabel,
          lifespanYrs: life,
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
  const sources = o.sources.filter((s) => /^https?:\/\//.test(s.url)).slice(0, 12);
  return { fields, sources };
}
