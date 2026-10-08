-- generated 3D specimen for a species ({ url, yaw }), layered onto data.specimen.model at read time.
-- Kept outside `data` so reloading the open-data seed never drops it.
alter table species add column if not exists model jsonb;
