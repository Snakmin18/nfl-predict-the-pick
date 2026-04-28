create extension if not exists "pgcrypto";

create table if not exists public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  host_participant_id uuid not null,
  host_user_id uuid references auth.users(id) on delete set null,
  year integer not null default 2026,
  round_limit integer not null default 1
    check (round_limit between 1 and 7),
  status text not null default 'waiting'
    check (status in ('waiting', 'in-progress', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  is_app_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null default 'player'
    check (role in ('host', 'player')),
  joined_at timestamptz not null default now()
);

create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid references public.lobbies(id) on delete cascade,
  participant_id uuid references public.participants(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  year integer not null,
  created_at timestamptz not null default now(),
  is_official_result boolean not null default false,
  submitted_at timestamptz,
  round_limit integer
    check (round_limit between 1 and 7)
);

create table if not exists public.draft_picks (
  draft_id uuid not null references public.drafts(id) on delete cascade,
  pick_number integer not null,
  team_id text not null,
  starting_team_id text,
  original_owner_team_id text,
  predicted_player jsonb,
  primary key (draft_id, pick_number)
);

alter table public.lobbies
  add column if not exists host_user_id uuid references auth.users(id) on delete set null;

alter table public.lobbies
  add column if not exists year integer not null default 2026;

alter table public.lobbies
  add column if not exists round_limit integer not null default 1;

alter table public.profiles
  add column if not exists is_app_admin boolean not null default false;

alter table public.lobbies
  drop constraint if exists lobbies_round_limit_check;

alter table public.lobbies
  add constraint lobbies_round_limit_check
  check (round_limit between 1 and 7);

alter table public.drafts
  add column if not exists round_limit integer;

alter table public.participants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.drafts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

alter table public.drafts
  add column if not exists submitted_at timestamptz;

alter table public.draft_picks
  add column if not exists starting_team_id text;

update public.draft_picks
  set starting_team_id = team_id
  where starting_team_id is null;

update public.participants
  set role = 'host'
  where role = 'admin';

alter table public.lobbies
  drop column if exists admin_pin;

alter table public.drafts
  alter column lobby_id drop not null;

alter table public.drafts
  alter column participant_id drop not null;

alter table public.drafts
  drop constraint if exists drafts_round_limit_check;

alter table public.drafts
  add constraint drafts_round_limit_check
  check (round_limit between 1 and 7);

create index if not exists participants_lobby_id_idx
  on public.participants(lobby_id);

create index if not exists participants_user_id_idx
  on public.participants(user_id);

create index if not exists drafts_lobby_id_idx
  on public.drafts(lobby_id);

create index if not exists drafts_user_id_idx
  on public.drafts(user_id);

create unique index if not exists official_drafts_year_unique_idx
  on public.drafts(year)
  where is_official_result = true
    and lobby_id is null;

create index if not exists draft_picks_draft_id_idx
  on public.draft_picks(draft_id);

grant usage on schema public to anon, authenticated;

revoke all on public.profiles
  from anon, authenticated;

grant select (
  id,
  display_name,
  is_app_admin,
  created_at
) on public.profiles
  to authenticated;

grant insert (
  id,
  display_name
) on public.profiles
  to authenticated;

grant update (
  display_name
) on public.profiles
  to authenticated;

revoke all on public.lobbies
  from anon, authenticated;

grant select (
  id,
  code,
  name,
  host_participant_id,
  host_user_id,
  year,
  round_limit,
  status,
  created_at
) on public.lobbies
  to authenticated;

grant insert (
  id,
  code,
  name,
  host_participant_id,
  host_user_id,
  year,
  round_limit,
  status,
  created_at
) on public.lobbies
  to authenticated;

grant update (
  code,
  name,
  host_participant_id,
  host_user_id,
  year,
  round_limit,
  status,
  created_at
) on public.lobbies
  to authenticated;

revoke all on public.participants
  from anon, authenticated;

grant select, insert on public.participants
  to authenticated;

revoke all on public.drafts
  from anon, authenticated;

grant select, insert, update on public.drafts
  to authenticated;

revoke all on public.draft_picks
  from anon, authenticated;

grant select, insert, update on public.draft_picks
  to authenticated;

alter table public.lobbies enable row level security;
alter table public.profiles enable row level security;
alter table public.participants enable row level security;
alter table public.drafts enable row level security;
alter table public.draft_picks enable row level security;

alter table public.participants
  drop constraint if exists participants_role_check;

alter table public.participants
  add constraint participants_role_check
  check (role in ('host', 'player'));

create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_app_admin = true
  );
$$;

create or replace function public.is_lobby_host(target_lobby_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.lobbies
    where id = target_lobby_id
      and host_user_id = auth.uid()
  );
$$;

