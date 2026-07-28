-- The Type Wire — reusable purge for stale cached editions
-- Run once in the Supabase SQL Editor to install. After that, purge any
-- time by running the one-liner below (save it as its own SQL Editor
-- snippet for a one-click purge):
--
--   select * from purge_old_events();
--
-- decision_makers, predictions, prediction_nodes, and scenarios all
-- cascade-delete automatically via their event_id/prediction_id foreign
-- keys (see 0001_init.sql) — deleting the parent events row is enough to
-- purge everything associated with it.

create or replace function purge_old_events(days_to_keep int default 3)
returns table (purged_count bigint)
language sql
as $$
  with deleted as (
    delete from events
    where cache_date < current_date - days_to_keep
    returning id
  )
  select count(*) from deleted;
$$;
