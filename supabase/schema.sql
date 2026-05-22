create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting'
    check (status in ('waiting', 'calculating', 'finished')),
  rank_mode text not null default 'current'
    check (rank_mode in ('current', 'peak')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  riot_id text not null,
  display_name text not null,
  rank text not null,
  rank_value integer not null,
  peak_rank text not null,
  peak_rank_value integer not null,
  team text null check (team in ('A', 'B') or team is null),
  created_at timestamptz not null default now(),
  unique (room_id, riot_id)
);

create index if not exists rooms_expires_at_idx on public.rooms(expires_at);
create index if not exists players_room_id_created_at_idx
  on public.players(room_id, created_at);

alter table public.rooms enable row level security;
alter table public.players enable row level security;

grant all on table public.rooms to service_role;
grant all on table public.players to service_role;

do $$
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'players'
  ) then
    alter publication supabase_realtime add table public.players;
  end if;
end $$;

-- The app's mutations go through Next.js API routes using the service role key,
-- so no anonymous table policies are created by default.
--
-- Supabase Postgres Changes from the browser require SELECT access for the
-- browser role. Enabling the policy below makes room rows readable by anyone
-- with the publishable key, so only use it if room IDs are acceptable as bearer
-- secrets for your use case.
--
-- grant select on table public.rooms to anon;
-- grant select on table public.players to anon;
-- create policy "anon can read rooms for realtime"
--   on public.rooms for select to anon using (true);
-- create policy "anon can read players for realtime"
--   on public.players for select to anon using (true);