create or replace function public.is_lobby_member(target_lobby_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.participants
    where lobby_id = target_lobby_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.find_lobby_by_code(room_code text)
returns table (
  id uuid,
  code text,
  name text,
  host_participant_id uuid,
  host_user_id uuid,
  year integer,
  round_limit integer,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.id,
    l.code,
    l.name,
    l.host_participant_id,
    l.host_user_id,
    l.year,
    l.round_limit,
    l.status,
    l.created_at
  from public.lobbies l
  where l.code = upper(trim(room_code))
  limit 1
$$;

create or replace function public.find_lobbies_by_ids(lobby_ids uuid[])
returns table (
  id uuid,
  code text,
  name text,
  host_participant_id uuid,
  host_user_id uuid,
  year integer,
  round_limit integer,
  status text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    l.id,
    l.code,
    l.name,
    l.host_participant_id,
    l.host_user_id,
    l.year,
    l.round_limit,
    l.status,
    l.created_at
  from public.lobbies l
  where l.id = any(lobby_ids)
    and (
      l.host_user_id = auth.uid()
      or public.is_lobby_member(l.id)
    )
$$;

drop policy if exists "Public lobbies are readable"
  on public.lobbies;

drop policy if exists "Public lobbies are insertable"
  on public.lobbies;

drop policy if exists "Public lobbies are updatable"
  on public.lobbies;

drop policy if exists "Profiles are readable"
  on public.profiles;

drop policy if exists "Users can insert their own profile"
  on public.profiles;

drop policy if exists "Users can update their own profile"
  on public.profiles;

drop policy if exists "Public participants are readable"
  on public.participants;

drop policy if exists "Public participants are insertable"
  on public.participants;

drop policy if exists "Public participants are updatable"
  on public.participants;

drop policy if exists "Public drafts are readable"
  on public.drafts;

drop policy if exists "Public drafts are insertable"
  on public.drafts;

drop policy if exists "Public drafts are updatable"
  on public.drafts;

drop policy if exists "Public draft picks are readable"
  on public.draft_picks;

drop policy if exists "Public draft picks are insertable"
  on public.draft_picks;

drop policy if exists "Public draft picks are updatable"
  on public.draft_picks;

create policy "Public lobbies are readable"
  on public.lobbies for select
  using (
    host_user_id = auth.uid()
    or public.is_lobby_member(id)
  );

create policy "Public lobbies are insertable"
  on public.lobbies for insert
  with check (
    auth.uid() is not null
    and host_user_id = auth.uid()
  );

create policy "Public lobbies are updatable"
  on public.lobbies for update
  using (host_user_id = auth.uid())
  with check (host_user_id = auth.uid());

create policy "Profiles are readable"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Public participants are readable"
  on public.participants for select
  using (
    user_id = auth.uid()
    or public.is_lobby_host(lobby_id)
    or public.is_lobby_member(lobby_id)
  );

create policy "Public participants are insertable"
  on public.participants for insert
  with check (
    auth.uid() is not null
    and user_id = auth.uid()
    and (
      role = 'player'
      or (
        role = 'host'
        and public.is_lobby_host(lobby_id)
      )
    )
  );

create policy "Public drafts are readable"
  on public.drafts for select
  using (
    is_official_result = true
    or user_id = auth.uid()
    or (lobby_id is not null and public.is_lobby_member(lobby_id))
  );

create policy "Public drafts are insertable"
  on public.drafts for insert
  with check (
    auth.uid() is not null
    and (
      (
        is_official_result = true
        and public.is_app_admin()
      )
      or (
        coalesce(is_official_result, false) = false
        and user_id = auth.uid()
        and participant_id is not null
        and lobby_id is not null
        and exists (
          select 1
          from public.participants p
          where p.id = participant_id
            and p.lobby_id = drafts.lobby_id
            and p.user_id = auth.uid()
        )
      )
    )
  );

create policy "Public drafts are updatable"
  on public.drafts for update
  using (
    (
      is_official_result = true
      and public.is_app_admin()
    )
    or (
      coalesce(is_official_result, false) = false
      and user_id = auth.uid()
      and submitted_at is null
    )
  )
  with check (
    (
      is_official_result = true
      and public.is_app_admin()
    )
    or (
      coalesce(is_official_result, false) = false
      and user_id = auth.uid()
    )
  );

create policy "Public draft picks are readable"
  on public.draft_picks for select
  using (
    exists (
      select 1
      from public.drafts d
      where d.id = draft_picks.draft_id
        and (
          d.is_official_result = true
          or d.user_id = auth.uid()
          or (d.lobby_id is not null and public.is_lobby_member(d.lobby_id))
        )
    )
  );

create policy "Public draft picks are insertable"
  on public.draft_picks for insert
  with check (
    exists (
      select 1
      from public.drafts d
      where d.id = draft_picks.draft_id
        and (
          (
            d.is_official_result = true
            and public.is_app_admin()
          )
          or (
            coalesce(d.is_official_result, false) = false
            and d.user_id = auth.uid()
            and d.submitted_at is null
          )
        )
    )
  );

create policy "Public draft picks are updatable"
  on public.draft_picks for update
  using (
    exists (
      select 1
      from public.drafts d
      where d.id = draft_picks.draft_id
        and (
          (
            d.is_official_result = true
            and public.is_app_admin()
          )
          or (
            coalesce(d.is_official_result, false) = false
            and d.user_id = auth.uid()
            and d.submitted_at is null
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.drafts d
      where d.id = draft_picks.draft_id
        and (
          (
            d.is_official_result = true
            and public.is_app_admin()
          )
          or (
            coalesce(d.is_official_result, false) = false
            and d.user_id = auth.uid()
            and d.submitted_at is null
          )
        )
    )
  );

drop function if exists public.rejoin_lobby_as_admin(text, text);

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_lobby_host(uuid) to authenticated;
grant execute on function public.is_lobby_member(uuid) to authenticated;
grant execute on function public.find_lobby_by_code(text) to authenticated;
grant execute on function public.find_lobbies_by_ids(uuid[]) to authenticated;
