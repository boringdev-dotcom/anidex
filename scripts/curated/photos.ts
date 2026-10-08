/**
 * Adds a Wikipedia lead photo (with its Wikimedia Commons credit and licence) and the Wikipedia
 * summary to each curated species JSON, for the About chapter. Safe to re-run.
 *   node --experimental-strip-types scripts/curated/photos.ts [slug ...]
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getJSON } from '../ingest/http.ts';

const dir = join(import.meta.dirname, '..', '..', 'src', 'data', 'species');
const only = process.argv.slice(2);
// image URLs now carry tracking parameters (?utm_source=...); keep the bare file URL
const bare = (u?: string) => u?.split('?')[0];
const stripHtml = (s?: string) => (s ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

interface Summary {
  type: string;
  title: string;
  extract: string;
  originalimage?: { source: string };
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page: string } };
}

for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const file = join(dir, f);
  const sp = JSON.parse(readFileSync(file, 'utf8'));
  if (only.length && !only.includes(sp.slug)) continue;
  // the scientific name redirects to the species' article (Panthera tigris -> Tiger)
  const article = sp.wikipediaTitle ?? sp.scientificName.replace(/ /g, '_');
  const s = await getJSON<Summary>(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(article)}`, { source: 'wiki-summary' });
  if (!s?.extract || s.type === 'disambiguation') {
    console.log(`${sp.slug.padEnd(26)} no article for ${article}`);
    continue;
  }
  const url = s.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(s.title)}`;
  sp.summary = { text: s.extract, source: 'Wikipedia', url, license: 'CC BY-SA 4.0' };
  const img = bare(s.originalimage?.source);
  if (img) {
    const name = decodeURIComponent(img.split('/').pop()!.replace(/^\d+px-/, ''));
    const meta = await getJSON<{ query?: { pages?: Record<string, { imageinfo?: { extmetadata?: Record<string, { value: string }>; descriptionurl?: string }[] }> } }>(
      `https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&titles=${encodeURIComponent('File:' + name)}`,
      { source: 'commons' },
    );
    const info = Object.values(meta?.query?.pages ?? {})[0]?.imageinfo?.[0];
    const em = info?.extmetadata ?? {};
    sp.photo = { url: img, thumb: bare(s.thumbnail?.source), credit: stripHtml(em.Artist?.value) || undefined, license: em.LicenseShortName?.value, source: info?.descriptionurl };
  }
  writeFileSync(file, JSON.stringify(sp, null, 2) + '\n');
  console.log(`${sp.slug.padEnd(26)} ${s.title} · photo ${sp.photo ? `${sp.photo.license ?? '?'} by ${sp.photo.credit?.slice(0, 40) ?? '?'}` : 'none'}`);
}
