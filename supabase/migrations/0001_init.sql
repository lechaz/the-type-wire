-- MBTI News Oracle — initial schema
-- Run once in Supabase SQL Editor.

create extension if not exists "pgcrypto";

create type news_category as enum ('ai', 'finance', 'politics', 'international', 'technology');
create type mbti_type as enum (
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP'
);
create type app_role as enum ('admin', 'user');

-- ============================================================
-- events — cached daily news per category
-- Daily cache key = (category, cache_date). Refresh forces a
-- new fetch but keeps the same cache_date row set (upsert).
-- ============================================================
create table events (
  id uuid primary key default gen_random_uuid(),
  category news_category not null,
  headline text not null,
  source_name text not null,
  source_url text not null,
  published_at timestamptz not null,
  summary text not null,
  cache_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (category, source_url, cache_date)
);

create index events_category_cache_date_idx on events (category, cache_date);

-- ============================================================
-- decision_makers — per event, MBTI + reasoning + confidence
-- ============================================================
create table decision_makers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null,
  role text not null,
  mbti mbti_type not null,
  reasoning text not null,
  confidence smallint not null check (confidence between 0 and 100),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index decision_makers_event_id_idx on decision_makers (event_id);

-- ============================================================
-- predictions — cached default 30-day timeline per event
-- ============================================================
create table predictions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  is_default boolean not null default true,
  overall_confidence smallint not null check (overall_confidence between 0 and 100),
  reasoning_summary text not null,
  created_at timestamptz not null default now()
);

create index predictions_event_id_idx on predictions (event_id);
-- only one default prediction per event
create unique index predictions_one_default_per_event
  on predictions (event_id)
  where is_default;

-- ============================================================
-- prediction_nodes — individual timeline entries
-- ============================================================
create table prediction_nodes (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references predictions (id) on delete cascade,
  day_offset smallint not null check (day_offset between 0 and 30),
  predicted_date date not null,
  headline text not null,
  summary text not null,
  driver_names text[] not null default '{}',
  trait_reasoning text not null,
  confidence smallint not null check (confidence between 0 and 100),
  sort_order smallint not null default 0
);

create index prediction_nodes_prediction_id_idx on prediction_nodes (prediction_id);

-- ============================================================
-- scenarios — user what-if branches
-- user_id nullable now (anonymous v1); ready for auth later.
-- ============================================================
create table scenarios (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid null references auth.users (id) on delete cascade,
  label text not null,
  overrides jsonb not null default '{}', -- { "<decision_maker_id>": "ENTP" }
  prediction_id uuid not null references predictions (id) on delete cascade,
  branch_color text not null default '#E8B44F',
  created_at timestamptz not null default now()
);

create index scenarios_event_id_idx on scenarios (event_id);
create index scenarios_user_id_idx on scenarios (user_id);

-- ============================================================
-- profiles + user_roles — scaffolded for future auth, unused in v1
-- ============================================================
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);

create or replace function has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table events enable row level security;
alter table decision_makers enable row level security;
alter table predictions enable row level security;
alter table prediction_nodes enable row level security;
alter table scenarios enable row level security;
alter table profiles enable row level security;
alter table user_roles enable row level security;

-- public read-only cache tables
create policy "events are publicly readable"
  on events for select
  using (true);

create policy "decision_makers are publicly readable"
  on decision_makers for select
  using (true);

create policy "predictions are publicly readable"
  on predictions for select
  using (true);

create policy "prediction_nodes are publicly readable"
  on prediction_nodes for select
  using (true);

-- scenarios: anonymous (user_id null) or owner
create policy "scenarios readable by owner or anonymous"
  on scenarios for select
  using (user_id is null or user_id = auth.uid());

create policy "scenarios insertable by owner or anonymous"
  on scenarios for insert
  with check (user_id is null or user_id = auth.uid());

-- profiles: owner only (unused in v1, ready for auth)
create policy "profiles readable by owner"
  on profiles for select
  using (id = auth.uid());

create policy "profiles updatable by owner"
  on profiles for update
  using (id = auth.uid());

-- user_roles: readable by self, no client-side writes
create policy "user_roles readable by owner"
  on user_roles for select
  using (user_id = auth.uid());

-- Writes to events/decision_makers/predictions/prediction_nodes/user_roles happen
-- via the service_role key from server functions, which bypasses RLS.
