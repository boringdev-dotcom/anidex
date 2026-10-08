-- live job workers, so only the newest one claims jobs (deploys briefly run two instances)
create table if not exists workers (
  id        text primary key,
  booted_at timestamptz not null,
  beat_at   timestamptz not null
);
