/**
 * Species storage. Postgres when DATABASE_URL is set; otherwise the bundled curated JSON
 * (so the site keeps working before the database is connected, and in tests).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pool } from './db/pool.ts';
import type { Species } from '../src/data/types.ts';
import type { ListResponse, SpeciesRecord, SpeciesSummary, Stats } from '../src/data/api.ts';

export interface ListQuery {
  q?: string;
  class?: string;
  order?: string;
  family?: string;
  status?: string[];
  sort?: 'popular' | 'name' | 'status';
  page?: number;
  pageSize?: number;
}

export interface Repo {
  kind: 'postgres' | 'json';
  get(slug: string): Promise<SpeciesRecord | null>;
  search(q: string, limit?: number): Promise<SpeciesSummary[]>;
  list(q: ListQuery): Promise<ListResponse>;
  related(slug: string, limit?: number): Promise<SpeciesSummary[]>;
  stats(): Promise<Stats>;
}

const THREATENED = ['VU', 'EN', 'CR'];
const STATUS_RANK = "array_position(array['EX','EW','CR','EN','VU','NT','LC','DD','NE'], iucn)";

export function searchText(sp: Pick<Species, 'commonName' | 'scientificName' | 'aliases'>): string {
  return [sp.commonName, sp.scientificName, ...(sp.aliases ?? [])].join(' ').toLowerCase();
}

// ---------------- postgres ----------------

const SUMMARY_COLS = `slug, common_name, scientific_name, iucn, class, "order", family, tier, photo, data->'specimen' as specimen`;

interface Row {
  slug: string;
  common_name: string;
  scientific_name: string;
  iucn: string | null;
  class: string | null;
  order: string | null;
  family: string | null;
  tier: 'deep' | 'auto';
  photo: SpeciesSummary['photo'];
  specimen: Species['specimen'];
}

const toSummary = (r: Row): SpeciesSummary => ({
  slug: r.slug,
  commonName: r.common_name,
  scientificName: r.scientific_name,
  iucn: (r.iucn as SpeciesSummary['iucn']) ?? null,
  class: r.class,
  order: r.order,
  family: r.family,
  tier: r.tier,
  photo: r.photo,
  specimen: r.specimen,
});

function pgRepo(): Repo {
  const db = pool!;
  return {
    kind: 'postgres',
    async get(slug) {
      const r = await db.query(`select data, tier, photo, needs_review from species where slug = $1`, [slug]);
      if (!r.rowCount) return null;
      const row = r.rows[0];
      let next: SpeciesSummary | null = null;
      if (row.data.next) {
        const n = await db.query<Row>(`select ${SUMMARY_COLS} from species where slug = $1`, [row.data.next]);
        next = n.rowCount ? toSummary(n.rows[0]) : null;
      }
      next ??= (await this.related(slug, 1))[0] ?? null;
      // on-demand research is stored separately (so data reloads keep it) and layered on top here
      const { research, ...base } = row.data;
      const merged = research ? { ...base, ...research.fields, status: { ...base.status, ...research.fields?.status }, sources: [...(base.sources ?? []), ...(research.sources ?? [])] } : base;
      return { ...merged, tier: row.tier, photo: row.photo, needsReview: row.needs_review, research: research ? { state: 'done', at: research.at } : undefined, nextSummary: next };
    },
    async search(q, limit = 8) {
      const term = q.trim().toLowerCase();
      if (!term) return [];
      const r = await db.query<Row>(
        `select ${SUMMARY_COLS}
           from species
          where search_text % $1 or search_text like '%' || $1 || '%'
          order by (search_text like $1 || '%') desc,
                   greatest(similarity(search_text, $1), word_similarity($1, search_text)) desc,
                   popularity desc
          limit $2`,
        [term, limit],
      );
      return r.rows.map(toSummary);
    },
    async list({ q, class: cls, order, family, status, sort = 'popular', page = 1, pageSize = 48 }) {
      const where: string[] = [];
      const args: unknown[] = [];
      const add = (sql: string, v: unknown) => {
        args.push(v);
        where.push(sql.replaceAll('$?', `$${args.length}`));
      };
      if (q?.trim()) add(`(search_text % $? or search_text like '%' || $? || '%')`, q.trim().toLowerCase());
      if (cls) add('class = $?', cls);
      if (order) add('"order" = $?', order);
      if (family) add('family = $?', family);
      if (status?.length) add('iucn = any($?)', status);
      const w = where.length ? `where ${where.join(' and ')}` : '';
      const by = sort === 'name' ? 'common_name asc' : sort === 'status' ? `${STATUS_RANK} asc nulls last, popularity desc` : 'popularity desc, common_name asc';
      const size = Math.min(Math.max(pageSize, 1), 100);
      const off = (Math.max(page, 1) - 1) * size;
      const [rows, count] = await Promise.all([
        db.query<Row>(`select ${SUMMARY_COLS} from species ${w} order by ${by} limit ${size} offset ${off}`, args),
        db.query<{ n: string }>(`select count(*) as n from species ${w}`, args),
      ]);
      return { items: rows.rows.map(toSummary), total: Number(count.rows[0].n), page: Math.max(page, 1), pageSize: size };
    },
    async related(slug, limit = 6) {
      const r = await db.query<Row>(
        `select ${SUMMARY_COLS} from species
          where slug <> $1
            and (family = (select family from species where slug = $1) or "order" = (select "order" from species where slug = $1)
                 or class = (select class from species where slug = $1))
          order by (genus = (select genus from species where slug = $1)) desc,
                   (family = (select family from species where slug = $1)) desc,
                   ("order" = (select "order" from species where slug = $1)) desc,
                   popularity desc
          limit $2`,
        [slug, limit],
      );
      return r.rows.map(toSummary);
    },
    async stats() {
      const [t, c] = await Promise.all([
        db.query<{ total: string; threatened: string }>(`select count(*) as total, count(*) filter (where iucn = any($1)) as threatened from species`, [THREATENED]),
        db.query<{ name: string; count: string }>(`select coalesce(class, 'Other') as name, count(*) as count from species group by 1 order by 2 desc`),
      ]);
      return {
        total: Number(t.rows[0].total),
        threatened: Number(t.rows[0].threatened),
        byClass: c.rows.map((r) => ({ name: r.name, count: Number(r.count) })),
      };
    },
  };
}

// ---------------- bundled JSON fallback ----------------

export function curatedDir(): string {
  // repo layout (dev) or the Docker image's copy
  const candidates = [join(import.meta.dirname, '..', 'src', 'data', 'species'), join(import.meta.dirname, '..', 'data', 'species')];
  return candidates.find((d) => existsSync(d)) ?? candidates[0];
}

export function loadCurated(): Species[] {
  const dir = curatedDir();
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')) as Species);
}

function jsonRepo(): Repo {
  const all = loadCurated();
  const sum = (s: Species): SpeciesSummary => ({
    slug: s.slug,
    commonName: s.commonName,
    scientificName: s.scientificName,
    iucn: s.status?.iucn ?? null,
    class: s.taxonomy?.class ?? null,
    order: s.taxonomy?.order ?? null,
    family: s.taxonomy?.family ?? null,
    tier: 'deep',
    photo: s.photo ?? null,
    specimen: s.specimen,
  });
  const match = (s: Species, q: string) => searchText(s).includes(q.toLowerCase());
  return {
    kind: 'json',
    async get(slug) {
      const s = all.find((x) => x.slug === slug);
      if (!s) return null;
      const n = all.find((x) => x.slug === s.next) ?? all.find((x) => x.slug !== slug);
      return { ...s, tier: 'deep', photo: s.photo ?? null, needsReview: false, nextSummary: n ? sum(n) : null };
    },
    async search(q, limit = 8) {
      const t = q.trim().toLowerCase();
      if (!t) return [];
      return all
        .filter((s) => match(s, t))
        .sort((a, b) => Number(searchText(b).startsWith(t)) - Number(searchText(a).startsWith(t)))
        .slice(0, limit)
        .map(sum);
    },
    async list({ q, class: cls, family, status, page = 1, pageSize = 48 }) {
      let items = all.filter((s) => (!q || match(s, q)) && (!cls || s.taxonomy.class === cls) && (!family || s.taxonomy.family === family) && (!status?.length || status.includes(s.status.iucn)));
      const total = items.length;
      items = items.slice((page - 1) * pageSize, page * pageSize);
      return { items: items.map(sum), total, page, pageSize };
    },
    async related(slug, limit = 6) {
      const me = all.find((s) => s.slug === slug);
      if (!me) return [];
      const next = all.find((s) => s.slug === me.next);
      return [next, ...all.filter((s) => s.slug !== slug && s !== next)].filter(Boolean).slice(0, limit).map((s) => sum(s!));
    },
    async stats() {
      const by = new Map<string, number>();
      for (const s of all) by.set(s.taxonomy.class, (by.get(s.taxonomy.class) ?? 0) + 1);
      return {
        total: all.length,
        threatened: all.filter((s) => THREATENED.includes(s.status.iucn)).length,
        byClass: [...by].map(([name, count]) => ({ name, count })),
      };
    },
  };
}

export const repo: Repo = pool ? pgRepo() : jsonRepo();
