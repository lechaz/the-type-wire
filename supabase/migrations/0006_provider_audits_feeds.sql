-- The Type Wire — feed-health audit columns
-- Run once in Supabase SQL Editor, same as prior migrations.
--
-- News ingestion moved from quota-limited search APIs (Currents/RapidAPI/
-- GDELT) to public RSS feeds — see src/server/news/categories.ts. A single
-- "provider" no longer identifies what was probed: a category can have
-- multiple feeds, and the same outlet (e.g. CNBC) supplies different feeds
-- to different categories. feed_url disambiguates; category lets the audit
-- be queried per desk. "provider" is kept as the outlet's display name.
--
-- Nullable: existing rows predate this and have neither.

alter table provider_audits add column category news_category;
alter table provider_audits add column feed_url text;
