-- The Type Wire — reader-submitted links ("Custom" tab)
-- Run once in the Supabase SQL Editor, same as prior migrations.
--
-- Custom events live in their own category so the wire desks' queries
-- (which filter by the five real categories) never pick them up.

alter type news_category add value if not exists 'custom';
