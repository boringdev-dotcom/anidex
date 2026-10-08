-- social card image path per species (set by scripts/og.ts); the site-wide card lives in meta('og_default')
alter table species add column if not exists og text;
