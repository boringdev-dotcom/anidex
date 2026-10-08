/**
 * Link previews. The site is a single-page app, so crawlers (Slack, iMessage, X, WhatsApp...) only
 * see index.html: fill its title, description and Open Graph / Twitter tags for the requested page.
 * Card images are rendered by scripts/og.ts and served from R2.
 */
import { pool } from './db/pool.ts';

const SITE = 'https://anidex.fyi';
const STATUS: Record<string, string> = {
  LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered',
  EW: 'Extinct in the Wild', EX: 'Extinct', DD: 'Data Deficient', NE: 'Not Evaluated',
};
const DEFAULT = {
  title: 'AniDex — A field guide to the animals we might lose',
  description: 'Search an animal. See where it lives, how many remain, how threatened it is, where to see it, and how to help.',
};

interface Meta {
  title: string;
  description: string;
  image: string | null;
  url: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const imageUrl = (path: string | null | undefined) => (path && process.env.R2_PUBLIC_URL ? `${process.env.R2_PUBLIC_URL}${path}` : null);

let defaultImage: { at: number; path: string | null } | null = null;
async function defaultOg(): Promise<string | null> {
  if (!pool) return null;
  if (!defaultImage || Date.now() - defaultImage.at > 10 * 60_000) {
    const r = await pool.query<{ value: string }>(`select value from meta where key = 'og_default'`).catch(() => null);
    defaultImage = { at: Date.now(), path: r?.rows[0]?.value ?? null };
  }
  return defaultImage.path;
}

interface Row {
  slug: string;
  common_name: string;
  scientific_name: string;
  iucn: string | null;
  og: string | null;
  descriptor: string | null;
}
async function rows(slugs: string[]): Promise<Map<string, Row>> {
  if (!pool) return new Map();
  const r = await pool.query<Row>(
    `select slug, common_name, scientific_name, iucn, og, data->>'descriptor' as descriptor from species where slug = any($1)`,
    [slugs],
  );
  return new Map(r.rows.map((x) => [x.slug, x]));
}

export async function pageMeta(path: string): Promise<Meta> {
  const url = `${SITE}${path === '/' ? '' : path}`;
  const fallback = { ...DEFAULT, image: imageUrl(await defaultOg()), url };
  try {
    const sp = path.match(/^\/species\/([a-z0-9-]+)\/?$/);
    if (sp) {
      const r = (await rows([sp[1]])).get(sp[1]);
      if (!r) return fallback;
      const status = r.iucn ? STATUS[r.iucn] : null;
      return {
        title: `${r.common_name} · AniDex`,
        description: [r.descriptor ?? r.scientific_name, status ? `IUCN status: ${status}.` : ''].filter(Boolean).join(' '),
        image: imageUrl(r.og) ?? fallback.image,
        url,
      };
    }
    const cmp = path.match(/^\/compare\/([a-z0-9-]+)-vs-([a-z0-9-]+)\/?$/);
    if (cmp) {
      const found = await rows([cmp[1], cmp[2]]);
      const a = found.get(cmp[1]);
      const b = found.get(cmp[2]);
      if (!a || !b) return fallback;
      return {
        title: `${a.common_name} vs ${b.common_name} · AniDex`,
        description: `${a.common_name} and ${b.common_name} side by side, to scale: size, weight, lifespan, how many are left, conservation status and where each lives.`,
        image: imageUrl(a.og) ?? fallback.image,
        url,
      };
    }
  } catch (err) {
    console.error('[meta]', (err as Error).message);
  }
  return fallback;
}

/** Put the page's tags into index.html. */
export function injectMeta(html: string, m: Meta): string {
  const tags = [
    `<meta property="og:site_name" content="AniDex" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(m.url)}" />`,
    `<link rel="canonical" href="${esc(m.url)}" />`,
    `<meta name="twitter:card" content="${m.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    ...(m.image
      ? [
          `<meta property="og:image" content="${esc(m.image)}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(m.title.replace(/ · AniDex$/, ''))}, drawn in stipple" />`,
          `<meta name="twitter:image" content="${esc(m.image)}" />`,
        ]
      : []),
  ].join('\n    ');
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(m.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(m.description)}" />`)
    .replace('</head>', `    ${tags}\n  </head>`);
}
