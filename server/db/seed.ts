import type pg from 'pg';
import { loadCurated, searchText } from '../repo.ts';

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
