-- The Type Wire — region support (US / TW editions)
-- Run once in Supabase SQL Editor, same as prior migrations.

create type news_region as enum ('us', 'tw');

alter table events add column region news_region not null default 'us';

-- Existing rows already default to 'us' via the column default above — no
-- backfill statement needed.

alter table events drop constraint events_category_source_url_cache_date_key;
alter table events add constraint events_region_category_source_url_cache_date_key
  unique (region, category, source_url, cache_date);

drop index events_category_cache_date_idx;
create index events_region_category_cache_date_idx on events (region, category, cache_date);
