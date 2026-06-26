-- Campaign Battle Tool - Supabase schema
-- Run this in Supabase Dashboard > SQL Editor.
-- This creates auth profiles, one-per-app DM claiming, characters, inventories, and live battle state.

create extension if not exists "pgcrypto";

-- 1) Types
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('player', 'dm');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.character_kind AS ENUM ('player', 'enemy', 'npc');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.battle_status AS ENUM ('active', 'ended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2) Profiles and the one-DM lock
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Player',
  role public.user_role not null default 'player',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dm_lock (
  id boolean primary key default true,
  dm_user_id uuid unique references auth.users(id) on delete set null,
  claimed_at timestamptz,
  constraint only_one_dm_lock_row check (id = true)
);

insert into public.dm_lock (id) values (true)
on conflict (id) do nothing;

-- 3) Game data
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  class_name text not null default 'Unknown',
  kind public.character_kind not null default 'player',
  owner_user_id uuid references auth.users(id) on delete set null,
  max_hp int not null default 100 check (max_hp >= 0),
  current_hp int not null default 100 check (current_hp >= 0),
  max_mana int not null default 0 check (max_mana >= 0),
  current_mana int not null default 0 check (current_mana >= 0),
  notes text not null default '',
  token_color text not null default '#3b82f6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  item_name text not null,
  quantity int not null default 1 check (quantity > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  status public.battle_status not null default 'active',
  grid_width int not null default 24 check (grid_width between 5 and 80),
  grid_height int not null default 24 check (grid_height between 5 and 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.combatants (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  x int not null default 0 check (x >= 0),
  y int not null default 0 check (y >= 0),
  current_hp int not null default 100 check (current_hp >= 0),
  current_mana int not null default 0 check (current_mana >= 0),
  initiative int,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (battle_id, character_id)
);

-- 4) Updated-at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists characters_set_updated_at on public.characters;
create trigger characters_set_updated_at before update on public.characters
for each row execute function public.set_updated_at();

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists combatants_set_updated_at on public.combatants;
create trigger combatants_set_updated_at before update on public.combatants
for each row execute function public.set_updated_at();

-- 5) Auth profile creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Player'),
    'player'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Fallback for accounts made before this schema existed.
create or replace function public.ensure_profile(display_name_input text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  insert into public.profiles (id, display_name, role)
  values (auth.uid(), coalesce(nullif(display_name_input, ''), 'Player'), 'player')
  on conflict (id) do update
    set display_name = coalesce(nullif(display_name_input, ''), public.profiles.display_name)
  returning * into result;

  return result;
end;
$$;

-- Helper: current user is DM?
create or replace function public.is_dm()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'dm'
  );
$$;

-- One-time DM claim. This is what makes the DM checkbox vanish forever after claimed.
create or replace function public.claim_dm(display_name_input text default null)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  already_claimed uuid;
  result public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be logged in to claim DM.';
  end if;

  -- Makes simultaneous claims safe.
  perform pg_advisory_xact_lock(87234122);

  insert into public.dm_lock (id) values (true)
  on conflict (id) do nothing;

  select dm_user_id into already_claimed
  from public.dm_lock
  where id = true;

  if already_claimed is not null and already_claimed <> auth.uid() then
    raise exception 'DM has already been claimed.';
  end if;

  update public.dm_lock
  set dm_user_id = auth.uid(), claimed_at = coalesce(claimed_at, now())
  where id = true;

  insert into public.profiles (id, display_name, role)
  values (auth.uid(), coalesce(nullif(display_name_input, ''), 'DM'), 'dm')
  on conflict (id) do update
    set role = 'dm',
        display_name = coalesce(nullif(display_name_input, ''), public.profiles.display_name)
  returning * into result;

  return result;
end;
$$;

-- 6) RLS
alter table public.profiles enable row level security;
alter table public.dm_lock enable row level security;
alter table public.characters enable row level security;
alter table public.inventory_items enable row level security;
alter table public.battles enable row level security;
alter table public.combatants enable row level security;

-- Profiles
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

DROP POLICY IF EXISTS "profiles_insert_self_player" ON public.profiles;
create policy "profiles_insert_self_player"
on public.profiles for insert
to authenticated
with check (id = auth.uid() and role = 'player');

