import type pg from 'pg';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { curatedDir, loadCurated, searchText } from '../repo.ts';
import type { SpeciesRecord } from '../../src/data/api.ts';

/** Curated species rank above every auto page in "popular" ordering. */
const CURATED_POPULARITY = 1e9;

/** Upsert the hand-curated "deep" species from src/data/species. Runs on every server start. */
export async function seedCurated(db: pg.Pool): Promise<number> {
  const all = loadCurated();
  for (const sp of all) {
    const names = [...sp.aliases, ...(sp.variants ?? []).map((v) => v.name)];
    await db.query(
      `insert into species (slug, scientific_name, common_name, tier, class, "order", family, genus, gbif_key, iucn, popularity, aliases, search_text, data, updated_at)
       values ($1,$2,$3,'deep',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       on conflict (slug) do update set
         scientific_name = excluded.scientific_name, common_name = excluded.common_name, tier = 'deep',
         class = excluded.class, "order" = excluded."order", family = excluded.family, genus = excluded.genus,
         gbif_key = excluded.gbif_key, iucn = excluded.iucn, popularity = excluded.popularity, aliases = excluded.aliases,
         search_text = excluded.search_text, data = excluded.data, needs_review = false, updated_at = now()`,
      [
        sp.slug,
        sp.scientificName,
        sp.commonName,
        sp.taxonomy.class,
        sp.taxonomy.order,
        sp.taxonomy.family,
        sp.scientificName.split(' ')[0],
        sp.gbifTaxonKey,
        sp.status.iucn,
        CURATED_POPULARITY,
        names,
        searchText({ commonName: sp.commonName, scientificName: sp.scientificName, aliases: names }),
        sp,
      ],
    );
  }
  return all.length;
}

/** The open-data species set built by scripts/ingest (src/data/auto/species.jsonl.gz). */
export function autoFile(): string {
  return join(curatedDir(), '..', 'auto', 'species.jsonl.gz');
}

export function loadAuto(): SpeciesRecord[] {
  const f = autoFile();
  if (!existsSync(f)) return [];
  return gunzipSync(readFileSync(f))
    .toString('utf8')
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as SpeciesRecord);
}

/**
 * Upsert the auto species when the data file changed since the last load. Never overwrites a curated
 * (deep) row, and keeps research that was added on demand (stored under data.research).
 */
export async function seedAuto(db: pg.Pool): Promise<string> {
  const f = autoFile();
  if (!existsSync(f)) return 'no auto data file';
  const hash = createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16);
  const prev = await db.query<{ value: string }>(`select value from meta where key = 'auto_hash'`);
  if (prev.rows[0]?.value === hash) return `auto data unchanged (${hash})`;
  const recs = loadAuto();
  const client = await db.connect();
  try {
    await client.query('begin');
    for (const r of recs) {
      const extra = r as unknown as { popularity?: number; wikidataId?: string };
      const { tier: _t, photo, needsReview: _n, nextSummary: _x, ...data } = r;
      await client.query(
        `insert into species (slug, scientific_name, common_name, tier, class, "order", family, genus, gbif_key, wikidata_id, iucn, popularity, photo, aliases, search_text, data, updated_at)
         values ($1,$2,$3,'auto',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
         on conflict (slug) do update set
           scientific_name = excluded.scientific_name, common_name = excluded.common_name,
           class = excluded.class, "order" = excluded."order", family = excluded.family, genus = excluded.genus,
           gbif_key = excluded.gbif_key, wikidata_id = excluded.wikidata_id, iucn = excluded.iucn,
           popularity = excluded.popularity, photo = excluded.photo, aliases = excluded.aliases,
           search_text = excluded.search_text,
           data = excluded.data || case when species.data ? 'research' then jsonb_build_object('research', species.data->'research') else '{}'::jsonb end,
           updated_at = now()
         where species.tier = 'auto'`,
        [
          r.slug,
          r.scientificName,
          r.commonName,
          r.taxonomy.class,
          r.taxonomy.order,
          r.taxonomy.family,
          r.scientificName.split(' ')[0],
          r.gbifTaxonKey,
          extra.wikidataId ?? null,
          r.status.iucn,
          extra.popularity ?? 0,
          photo,
          r.aliases,
          searchText(r),
          data,
        ],
      );
    }
    await client.query(`insert into meta (key, value) values ('auto_hash', $1) on conflict (key) do update set value = excluded.value, updated_at = now()`, [hash]);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  return `loaded ${recs.length} auto species (${hash})`;
}
