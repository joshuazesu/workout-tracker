-- Deletes are tombstones (deleted_at) so they reach every phone. Once a tombstone is 30 days old,
-- remove the row for good. A phone that hasn't synced in over 30 days keeps its copy of a record
-- deleted elsewhere, which is the trade-off for not keeping deleted data forever.
create extension if not exists pg_cron with schema pg_catalog;

create function public.purge_deleted_rows() returns void
language sql set search_path = '' as $$
  delete from public.workouts where deleted_at < now() - interval '30 days';
  delete from public.routines where deleted_at < now() - interval '30 days';
  delete from public.weights  where deleted_at < now() - interval '30 days';
$$;

-- Only the scheduler (running as postgres) calls this, never the API.
revoke execute on function public.purge_deleted_rows() from public, anon, authenticated;

-- Daily at 03:00 UTC.
select cron.schedule('purge-deleted-rows', '0 3 * * *', 'select public.purge_deleted_rows()');
