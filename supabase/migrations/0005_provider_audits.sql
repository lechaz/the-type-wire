-- The Type Wire — news provider health audit
-- Run once in Supabase SQL Editor, same as prior migrations.
--
-- Health rows written by the daily provider-audit cron
-- (src/routes/api.cron.provider-audit.ts). fetchTopArticles derives its
-- active provider set from recent rows here instead of a hardcoded
-- constant — see src/server/news/client.ts and src/server/news/audit.ts.

create table provider_audits (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null default now(),
  region news_region not null,
  provider text not null,
  ok boolean not null,
  article_count int not null default 0,
  error text
);

create index provider_audits_region_checked_at_idx
  on provider_audits (region, checked_at desc);

-- No public read policy — this is server-only diagnostic data (error can
-- carry raw provider error strings), and the service-role client bypasses
-- RLS entirely. Without this, 0002_grants.sql's default anon SELECT grant
-- would otherwise make it publicly readable.
alter table provider_audits enable row level security;
