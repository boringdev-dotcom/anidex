create extension if not exists pg_trgm;

create table if not exists species (
  slug            text primary key,
  scientific_name text not null,
  common_name     text not null,
  tier            text not null default 'auto' check (tier in ('deep', 'auto')),
  class           text,
  "order"         text,
  family          text,
  genus           text,
  gbif_key        bigint,
  wikidata_id     text,
  iucn            text,
  popularity      double precision not null default 0,
  photo           jsonb,
  aliases         text[] not null default '{}',
  search_text     text not null default '',
  needs_review    boolean not null default false,
  data            jsonb not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists species_search_trgm on species using gin (search_text gin_trgm_ops);
create index if not exists species_class on species (class);
create index if not exists species_family on species (family);
create index if not exists species_iucn on species (iucn);
create index if not exists species_popularity on species (popularity desc);

create table if not exists specimen_models (
  slug         text primary key,
  status       text not null check (status in ('queued', 'generating', 'ready', 'failed')),
  url          text,
  cost_usd     numeric(8, 3) not null default 0,
  error        text,
  requested_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists jobs (
  id          bigserial primary key,
  kind        text not null,
  key         text not null,
  payload     jsonb not null default '{}',
  status      text not null default 'queued' check (status in ('queued', 'running', 'done', 'failed')),
  attempts    int not null default 0,
  error       text,
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  finished_at timestamptz,
  unique (kind, key)
);

create table if not exists source_cache (
  source     text not null,
  key        text not null,
  data       jsonb not null,
  fetched_at timestamptz not null default now(),
  primary key (source, key)
);