DROP POLICY IF EXISTS "profiles_update_self_player" ON public.profiles;
create policy "profiles_update_self_player"
on public.profiles for update
to authenticated
using (id = auth.uid() and role = 'player')
with check (id = auth.uid() and role = 'player');

DROP POLICY IF EXISTS "profiles_update_dm" ON public.profiles;
create policy "profiles_update_dm"
on public.profiles for update
to authenticated
using (public.is_dm())
with check (public.is_dm());

-- DM lock is readable even before login so the UI can hide/show the DM claim option.
DROP POLICY IF EXISTS "dm_lock_select_authenticated" ON public.dm_lock;
create policy "dm_lock_select_authenticated"
on public.dm_lock for select
to anon, authenticated
using (true);

-- Characters: everyone in this private app can see combatants, but only the DM can create/edit/delete characters.
DROP POLICY IF EXISTS "characters_select_authenticated" ON public.characters;
create policy "characters_select_authenticated"
on public.characters for select
to authenticated
using (true);

DROP POLICY IF EXISTS "characters_insert_dm" ON public.characters;
create policy "characters_insert_dm"
on public.characters for insert
to authenticated
with check (public.is_dm());

DROP POLICY IF EXISTS "characters_update_dm" ON public.characters;
create policy "characters_update_dm"
on public.characters for update
to authenticated
using (public.is_dm())
with check (public.is_dm());

DROP POLICY IF EXISTS "characters_delete_dm" ON public.characters;
create policy "characters_delete_dm"
on public.characters for delete
to authenticated
using (public.is_dm());

-- Inventory: DM can manage all; assigned player can manage their own character inventory.
DROP POLICY IF EXISTS "inventory_select_owner_or_dm" ON public.inventory_items;
create policy "inventory_select_owner_or_dm"
on public.inventory_items for select
to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = inventory_items.character_id
      and c.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "inventory_insert_owner_or_dm" ON public.inventory_items;
create policy "inventory_insert_owner_or_dm"
on public.inventory_items for insert
to authenticated
with check (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = inventory_items.character_id
      and c.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "inventory_update_owner_or_dm" ON public.inventory_items;
create policy "inventory_update_owner_or_dm"
on public.inventory_items for update
to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = inventory_items.character_id
      and c.owner_user_id = auth.uid()
  )
)
with check (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = inventory_items.character_id
      and c.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "inventory_delete_owner_or_dm" ON public.inventory_items;
create policy "inventory_delete_owner_or_dm"
on public.inventory_items for delete
to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = inventory_items.character_id
      and c.owner_user_id = auth.uid()
  )
);

-- Battles and combatants: readable by logged-in party members; DM controls combat.
DROP POLICY IF EXISTS "battles_select_authenticated" ON public.battles;
create policy "battles_select_authenticated"
on public.battles for select
to authenticated
using (true);

DROP POLICY IF EXISTS "battles_insert_dm" ON public.battles;
create policy "battles_insert_dm"
on public.battles for insert
to authenticated
with check (public.is_dm());

DROP POLICY IF EXISTS "battles_update_dm" ON public.battles;
create policy "battles_update_dm"
on public.battles for update
to authenticated
using (public.is_dm())
with check (public.is_dm());

DROP POLICY IF EXISTS "combatants_select_authenticated" ON public.combatants;
create policy "combatants_select_authenticated"
on public.combatants for select
to authenticated
using (true);

DROP POLICY IF EXISTS "combatants_insert_dm" ON public.combatants;
create policy "combatants_insert_dm"
on public.combatants for insert
to authenticated
with check (public.is_dm());

DROP POLICY IF EXISTS "combatants_update_dm" ON public.combatants;
create policy "combatants_update_dm"
on public.combatants for update
to authenticated
using (public.is_dm())
with check (public.is_dm());

DROP POLICY IF EXISTS "combatants_delete_dm" ON public.combatants;
create policy "combatants_delete_dm"
on public.combatants for delete
to authenticated
using (public.is_dm());

-- 7) Realtime publication
-- If these ALTER PUBLICATION lines error because the table was already added, that is harmless.
alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.inventory_items;
alter publication supabase_realtime add table public.battles;
alter publication supabase_realtime add table public.combatants;
