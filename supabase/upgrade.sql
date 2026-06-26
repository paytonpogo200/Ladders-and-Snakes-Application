-- Campaign Tool visual + character sheet upgrade
-- Run this ONCE in Supabase Dashboard > SQL Editor before using the new files.
-- It safely upgrades an existing database created from the original schema.

alter table public.characters
  add column if not exists level int not null default 1;

alter table public.characters
  add column if not exists class_key text not null default '';

alter table public.characters
  add column if not exists inventory_slots int not null default 20;

alter table public.characters
  add column if not exists spell_slots int not null default 0;

alter table public.characters
  add column if not exists attributes jsonb not null default '{
    "strength": 0,
    "agility": 0,
    "vitality": 0,
    "intelligence": 0,
    "recovery": 0,
    "charisma": 0,
    "accuracy": 0,
    "range": 0,
    "mana_regen": 0,
    "perception": 0,
    "alchemy": 0,
    "stealth": 0
  }'::jsonb;

alter table public.inventory_items
  add column if not exists slot_index int;

alter table public.inventory_items
  add column if not exists item_type text not null default 'misc';

alter table public.inventory_items
  add column if not exists equipped boolean not null default false;

-- Editable campaign-wide game definitions.
create table if not exists public.class_assets (
  id uuid primary key default gen_random_uuid(),
  class_key text not null unique,
  name text not null,
  type text not null default '',
  armor text not null default 'Light armor',
  identity text not null default '',
  inventory_slots int not null default 10 check (inventory_slots between 0 and 100),
  spell_slots int not null default 0 check (spell_slots >= 0),
  health int not null default 100 check (health >= 0),
  mana int not null default 0 check (mana >= 0),
  attributes jsonb not null default '{}'::jsonb check (jsonb_typeof(attributes) = 'object'),
  passives jsonb not null default '[]'::jsonb check (jsonb_typeof(passives) = 'array'),
  token_color text not null default '#4d8f83',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enemy_assets (
  id uuid primary key default gen_random_uuid(),
  enemy_key text not null unique,
  category text not null default 'Custom',
  name text not null,
  health int not null default 50 check (health >= 0),
  mana int not null default 0 check (mana >= 0),
  damage int not null default 0 check (damage >= 0),
  notes text not null default '',
  token_color text not null default '#c84f49',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enemy_assets
  add column if not exists is_discovered boolean not null default false;

-- Put pre-existing inventory items into distinct slots per character.
with numbered as (
  select
    id,
    row_number() over (partition by character_id order by created_at, id) - 1 as new_slot
  from public.inventory_items
  where slot_index is null
)
update public.inventory_items item
set slot_index = numbered.new_slot
from numbered
where item.id = numbered.id;

alter table public.inventory_items
  alter column slot_index set default 0,
  alter column slot_index set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_level_positive'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_level_positive check (level >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_inventory_slots_valid'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_inventory_slots_valid check (inventory_slots between 0 and 100);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_spell_slots_nonnegative'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_spell_slots_nonnegative check (spell_slots >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'characters_attributes_object'
      and conrelid = 'public.characters'::regclass
  ) then
    alter table public.characters
      add constraint characters_attributes_object check (jsonb_typeof(attributes) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'inventory_item_type_valid'
      and conrelid = 'public.inventory_items'::regclass
  ) then
    alter table public.inventory_items
      add constraint inventory_item_type_valid
      check (item_type in ('weapon', 'armor', 'consumable', 'tool', 'quest', 'misc'));
  end if;

end
$$;

-- ============================================================
-- Cities, currencies, markets, storage, and character wallets
-- ============================================================

alter table public.inventory_items
  add column if not exists parent_item_id uuid;

alter table public.inventory_items
  add column if not exists is_storage boolean not null default false;

alter table public.inventory_items
  add column if not exists storage_capacity int not null default 0;

alter table public.inventory_items
  add column if not exists source_product_id uuid;

alter table public.inventory_items
  drop constraint if exists inventory_items_parent_item_id_fkey;

alter table public.inventory_items
  add constraint inventory_items_parent_item_id_fkey
  foreign key (parent_item_id) references public.inventory_items(id) on delete cascade;

alter table public.inventory_items
  drop constraint if exists inventory_character_slot_unique;

alter table public.inventory_items
  drop constraint if exists inventory_slot_nonnegative;

alter table public.inventory_items
  drop constraint if exists inventory_slot_valid;

alter table public.inventory_items
  add constraint inventory_slot_valid check (slot_index >= -1);

alter table public.inventory_items
  drop constraint if exists inventory_storage_capacity_valid;

alter table public.inventory_items
  add constraint inventory_storage_capacity_valid check (storage_capacity between 0 and 500);

create unique index if not exists inventory_main_slot_unique
on public.inventory_items(character_id, slot_index)
where parent_item_id is null and is_storage = false;

create unique index if not exists inventory_container_slot_unique
on public.inventory_items(parent_item_id, slot_index)
where parent_item_id is not null;

create table if not exists public.currency_systems (
  id uuid primary key default gen_random_uuid(),
  system_key text not null unique,
  name text not null,
  base_unit_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.currency_denominations (
  id uuid primary key default gen_random_uuid(),
  currency_system_id uuid not null references public.currency_systems(id) on delete cascade,
  denomination_key text not null,
  name text not null,
  base_value bigint not null check (base_value > 0),
  sort_order int not null default 0,
  unique(currency_system_id, denomination_key)
);

create table if not exists public.character_wallets (
  character_id uuid not null references public.characters(id) on delete cascade,
  currency_system_id uuid not null references public.currency_systems(id) on delete cascade,
  balance_base bigint not null default 0 check (balance_base >= 0),
  updated_at timestamptz not null default now(),
  primary key(character_id, currency_system_id)
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  city_key text not null unique,
  name text not null,
  description text not null default '',
  currency_system_id uuid not null references public.currency_systems(id),
  is_discovered boolean not null default false,
  is_open boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.city_facilities (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id) on delete cascade,
  facility_key text not null,
  name text not null,
  description text not null default '',
  sort_order int not null default 0,
  unique(city_id, facility_key)
);

create table if not exists public.city_vendors (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.city_facilities(id) on delete cascade,
  vendor_key text not null,
  name text not null,
  role text not null default 'Merchant',
  description text not null default '',
  sort_order int not null default 0,
  unique(facility_id, vendor_key)
);

create table if not exists public.market_products (
  id uuid primary key default gen_random_uuid(),
  product_key text not null unique,
  name text not null,
  description text not null default '',
  item_type text not null default 'misc'
    check (item_type in ('weapon', 'armor', 'consumable', 'tool', 'quest', 'misc')),
  price_base bigint not null default 0 check (price_base >= 0),
  stock_quantity int check (stock_quantity is null or stock_quantity >= 0),
  storage_capacity int not null default 0 check (storage_capacity between 0 and 500),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.city_vendors(id) on delete cascade,
  product_id uuid not null references public.market_products(id) on delete cascade,
  sort_order int not null default 0,
  unique(vendor_id, product_id)
);

alter table public.inventory_items
  drop constraint if exists inventory_items_source_product_id_fkey;

alter table public.inventory_items
  add constraint inventory_items_source_product_id_fkey
  foreign key (source_product_id) references public.market_products(id) on delete set null;

drop trigger if exists currency_systems_set_updated_at on public.currency_systems;
create trigger currency_systems_set_updated_at before update on public.currency_systems
for each row execute function public.set_updated_at();

drop trigger if exists character_wallets_set_updated_at on public.character_wallets;
create trigger character_wallets_set_updated_at before update on public.character_wallets
for each row execute function public.set_updated_at();

drop trigger if exists cities_set_updated_at on public.cities;
create trigger cities_set_updated_at before update on public.cities
for each row execute function public.set_updated_at();

drop trigger if exists market_products_set_updated_at on public.market_products;
create trigger market_products_set_updated_at before update on public.market_products
for each row execute function public.set_updated_at();

alter table public.currency_systems enable row level security;
alter table public.currency_denominations enable row level security;
alter table public.character_wallets enable row level security;
alter table public.cities enable row level security;
alter table public.city_facilities enable row level security;
alter table public.city_vendors enable row level security;
alter table public.market_products enable row level security;
alter table public.market_listings enable row level security;

drop policy if exists "currency_systems_read" on public.currency_systems;
create policy "currency_systems_read" on public.currency_systems for select to authenticated using (true);
drop policy if exists "currency_systems_dm_all" on public.currency_systems;
create policy "currency_systems_dm_all" on public.currency_systems for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "currency_denominations_read" on public.currency_denominations;
create policy "currency_denominations_read" on public.currency_denominations for select to authenticated using (true);
drop policy if exists "currency_denominations_dm_all" on public.currency_denominations;
create policy "currency_denominations_dm_all" on public.currency_denominations for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "wallets_owner_or_dm_read" on public.character_wallets;
create policy "wallets_owner_or_dm_read" on public.character_wallets for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = character_wallets.character_id and c.owner_user_id = auth.uid()
  )
);
drop policy if exists "wallets_dm_all" on public.character_wallets;
create policy "wallets_dm_all" on public.character_wallets for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "cities_read" on public.cities;
create policy "cities_read" on public.cities for select to authenticated using (is_discovered or public.is_dm());
drop policy if exists "cities_dm_all" on public.cities;
create policy "cities_dm_all" on public.cities for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "facilities_read" on public.city_facilities;
create policy "facilities_read" on public.city_facilities for select to authenticated using (true);
drop policy if exists "facilities_dm_all" on public.city_facilities;
create policy "facilities_dm_all" on public.city_facilities for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "vendors_read" on public.city_vendors;
create policy "vendors_read" on public.city_vendors for select to authenticated using (true);
drop policy if exists "vendors_dm_all" on public.city_vendors;
create policy "vendors_dm_all" on public.city_vendors for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "products_read" on public.market_products;
create policy "products_read" on public.market_products for select to authenticated using (true);
drop policy if exists "products_dm_all" on public.market_products;
create policy "products_dm_all" on public.market_products for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "listings_read" on public.market_listings;
create policy "listings_read" on public.market_listings for select to authenticated using (true);
drop policy if exists "listings_dm_all" on public.market_listings;
create policy "listings_dm_all" on public.market_listings for all to authenticated using (public.is_dm()) with check (public.is_dm());

-- Players receive items through purchases. Only the DM may manually create or edit them.
drop policy if exists "inventory_insert_owner_or_dm" on public.inventory_items;
drop policy if exists "inventory_insert_dm" on public.inventory_items;
create policy "inventory_insert_dm" on public.inventory_items for insert to authenticated with check (public.is_dm());
drop policy if exists "inventory_update_owner_or_dm" on public.inventory_items;
drop policy if exists "inventory_update_dm" on public.inventory_items;
create policy "inventory_update_dm" on public.inventory_items for update to authenticated using (public.is_dm()) with check (public.is_dm());

create or replace function public.place_inventory_item(
  target_character_id uuid,
  new_name text,
  new_quantity int,
  new_notes text,
  new_item_type text,
  new_storage_capacity int default 0,
  new_source_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  character_slots int;
  chosen_slot int;
  chosen_parent uuid;
  container record;
  result_id uuid;
begin
  select inventory_slots into character_slots
  from public.characters
  where id = target_character_id;

  if character_slots is null then
    raise exception 'Character not found.';
  end if;

  if new_storage_capacity > 0 then
    insert into public.inventory_items (
      character_id, item_name, quantity, notes, item_type, slot_index,
      parent_item_id, is_storage, storage_capacity, source_product_id
    ) values (
      target_character_id, new_name, greatest(new_quantity, 1), new_notes, new_item_type, -1,
      null, true, new_storage_capacity, new_source_product_id
    ) returning id into result_id;
    return result_id;
  end if;

  select slot into chosen_slot
  from generate_series(0, greatest(character_slots - 1, -1)) as slot
  where not exists (
    select 1 from public.inventory_items i
    where i.character_id = target_character_id
      and i.parent_item_id is null
      and i.is_storage = false
      and i.slot_index = slot
  )
  order by slot
  limit 1;

  if chosen_slot is null then
    for container in
      select id, storage_capacity
      from public.inventory_items
      where character_id = target_character_id and is_storage = true
      order by created_at
    loop
      select slot into chosen_slot
      from generate_series(0, greatest(container.storage_capacity - 1, -1)) as slot
      where not exists (
        select 1 from public.inventory_items i
        where i.parent_item_id = container.id and i.slot_index = slot
      )
      order by slot
      limit 1;

      if chosen_slot is not null then
        chosen_parent := container.id;
        exit;
      end if;
    end loop;
  end if;

  if chosen_slot is null then
    raise exception 'No inventory space available.';
  end if;

  insert into public.inventory_items (
    character_id, item_name, quantity, notes, item_type, slot_index,
    parent_item_id, is_storage, storage_capacity, source_product_id
  ) values (
    target_character_id, new_name, greatest(new_quantity, 1), new_notes, new_item_type, chosen_slot,
    chosen_parent, false, 0, new_source_product_id
  ) returning id into result_id;

  return result_id;
end;
$$;

revoke all on function public.place_inventory_item(uuid, text, int, text, text, int, uuid) from public;

create or replace function public.purchase_market_item(
  target_character_id uuid,
  target_listing_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  listing record;
  current_balance bigint;
begin
  select
    p.*, c.currency_system_id, c.is_open, c.is_discovered
  into listing
  from public.market_listings ml
  join public.market_products p on p.id = ml.product_id
  join public.city_vendors v on v.id = ml.vendor_id
  join public.city_facilities f on f.id = v.facility_id
  join public.cities c on c.id = f.city_id
  where ml.id = target_listing_id;

  if listing.id is null then raise exception 'Market item not found.'; end if;
  if not listing.is_discovered or not listing.is_open then raise exception 'This city is not currently available.'; end if;
  if not listing.is_available or listing.price_base <= 0 then raise exception 'This item is not currently for sale.'; end if;
  if listing.stock_quantity is not null and listing.stock_quantity <= 0 then raise exception 'This item is out of stock.'; end if;
  if not public.is_dm() and not exists (
    select 1 from public.characters where id = target_character_id and owner_user_id = auth.uid()
  ) then raise exception 'You do not control that character.'; end if;

  insert into public.character_wallets(character_id, currency_system_id, balance_base)
  values (target_character_id, listing.currency_system_id, 0)
  on conflict (character_id, currency_system_id) do nothing;

  select balance_base into current_balance
  from public.character_wallets
  where character_id = target_character_id and currency_system_id = listing.currency_system_id
  for update;

  if current_balance < listing.price_base then raise exception 'Not enough currency.'; end if;

  perform public.place_inventory_item(
    target_character_id, listing.name, 1, listing.description,
    listing.item_type, listing.storage_capacity, listing.id
  );

  update public.character_wallets
  set balance_base = balance_base - listing.price_base
  where character_id = target_character_id and currency_system_id = listing.currency_system_id;

  if listing.stock_quantity is not null then
    update public.market_products
    set stock_quantity = stock_quantity - 1
    where id = listing.id;
  end if;

  return listing.name;
end;
$$;

grant execute on function public.purchase_market_item(uuid, uuid) to authenticated;

create or replace function public.dm_adjust_currency(
  target_character_id uuid,
  target_denomination_id uuid,
  denomination_amount bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  denomination record;
  result_balance bigint;
begin
  if not public.is_dm() then raise exception 'Only the DM may adjust currency.'; end if;

  select * into denomination
  from public.currency_denominations
  where id = target_denomination_id;

  if denomination.id is null then raise exception 'Currency denomination not found.'; end if;

  insert into public.character_wallets(character_id, currency_system_id, balance_base)
  values (target_character_id, denomination.currency_system_id, 0)
  on conflict (character_id, currency_system_id) do nothing;

  update public.character_wallets
  set balance_base = greatest(0, balance_base + (denomination_amount * denomination.base_value))
  where character_id = target_character_id
    and currency_system_id = denomination.currency_system_id
  returning balance_base into result_balance;

  return result_balance;
end;
$$;

grant execute on function public.dm_adjust_currency(uuid, uuid, bigint) to authenticated;

create or replace function public.dm_grant_custom_item(
  target_character_id uuid,
  item_name_input text,
  quantity_input int,
  notes_input text,
  item_type_input text,
  storage_capacity_input int default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_dm() then raise exception 'Only the DM may grant items.'; end if;
  return public.place_inventory_item(
    target_character_id, item_name_input, quantity_input, notes_input,
    item_type_input, storage_capacity_input, null
  );
end;
$$;

grant execute on function public.dm_grant_custom_item(uuid, text, int, text, text, int) to authenticated;

create or replace function public.dm_grant_market_item(
  target_character_id uuid,
  target_product_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product public.market_products;
begin
  if not public.is_dm() then raise exception 'Only the DM may grant items.'; end if;
  select * into product from public.market_products where id = target_product_id;
  if product.id is null then raise exception 'Product not found.'; end if;
  return public.place_inventory_item(
    target_character_id, product.name, 1, product.description,
    product.item_type, product.storage_capacity, product.id
  );
end;
$$;

grant execute on function public.dm_grant_market_item(uuid, uuid) to authenticated;

-- Ensure every old character has the complete set of keys.
update public.characters
set attributes = '{
  "strength": 0,
  "agility": 0,
  "vitality": 0,
  "intelligence": 0,
  "recovery": 0,
  "charisma": 0,
  "accuracy": 0,
  "range": 0,
  "mana_regen": 0,
  "perception": 0,
  "alchemy": 0,
  "stealth": 0
}'::jsonb || coalesce(attributes, '{}'::jsonb);

-- Match old characters to a known class when their class name already uses one.
update public.characters
set class_key = case lower(class_name)
  when 'alchemist' then 'alchemist'
  when 'apothecary' then 'apothecary'
  when 'apprentice' then 'apprentice'
  when 'armor-clad' then 'armor-clad'
  when 'armor clad' then 'armor-clad'
  when 'beastmaster' then 'beastmaster'
  when 'blacksmith' then 'blacksmith'
  when 'knight' then 'knight'
  when 'mage' then 'mage'
  when 'mendrunner' then 'mendrunner'
  when 'ranger' then 'ranger'
  when 'rogue' then 'rogue'
  when 'sage' then 'sage'
  when 'talismanist' then 'talismanist'
  else class_key
end
where class_key = '';

drop trigger if exists class_assets_set_updated_at on public.class_assets;
create trigger class_assets_set_updated_at before update on public.class_assets
for each row execute function public.set_updated_at();

drop trigger if exists enemy_assets_set_updated_at on public.enemy_assets;
create trigger enemy_assets_set_updated_at before update on public.enemy_assets
for each row execute function public.set_updated_at();

alter table public.class_assets enable row level security;
alter table public.enemy_assets enable row level security;

drop policy if exists "class_assets_select_authenticated" on public.class_assets;
create policy "class_assets_select_authenticated"
on public.class_assets for select to authenticated using (true);

drop policy if exists "class_assets_insert_dm" on public.class_assets;
create policy "class_assets_insert_dm"
on public.class_assets for insert to authenticated with check (public.is_dm());

drop policy if exists "class_assets_update_dm" on public.class_assets;
create policy "class_assets_update_dm"
on public.class_assets for update to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "class_assets_delete_dm" on public.class_assets;
create policy "class_assets_delete_dm"
on public.class_assets for delete to authenticated using (public.is_dm());

drop policy if exists "enemy_assets_select_authenticated" on public.enemy_assets;
create policy "enemy_assets_select_authenticated"
on public.enemy_assets for select to authenticated using (is_discovered or public.is_dm());

drop policy if exists "enemy_assets_insert_dm" on public.enemy_assets;
create policy "enemy_assets_insert_dm"
on public.enemy_assets for insert to authenticated with check (public.is_dm());

drop policy if exists "enemy_assets_update_dm" on public.enemy_assets;
create policy "enemy_assets_update_dm"
on public.enemy_assets for update to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "enemy_assets_delete_dm" on public.enemy_assets;
create policy "enemy_assets_delete_dm"
on public.enemy_assets for delete to authenticated using (public.is_dm());

create table if not exists public.loot_entries (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  item_name text not null,
  category text not null,
  biomes text not null default 'Any',
  min_difficulty int not null default 1 check (min_difficulty between 1 and 5),
  max_difficulty int not null default 5 check (max_difficulty between 1 and 5),
  rarity text not null default 'Common',
  weight numeric not null default 1 check (weight > 0),
  min_quantity int not null default 1 check (min_quantity > 0),
  max_quantity int not null default 1 check (max_quantity >= min_quantity),
  item_type text not null default 'misc'
    check (item_type in ('weapon', 'armor', 'consumable', 'tool', 'quest', 'misc')),
  storage_capacity int not null default 0 check (storage_capacity between 0 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists loot_entries_set_updated_at on public.loot_entries;
create trigger loot_entries_set_updated_at before update on public.loot_entries
for each row execute function public.set_updated_at();

alter table public.loot_entries enable row level security;

drop policy if exists "loot_entries_dm_read" on public.loot_entries;
create policy "loot_entries_dm_read"
on public.loot_entries for select to authenticated using (public.is_dm());

drop policy if exists "loot_entries_dm_all" on public.loot_entries;
create policy "loot_entries_dm_all"
on public.loot_entries for all to authenticated using (public.is_dm()) with check (public.is_dm());

create or replace function public.dm_roll_loot(
  loot_biome text,
  loot_difficulty int,
  loot_pool_size text,
  loot_room_type text
)
returns table (
  loot_entry_id uuid,
  item_name text,
  category text,
  rarity text,
  quantity int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  base_rolls int;
  total_rolls int;
  rare_multiplier numeric;
  chosen public.loot_entries;
  roll_number int;
begin
  if not public.is_dm() then raise exception 'Only the DM may roll loot.'; end if;
  if loot_difficulty not between 1 and 5 then raise exception 'Difficulty must be between 1 and 5.'; end if;

  base_rolls := case loot_pool_size
    when 'Tiny' then 2
    when 'Small' then 4
    when 'Medium' then 8
    when 'Large' then 14
    when 'Massive' then 22
    when 'Tower Floor' then 15
    when 'Base' then 50
    else 4
  end;

  total_rolls := case loot_room_type
    when 'Secret Room' then greatest(1, ceil(base_rolls / 2.0)::int)
    when 'Tower Boss Room' then base_rolls * 2
    else base_rolls
  end;

  rare_multiplier := case
    when lower(loot_biome) like '%capital%' then 5
    when lower(loot_biome) like '%base%' then 2
    when lower(loot_biome) like '%camp%' then 1.33
    else 1
  end;

  for roll_number in 1..total_rolls loop
    select le.* into chosen
    from public.loot_entries le
    where loot_difficulty between le.min_difficulty and le.max_difficulty
      and (
        lower(loot_biome) = 'any'
        or lower(trim(le.biomes)) = 'any'
        or position(lower(loot_biome) in lower(le.biomes)) > 0
        or (
          lower(loot_biome) like '%tower%'
          and lower(le.biomes) like '%tower%'
        )
        or (
          lower(loot_biome) like '%base%'
          and lower(le.biomes) like '%base%'
        )
        or (
          lower(loot_biome) like '%camp%'
          and lower(le.biomes) like '%camp%'
        )
        or (
          lower(loot_biome) like '%mountain%'
          and lower(le.biomes) like '%mount%'
        )
      )
    order by
      -ln(greatest(random(), 0.0000001)) /
      (
        le.weight
        * case when le.rarity in ('Rare', 'Epic', 'Legendary', 'Mythical') then rare_multiplier else 1 end
        * case when lower(loot_biome) like '%tower%' and le.rarity in ('Epic', 'Legendary', 'Mythical') then 2 else 1 end
        * case when loot_room_type in ('Secret Room', 'Tower Boss Room') and le.rarity in ('Epic', 'Legendary', 'Mythical') then 2 else 1 end
      )
    limit 1;

    if chosen.id is not null then
      loot_entry_id := chosen.id;
      item_name := chosen.item_name;
      category := chosen.category;
      rarity := chosen.rarity;
      quantity := floor(random() * (chosen.max_quantity - chosen.min_quantity + 1) + chosen.min_quantity)::int;
      return next;
    end if;
  end loop;
end;
$$;

grant execute on function public.dm_roll_loot(text, int, text, text) to authenticated;

create or replace function public.dm_award_loot(
  target_character_id uuid,
  target_loot_entry_id uuid,
  award_quantity int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  loot public.loot_entries;
  denomination public.currency_denominations;
  copy_number int;
begin
  if not public.is_dm() then raise exception 'Only the DM may award loot.'; end if;
  if award_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;

  select * into loot from public.loot_entries where id = target_loot_entry_id;
  if loot.id is null then raise exception 'Loot entry not found.'; end if;

  if lower(loot.category) = 'currency' then
    select * into denomination
    from public.currency_denominations
    where lower(name) = lower(loot.item_name)
    order by sort_order
    limit 1;

    if denomination.id is null then
      raise exception 'Set up the matching currency system before awarding this currency.';
    end if;

    perform public.dm_adjust_currency(target_character_id, denomination.id, award_quantity);
    return award_quantity || ' ' || loot.item_name;
  end if;

  if loot.storage_capacity > 0 then
    for copy_number in 1..award_quantity loop
      perform public.place_inventory_item(
        target_character_id, loot.item_name, 1,
        loot.rarity || ' loot Â· ' || loot.category,
        loot.item_type, loot.storage_capacity, null
      );
    end loop;
  else
    perform public.place_inventory_item(
      target_character_id, loot.item_name, award_quantity,
      loot.rarity || ' loot Â· ' || loot.category,
      loot.item_type, 0, null
    );
  end if;

  return award_quantity || 'Ã— ' || loot.item_name;
end;
$$;

grant execute on function public.dm_award_loot(uuid, uuid, int) to authenticated;

-- Applies a class balance patch to every existing character using that class.
create or replace function public.apply_class_asset_patch(target_class_key text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  asset public.class_assets;
  changed_count integer;
begin
  if not public.is_dm() then
    raise exception 'Only the DM can patch existing characters.';
  end if;

  select * into asset
  from public.class_assets
  where class_key = target_class_key;

  if asset.id is null then
    raise exception 'Class asset not found.';
  end if;

  update public.characters
  set class_name = asset.name,
      max_hp = asset.health,
      current_hp = asset.health,
      max_mana = asset.mana,
      current_mana = asset.mana,
      inventory_slots = asset.inventory_slots,
      spell_slots = asset.spell_slots,
      attributes = asset.attributes
  where class_key = target_class_key
    and kind = 'player';

  get diagnostics changed_count = row_count;
  return changed_count;
end;
$$;

grant execute on function public.apply_class_asset_patch(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'class_assets'
  ) then
    alter publication supabase_realtime add table public.class_assets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'enemy_assets'
  ) then
    alter publication supabase_realtime add table public.enemy_assets;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cities'
  ) then
    alter publication supabase_realtime add table public.cities;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'city_vendors'
  ) then
    alter publication supabase_realtime add table public.city_vendors;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'market_products'
  ) then
    alter publication supabase_realtime add table public.market_products;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'character_wallets'
  ) then
    alter publication supabase_realtime add table public.character_wallets;
  end if;
end
$$;

-- ============================================================
-- Parchment-era campaign systems: spells, houses, and transfers
-- ============================================================

create table if not exists public.spells (
  id uuid primary key default gen_random_uuid(),
  spell_key text not null unique,
  name text not null,
  category text not null,
  mana_cost int not null default 0 check (mana_cost >= 0),
  mana_label text not null default 'Free',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.market_products
  add column if not exists spell_key text;

alter table public.market_products
  drop constraint if exists market_products_spell_key_fkey;

alter table public.market_products
  add constraint market_products_spell_key_fkey
  foreign key (spell_key) references public.spells(spell_key) on update cascade on delete set null;

create table if not exists public.character_spells (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  spell_id uuid not null references public.spells(id) on delete cascade,
  prepared_slot int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(character_id, spell_id),
  check (prepared_slot is null or prepared_slot >= 0)
);

create unique index if not exists character_prepared_spell_slot_unique
on public.character_spells(character_id, prepared_slot)
where prepared_slot is not null;

create table if not exists public.player_houses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  city_id uuid not null references public.cities(id) on delete cascade,
  name text not null default 'Calostrynn Home',
  capacity int not null default 50 check (capacity between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.house_inventory_items (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.player_houses(id) on delete cascade,
  item_name text not null,
  quantity int not null default 1 check (quantity > 0),
  notes text not null default '',
  item_type text not null default 'misc'
    check (item_type in ('weapon', 'armor', 'consumable', 'tool', 'quest', 'misc')),
  slot_index int not null check (slot_index >= 0),
  is_storage boolean not null default false,
  storage_capacity int not null default 0 check (storage_capacity between 0 and 500),
  source_product_id uuid references public.market_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(house_id, slot_index)
);

create table if not exists public.item_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  source_character_id uuid not null references public.characters(id) on delete cascade,
  target_character_id uuid not null references public.characters(id) on delete cascade,
  source_item_id uuid references public.inventory_items(id) on delete set null,
  item_name text not null,
  quantity int not null check (quantity > 0),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists item_transfer_recipient_pending_idx
on public.item_transfer_requests(recipient_user_id, status, created_at);

drop trigger if exists spells_set_updated_at on public.spells;
create trigger spells_set_updated_at before update on public.spells
for each row execute function public.set_updated_at();

drop trigger if exists character_spells_set_updated_at on public.character_spells;
create trigger character_spells_set_updated_at before update on public.character_spells
for each row execute function public.set_updated_at();

drop trigger if exists player_houses_set_updated_at on public.player_houses;
create trigger player_houses_set_updated_at before update on public.player_houses
for each row execute function public.set_updated_at();

drop trigger if exists house_inventory_items_set_updated_at on public.house_inventory_items;
create trigger house_inventory_items_set_updated_at before update on public.house_inventory_items
for each row execute function public.set_updated_at();

alter table public.spells enable row level security;
alter table public.character_spells enable row level security;
alter table public.player_houses enable row level security;
alter table public.house_inventory_items enable row level security;
alter table public.item_transfer_requests enable row level security;

drop policy if exists "spells_read" on public.spells;
create policy "spells_read" on public.spells for select to authenticated using (true);
drop policy if exists "spells_dm_all" on public.spells;
create policy "spells_dm_all" on public.spells for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "character_spells_owner_or_dm_read" on public.character_spells;
create policy "character_spells_owner_or_dm_read" on public.character_spells for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = character_spells.character_id and c.owner_user_id = auth.uid()
  )
);
drop policy if exists "character_spells_dm_all" on public.character_spells;
create policy "character_spells_dm_all" on public.character_spells for all to authenticated
using (public.is_dm()) with check (public.is_dm());

drop policy if exists "houses_owner_or_dm_read" on public.player_houses;
create policy "houses_owner_or_dm_read" on public.player_houses for select to authenticated
using (public.is_dm() or owner_user_id = auth.uid());
drop policy if exists "houses_dm_all" on public.player_houses;
create policy "houses_dm_all" on public.player_houses for all to authenticated
using (public.is_dm()) with check (public.is_dm());

drop policy if exists "house_items_owner_or_dm_read" on public.house_inventory_items;
create policy "house_items_owner_or_dm_read" on public.house_inventory_items for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.player_houses h
    where h.id = house_inventory_items.house_id and h.owner_user_id = auth.uid()
  )
);
drop policy if exists "house_items_owner_or_dm_delete" on public.house_inventory_items;
create policy "house_items_owner_or_dm_delete" on public.house_inventory_items for delete to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.player_houses h
    where h.id = house_inventory_items.house_id and h.owner_user_id = auth.uid()
  )
);
drop policy if exists "house_items_dm_all" on public.house_inventory_items;
create policy "house_items_dm_all" on public.house_inventory_items for all to authenticated
using (public.is_dm()) with check (public.is_dm());

drop policy if exists "transfers_participant_read" on public.item_transfer_requests;
create policy "transfers_participant_read" on public.item_transfer_requests for select to authenticated
using (public.is_dm() or sender_user_id = auth.uid() or recipient_user_id = auth.uid());

create or replace function public.character_inventory_free_slots(target_character_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select inventory_slots from public.characters where id = target_character_id
  ),
  main_used as (
    select count(*)::int as used
    from public.inventory_items
    where character_id = target_character_id
      and parent_item_id is null
      and is_storage = false
      and slot_index >= 0
  ),
  container_space as (
    select coalesce(sum(greatest(0, storage.storage_capacity - coalesce(contents.used, 0))), 0)::int as free
    from public.inventory_items storage
    left join (
      select parent_item_id, count(*)::int as used
      from public.inventory_items
      where parent_item_id is not null
      group by parent_item_id
    ) contents on contents.parent_item_id = storage.id
    where storage.character_id = target_character_id and storage.is_storage = true
  )
  select greatest(0, coalesce((select inventory_slots from target), 0) - coalesce((select used from main_used), 0))
       + coalesce((select free from container_space), 0);
$$;

revoke all on function public.character_inventory_free_slots(uuid) from public;

create or replace function public.get_character_transfer_capacity()
returns table(character_id uuid, free_slots int)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, public.character_inventory_free_slots(c.id)
  from public.characters c
  where c.kind = 'player' and c.owner_user_id is not null
  order by c.name;
$$;

grant execute on function public.get_character_transfer_capacity() to authenticated;

create or replace function public.request_item_transfer(
  target_source_item_id uuid,
  target_character_id uuid,
  transfer_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_item public.inventory_items;
  source_character public.characters;
  target_character public.characters;
  already_pending int;
  request_id uuid;
begin
  if transfer_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;

  select * into source_item from public.inventory_items where id = target_source_item_id for update;
  if source_item.id is null then raise exception 'Item not found.'; end if;
  select * into source_character from public.characters where id = source_item.character_id;
  select * into target_character from public.characters where id = target_character_id;

  if target_character.id is null or target_character.owner_user_id is null then
    raise exception 'Choose a character assigned to a player.';
  end if;
  if target_character.id = source_character.id then raise exception 'Choose another character.'; end if;
  if not public.is_dm() and source_character.owner_user_id is distinct from auth.uid() then
    raise exception 'You do not control the source character.';
  end if;

  select coalesce(sum(quantity), 0)::int into already_pending
  from public.item_transfer_requests
  where source_item_id = target_source_item_id and status = 'pending';

  if transfer_quantity + already_pending > source_item.quantity then
    raise exception 'That quantity is already committed to another transfer.';
  end if;

  if source_item.is_storage then
    if transfer_quantity <> 1 or source_item.quantity <> 1 then raise exception 'Storage items transfer one at a time.'; end if;
    if exists (select 1 from public.inventory_items where parent_item_id = source_item.id) then
      raise exception 'Empty this storage item before transferring it.';
    end if;
  elsif public.character_inventory_free_slots(target_character.id) <= 0 then
    raise exception '% has a full inventory.', target_character.name;
  end if;

  insert into public.item_transfer_requests (
    sender_user_id, recipient_user_id, source_character_id, target_character_id,
    source_item_id, item_name, quantity
  ) values (
    auth.uid(), target_character.owner_user_id, source_character.id, target_character.id,
    source_item.id, source_item.item_name, transfer_quantity
  ) returning id into request_id;

  return request_id;
end;
$$;

grant execute on function public.request_item_transfer(uuid, uuid, int) to authenticated;

create or replace function public.resolve_item_transfer(
  target_request_id uuid,
  resolution text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.item_transfer_requests;
  source_item public.inventory_items;
begin
  select * into request_row
  from public.item_transfer_requests
  where id = target_request_id
  for update;

  if request_row.id is null or request_row.status <> 'pending' then
    raise exception 'This transfer is no longer pending.';
  end if;

  if resolution = 'cancelled' then
    if not public.is_dm() and request_row.sender_user_id is distinct from auth.uid() then raise exception 'Only the sender can cancel this request.'; end if;
    update public.item_transfer_requests set status = 'cancelled', resolved_at = now() where id = request_row.id;
    return 'Transfer cancelled.';
  end if;

  if not public.is_dm() and request_row.recipient_user_id is distinct from auth.uid() then
    raise exception 'Only the recipient can answer this request.';
  end if;

  if resolution = 'declined' then
    update public.item_transfer_requests set status = 'declined', resolved_at = now() where id = request_row.id;
    return 'Transfer declined.';
  end if;

  if resolution <> 'accepted' then raise exception 'Unknown transfer response.'; end if;

  select * into source_item
  from public.inventory_items
  where id = request_row.source_item_id
  for update;

  if source_item.id is null or source_item.quantity < request_row.quantity then
    raise exception 'The source item or quantity is no longer available.';
  end if;

  if source_item.is_storage then
    if exists (select 1 from public.inventory_items where parent_item_id = source_item.id) then
      raise exception 'The storage item must be empty before transfer.';
    end if;
  elsif public.character_inventory_free_slots(request_row.target_character_id) <= 0 then
    raise exception 'The receiving character has a full inventory.';
  end if;

  perform public.place_inventory_item(
    request_row.target_character_id,
    source_item.item_name,
    request_row.quantity,
    source_item.notes,
    source_item.item_type,
    case when source_item.is_storage then source_item.storage_capacity else 0 end,
    source_item.source_product_id
  );

  update public.item_transfer_requests
  set status = 'accepted', resolved_at = now()
  where id = request_row.id;

  if source_item.quantity = request_row.quantity then
    delete from public.inventory_items where id = source_item.id;
  else
    update public.inventory_items
    set quantity = quantity - request_row.quantity
    where id = source_item.id;
  end if;

  return request_row.quantity || 'Ã— ' || request_row.item_name || ' transferred.';
end;
$$;

grant execute on function public.resolve_item_transfer(uuid, text) to authenticated;

create or replace function public.ensure_player_house(target_owner_user_id uuid default null)
returns public.player_houses
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_owner uuid := coalesce(target_owner_user_id, auth.uid());
  calostrynn_id uuid;
  result public.player_houses;
begin
  if requested_owner is distinct from auth.uid() and not public.is_dm() then
    raise exception 'You can only open your own house.';
  end if;

  select id into calostrynn_id from public.cities where city_key = 'calostrynn';
  if calostrynn_id is null then raise exception 'Calostrynn must be created first.'; end if;

  insert into public.player_houses(owner_user_id, city_id, name, capacity)
  values (requested_owner, calostrynn_id, 'Calostrynn Home', 50)
  on conflict (owner_user_id) do update set city_id = excluded.city_id
  returning * into result;

  return result;
end;
$$;

grant execute on function public.ensure_player_house(uuid) to authenticated;

create or replace function public.move_inventory_item_to_house(
  target_source_item_id uuid,
  move_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_item public.inventory_items;
  source_character public.characters;
  house public.player_houses;
  chosen_slot int;
  result_id uuid;
begin
  if move_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into source_item from public.inventory_items where id = target_source_item_id for update;
  if source_item.id is null or source_item.quantity < move_quantity then raise exception 'Item quantity is no longer available.'; end if;
  select * into source_character from public.characters where id = source_item.character_id;
  if source_character.owner_user_id is null then raise exception 'The character needs an assigned player.'; end if;
  if not public.is_dm() and source_character.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;

  select * into house from public.ensure_player_house(source_character.owner_user_id);
  select slot into chosen_slot
  from generate_series(0, house.capacity - 1) slot
  where not exists (
    select 1 from public.house_inventory_items h
    where h.house_id = house.id and h.slot_index = slot
  )
  order by slot limit 1;
  if chosen_slot is null then raise exception 'The house is full.'; end if;

  if source_item.is_storage then
    if move_quantity <> 1 or source_item.quantity <> 1 then raise exception 'Storage items move one at a time.'; end if;
    if exists (select 1 from public.inventory_items where parent_item_id = source_item.id) then raise exception 'Empty this storage item before moving it home.'; end if;
  end if;

  insert into public.house_inventory_items (
    house_id, item_name, quantity, notes, item_type, slot_index,
    is_storage, storage_capacity, source_product_id
  ) values (
    house.id, source_item.item_name, move_quantity, source_item.notes, source_item.item_type, chosen_slot,
    source_item.is_storage, source_item.storage_capacity, source_item.source_product_id
  ) returning id into result_id;

  if source_item.quantity = move_quantity then delete from public.inventory_items where id = source_item.id;
  else update public.inventory_items set quantity = quantity - move_quantity where id = source_item.id;
  end if;

  return result_id;
end;
$$;

grant execute on function public.move_inventory_item_to_house(uuid, int) to authenticated;

create or replace function public.move_house_item_to_character(
  target_house_item_id uuid,
  target_character_id uuid,
  move_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  house_item public.house_inventory_items;
  house public.player_houses;
  target_character public.characters;
  result_id uuid;
begin
  if move_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into house_item from public.house_inventory_items where id = target_house_item_id for update;
  if house_item.id is null or house_item.quantity < move_quantity then raise exception 'House item quantity is no longer available.'; end if;
  select * into house from public.player_houses where id = house_item.house_id;
  select * into target_character from public.characters where id = target_character_id;

  if not public.is_dm() and house.owner_user_id is distinct from auth.uid() then raise exception 'You do not control this house.'; end if;
  if not public.is_dm() and target_character.owner_user_id is distinct from house.owner_user_id then
    raise exception 'That character does not share this house.';
  end if;

  result_id := public.place_inventory_item(
    target_character.id, house_item.item_name, move_quantity, house_item.notes,
    house_item.item_type, case when house_item.is_storage then house_item.storage_capacity else 0 end,
    house_item.source_product_id
  );

  if house_item.quantity = move_quantity then delete from public.house_inventory_items where id = house_item.id;
  else update public.house_inventory_items set quantity = quantity - move_quantity where id = house_item.id;
  end if;

  return result_id;
end;
$$;

grant execute on function public.move_house_item_to_character(uuid, uuid, int) to authenticated;

create or replace function public.set_character_spell_prepared(
  target_character_spell_id uuid,
  desired_slot int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  known_spell public.character_spells;
  target_character public.characters;
begin
  select * into known_spell from public.character_spells where id = target_character_spell_id;
  if known_spell.id is null then raise exception 'Known spell not found.'; end if;
  select * into target_character from public.characters where id = known_spell.character_id;
  if not public.is_dm() and target_character.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;

  if desired_slot is null then
    update public.character_spells set prepared_slot = null where id = known_spell.id;
    return;
  end if;
  if desired_slot < 0 or desired_slot >= target_character.spell_slots then raise exception 'That prepared slot is unavailable.'; end if;

  update public.character_spells
  set prepared_slot = null
  where character_id = target_character.id and prepared_slot = desired_slot;

  update public.character_spells
  set prepared_slot = desired_slot
  where id = known_spell.id;
end;
$$;

grant execute on function public.set_character_spell_prepared(uuid, int) to authenticated;

create or replace function public.normalize_prepared_spell_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.spell_slots < old.spell_slots then
    update public.character_spells
    set prepared_slot = null
    where character_id = new.id and prepared_slot >= new.spell_slots;
  end if;
  return new;
end;
$$;

drop trigger if exists characters_normalize_spell_slots on public.characters;
create trigger characters_normalize_spell_slots
after update of spell_slots on public.characters
for each row execute function public.normalize_prepared_spell_slots();

create or replace function public.use_character_spell(
  target_character_spell_id uuid,
  mana_spent_override int default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  known_spell record;
  mana_spent int;
  remaining_mana int;
begin
  select cs.*, s.mana_cost, s.mana_label, c.owner_user_id, c.current_mana
  into known_spell
  from public.character_spells cs
  join public.spells s on s.id = cs.spell_id
  join public.characters c on c.id = cs.character_id
  where cs.id = target_character_spell_id;

  if known_spell.id is null then raise exception 'Known spell not found.'; end if;
  if not public.is_dm() and known_spell.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;
  if known_spell.prepared_slot is null then raise exception 'Prepare this spell before using it.'; end if;

  mana_spent := case
    when known_spell.mana_label = '3d20 Mana' then coalesce(mana_spent_override, 0)
    else known_spell.mana_cost
  end;
  if mana_spent < 0 then raise exception 'Mana spent cannot be negative.'; end if;
  if known_spell.mana_label = '3d20 Mana' and mana_spent not between 3 and 60 then
    raise exception 'Pure Chaos must spend the rolled 3d20 result (3â€“60 Mana).';
  end if;
  if known_spell.current_mana < mana_spent then raise exception 'Not enough Mana.'; end if;

  update public.characters
  set current_mana = current_mana - mana_spent
  where id = known_spell.character_id
  returning current_mana into remaining_mana;

  return remaining_mana;
end;
$$;

grant execute on function public.use_character_spell(uuid, int) to authenticated;

create or replace function public.dm_grant_spell(
  target_character_id uuid,
  target_spell_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  available_slot int;
  result_id uuid;
begin
  if not public.is_dm() then raise exception 'Only the DM may grant spells.'; end if;
  select slot into available_slot
  from generate_series(0, greatest((select spell_slots from public.characters where id = target_character_id) - 1, -1)) slot
  where not exists (
    select 1 from public.character_spells cs
    where cs.character_id = target_character_id and cs.prepared_slot = slot
  )
  order by slot limit 1;

  insert into public.character_spells(character_id, spell_id, prepared_slot)
  values (target_character_id, target_spell_id, available_slot)
  on conflict (character_id, spell_id) do nothing
  returning id into result_id;

  if result_id is null then raise exception 'This character already knows that spell.'; end if;
  return result_id;
end;
$$;

grant execute on function public.dm_grant_spell(uuid, uuid) to authenticated;

create or replace function public.purchase_market_item(
  target_character_id uuid,
  target_listing_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  listing record;
  current_balance bigint;
  character_spell_slots int;
  available_spell_slot int;
  purchased_spell_id uuid;
begin
  select p.*, c.currency_system_id, c.is_open, c.is_discovered
  into listing
  from public.market_listings ml
  join public.market_products p on p.id = ml.product_id
  join public.city_vendors v on v.id = ml.vendor_id
  join public.city_facilities f on f.id = v.facility_id
  join public.cities c on c.id = f.city_id
  where ml.id = target_listing_id;

  if listing.id is null then raise exception 'Market item not found.'; end if;
  if not listing.is_discovered or not listing.is_open then raise exception 'This city is not currently available.'; end if;
  if not listing.is_available or listing.price_base <= 0 then raise exception 'This item is not currently for sale.'; end if;
  if listing.stock_quantity is not null and listing.stock_quantity <= 0 then raise exception 'This item is out of stock.'; end if;
  if not public.is_dm() and not exists (
    select 1 from public.characters where id = target_character_id and owner_user_id = auth.uid()
  ) then raise exception 'You do not control that character.'; end if;

  insert into public.character_wallets(character_id, currency_system_id, balance_base)
  values (target_character_id, listing.currency_system_id, 0)
  on conflict (character_id, currency_system_id) do nothing;

  select balance_base into current_balance
  from public.character_wallets
  where character_id = target_character_id and currency_system_id = listing.currency_system_id
  for update;

  if current_balance < listing.price_base then raise exception 'Not enough currency.'; end if;

  if listing.spell_key is not null then
    select id into purchased_spell_id from public.spells where spell_key = listing.spell_key;
    if purchased_spell_id is null then raise exception 'Spell record not found.'; end if;
    if exists (
      select 1 from public.character_spells
      where character_id = target_character_id and spell_id = purchased_spell_id
    ) then raise exception 'This character already knows that spell.'; end if;

    select spell_slots into character_spell_slots from public.characters where id = target_character_id;
    select slot into available_spell_slot
    from generate_series(0, greatest(character_spell_slots - 1, -1)) slot
    where not exists (
      select 1 from public.character_spells cs
      where cs.character_id = target_character_id and cs.prepared_slot = slot
    )
    order by slot limit 1;

    insert into public.character_spells(character_id, spell_id, prepared_slot)
    values (target_character_id, purchased_spell_id, available_spell_slot);
  else
    perform public.place_inventory_item(
      target_character_id, listing.name, 1, listing.description,
      listing.item_type, listing.storage_capacity, listing.id
    );
  end if;

  update public.character_wallets
  set balance_base = balance_base - listing.price_base
  where character_id = target_character_id and currency_system_id = listing.currency_system_id;

  if listing.stock_quantity is not null then
    update public.market_products set stock_quantity = stock_quantity - 1 where id = listing.id;
  end if;

  return listing.name;
end;
$$;

grant execute on function public.purchase_market_item(uuid, uuid) to authenticated;

create or replace function public.bestiary_progress()
returns table(unlocked int, total int)
language sql
stable
security definer
set search_path = public
as $$
  select count(*) filter (where is_discovered)::int, count(*)::int
  from public.enemy_assets;
$$;

grant execute on function public.bestiary_progress() to authenticated;

-- Remove superseded storefront records when this upgrade is applied to an existing campaign.
delete from public.market_listings
where vendor_id in (select id from public.city_vendors where vendor_key = 'florist')
   or product_id in (select id from public.market_products where product_key = 'spell-tomes');
delete from public.city_vendors where vendor_key = 'florist';
delete from public.city_facilities where facility_key = 'florist';
delete from public.market_products where product_key = 'spell-tomes';

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_spells'
  ) then alter publication supabase_realtime add table public.character_spells; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'house_inventory_items'
  ) then alter publication supabase_realtime add table public.house_inventory_items; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'item_transfer_requests'
  ) then alter publication supabase_realtime add table public.item_transfer_requests; end if;
end
$$;

-- ============================================================
-- Interaction polish: rarity, partial drops, combat loadouts,
-- and Beastmaster companions
-- ============================================================

alter table public.inventory_items
  add column if not exists rarity text not null default 'Common';

alter table public.house_inventory_items
  add column if not exists rarity text not null default 'Common';

create or replace function public.place_inventory_item_with_rarity(
  target_character_id uuid,
  new_name text,
  new_quantity int,
  new_notes text,
  new_item_type text,
  new_storage_capacity int default 0,
  new_source_product_id uuid default null,
  new_rarity text default 'Common'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  result_id := public.place_inventory_item(
    target_character_id, new_name, new_quantity, new_notes,
    new_item_type, new_storage_capacity, new_source_product_id
  );
  update public.inventory_items
  set rarity = coalesce(nullif(new_rarity, ''), 'Common')
  where id = result_id;
  return result_id;
end;
$$;

revoke all on function public.place_inventory_item_with_rarity(uuid, text, int, text, text, int, uuid, text) from public;

create or replace function public.dm_award_loot(
  target_character_id uuid,
  target_loot_entry_id uuid,
  award_quantity int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  loot public.loot_entries;
  denomination public.currency_denominations;
  copy_number int;
begin
  if not public.is_dm() then raise exception 'Only the DM may award loot.'; end if;
  if award_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;

  select * into loot from public.loot_entries where id = target_loot_entry_id;
  if loot.id is null then raise exception 'Loot entry not found.'; end if;

  if lower(loot.category) = 'currency' then
    select * into denomination
    from public.currency_denominations
    where lower(name) = lower(loot.item_name)
    order by sort_order
    limit 1;
    if denomination.id is null then raise exception 'Set up the matching currency system before awarding this currency.'; end if;
    perform public.dm_adjust_currency(target_character_id, denomination.id, award_quantity);
    return award_quantity || ' ' || loot.item_name;
  end if;

  if loot.storage_capacity > 0 then
    for copy_number in 1..award_quantity loop
      perform public.place_inventory_item_with_rarity(
        target_character_id, loot.item_name, 1, '',
        loot.item_type, loot.storage_capacity, null, loot.rarity
      );
    end loop;
  else
    perform public.place_inventory_item_with_rarity(
      target_character_id, loot.item_name, award_quantity, '',
      loot.item_type, 0, null, loot.rarity
    );
  end if;
  return award_quantity || '× ' || loot.item_name;
end;
$$;

grant execute on function public.dm_award_loot(uuid, uuid, int) to authenticated;

create or replace function public.drop_inventory_item(
  target_item_id uuid,
  drop_quantity int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  item public.inventory_items;
  owner_id uuid;
begin
  if drop_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into item from public.inventory_items where id = target_item_id for update;
  if item.id is null then raise exception 'Item not found.'; end if;
  select owner_user_id into owner_id from public.characters where id = item.character_id;
  if not public.is_dm() and owner_id is distinct from auth.uid() then raise exception 'You do not control this item.'; end if;
  if drop_quantity > item.quantity then raise exception 'You cannot drop more than the stack contains.'; end if;
  if item.is_storage and exists (select 1 from public.inventory_items where parent_item_id = item.id) then
    raise exception 'Empty this storage item before dropping it.';
  end if;
  if item.is_storage and drop_quantity <> item.quantity then raise exception 'Storage items must be dropped as a whole.'; end if;

  if drop_quantity = item.quantity then delete from public.inventory_items where id = item.id;
  else update public.inventory_items set quantity = quantity - drop_quantity where id = item.id;
  end if;
  return drop_quantity || '× ' || item.item_name || ' dropped.';
end;
$$;

grant execute on function public.drop_inventory_item(uuid, int) to authenticated;

create or replace function public.dm_grant_market_item(
  target_character_id uuid,
  target_product_id uuid,
  quantity_input int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  product public.market_products;
  copy_number int;
  result_id uuid;
begin
  if not public.is_dm() then raise exception 'Only the DM may grant items.'; end if;
  if quantity_input <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into product from public.market_products where id = target_product_id;
  if product.id is null then raise exception 'Product not found.'; end if;

  if product.storage_capacity > 0 then
    for copy_number in 1..quantity_input loop
      result_id := public.place_inventory_item_with_rarity(
        target_character_id, product.name, 1, '',
        product.item_type, product.storage_capacity, product.id, 'Common'
      );
    end loop;
  else
    result_id := public.place_inventory_item_with_rarity(
      target_character_id, product.name, quantity_input, '',
      product.item_type, 0, product.id, 'Common'
    );
  end if;
  return result_id;
end;
$$;

grant execute on function public.dm_grant_market_item(uuid, uuid, int) to authenticated;

create or replace function public.resolve_item_transfer(
  target_request_id uuid,
  resolution text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.item_transfer_requests;
  source_item public.inventory_items;
begin
  select * into request_row from public.item_transfer_requests where id = target_request_id for update;
  if request_row.id is null or request_row.status <> 'pending' then raise exception 'This transfer is no longer pending.'; end if;
  if resolution = 'cancelled' then
    if not public.is_dm() and request_row.sender_user_id is distinct from auth.uid() then raise exception 'Only the sender can cancel this request.'; end if;
    update public.item_transfer_requests set status = 'cancelled', resolved_at = now() where id = request_row.id;
    return 'Transfer cancelled.';
  end if;
  if not public.is_dm() and request_row.recipient_user_id is distinct from auth.uid() then raise exception 'Only the recipient can answer this request.'; end if;
  if resolution = 'declined' then
    update public.item_transfer_requests set status = 'declined', resolved_at = now() where id = request_row.id;
    return 'Transfer declined.';
  end if;
  if resolution <> 'accepted' then raise exception 'Unknown transfer response.'; end if;

  select * into source_item from public.inventory_items where id = request_row.source_item_id for update;
  if source_item.id is null or source_item.quantity < request_row.quantity then raise exception 'The source item or quantity is no longer available.'; end if;
  if source_item.is_storage and exists (select 1 from public.inventory_items where parent_item_id = source_item.id) then raise exception 'The storage item must be empty before transfer.'; end if;
  if not source_item.is_storage and public.character_inventory_free_slots(request_row.target_character_id) <= 0 then raise exception 'The receiving character has a full inventory.'; end if;

  perform public.place_inventory_item_with_rarity(
    request_row.target_character_id, source_item.item_name, request_row.quantity, '',
    source_item.item_type, case when source_item.is_storage then source_item.storage_capacity else 0 end,
    source_item.source_product_id, source_item.rarity
  );
  update public.item_transfer_requests set status = 'accepted', resolved_at = now() where id = request_row.id;
  if source_item.quantity = request_row.quantity then delete from public.inventory_items where id = source_item.id;
  else update public.inventory_items set quantity = quantity - request_row.quantity where id = source_item.id;
  end if;
  return request_row.quantity || '× ' || request_row.item_name || ' transferred.';
end;
$$;

grant execute on function public.resolve_item_transfer(uuid, text) to authenticated;

create or replace function public.use_character_spell(
  target_character_spell_id uuid,
  mana_spent_override int default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  known_spell record;
  mana_spent int;
  remaining_mana int;
  active_combatant_id uuid;
begin
  select cs.*, s.mana_cost, s.mana_label, c.owner_user_id, c.current_mana
  into known_spell
  from public.character_spells cs
  join public.spells s on s.id = cs.spell_id
  join public.characters c on c.id = cs.character_id
  where cs.id = target_character_spell_id;
  if known_spell.id is null then raise exception 'Known spell not found.'; end if;
  if not public.is_dm() and known_spell.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;
  if known_spell.prepared_slot is null then raise exception 'Prepare this spell before using it.'; end if;

  mana_spent := case when known_spell.mana_label = '3d20 Mana' then coalesce(mana_spent_override, 0) else known_spell.mana_cost end;
  if mana_spent < 0 then raise exception 'Mana spent cannot be negative.'; end if;
  if known_spell.mana_label = '3d20 Mana' and mana_spent not between 3 and 60 then raise exception 'Pure Chaos must spend the rolled 3d20 result (3–60 Mana).'; end if;

  select cb.id into active_combatant_id
  from public.combatants cb
  join public.battles b on b.id = cb.battle_id
  where cb.character_id = known_spell.character_id and b.status = 'active'
  limit 1;

  if active_combatant_id is not null then
    update public.combatants
    set current_mana = current_mana - mana_spent
    where id = active_combatant_id and current_mana >= mana_spent
    returning current_mana into remaining_mana;
    if remaining_mana is null then raise exception 'Not enough Mana.'; end if;
  else
    update public.characters
    set current_mana = current_mana - mana_spent
    where id = known_spell.character_id and current_mana >= mana_spent
    returning current_mana into remaining_mana;
    if remaining_mana is null then raise exception 'Not enough Mana.'; end if;
  end if;
  return remaining_mana;
end;
$$;

grant execute on function public.use_character_spell(uuid, int) to authenticated;

create table if not exists public.tamed_beasts (
  id uuid primary key default gen_random_uuid(),
  beastmaster_character_id uuid not null references public.characters(id) on delete cascade,
  battle_character_id uuid not null unique references public.characters(id) on delete cascade,
  name text not null,
  wild_score int not null check (wild_score between 1 and 20),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists tamed_beasts_set_updated_at on public.tamed_beasts;
create trigger tamed_beasts_set_updated_at before update on public.tamed_beasts
for each row execute function public.set_updated_at();

alter table public.tamed_beasts enable row level security;
drop policy if exists "tamed_beasts_owner_or_dm_read" on public.tamed_beasts;
create policy "tamed_beasts_owner_or_dm_read" on public.tamed_beasts for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = tamed_beasts.beastmaster_character_id and c.owner_user_id = auth.uid()
  )
);
drop policy if exists "tamed_beasts_dm_all" on public.tamed_beasts;
create policy "tamed_beasts_dm_all" on public.tamed_beasts for all to authenticated
using (public.is_dm()) with check (public.is_dm());

create or replace function public.create_tamed_beast(
  target_beastmaster_id uuid,
  beast_name text,
  beast_wild_score int,
  beast_hp int,
  beast_mana int,
  beast_token_color text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  beastmaster public.characters;
  companion_id uuid;
  beast_id uuid;
begin
  if not public.is_dm() then raise exception 'Only the DM may add tamed beasts.'; end if;
  select * into beastmaster from public.characters where id = target_beastmaster_id;
  if beastmaster.id is null or beastmaster.class_key <> 'beastmaster' then raise exception 'Choose a Beastmaster.'; end if;
  if beast_wild_score not between 1 and 20 then raise exception 'Wild score must be between 1 and 20.'; end if;

  insert into public.characters (
    name, class_name, class_key, kind, owner_user_id,
    max_hp, current_hp, max_mana, current_mana,
    level, inventory_slots, spell_slots, notes, token_color
  ) values (
    trim(beast_name), 'Tamed Beast', 'tamed-beast', 'npc', beastmaster.owner_user_id,
    greatest(beast_hp, 0), greatest(beast_hp, 0), greatest(beast_mana, 0), greatest(beast_mana, 0),
    1, 0, 0, 'Tamed companion of ' || beastmaster.name, beast_token_color
  ) returning id into companion_id;

  insert into public.tamed_beasts(beastmaster_character_id, battle_character_id, name, wild_score)
  values (beastmaster.id, companion_id, trim(beast_name), beast_wild_score)
  returning id into beast_id;
  return beast_id;
end;
$$;

grant execute on function public.create_tamed_beast(uuid, text, int, int, int, text) to authenticated;

create or replace function public.set_tamed_beast_active(
  target_beast_id uuid,
  desired_active boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  beast public.tamed_beasts;
  owner_id uuid;
  current_total int;
  remove_id uuid;
begin
  select * into beast from public.tamed_beasts where id = target_beast_id;
  if beast.id is null then raise exception 'Tamed beast not found.'; end if;
  select owner_user_id into owner_id from public.characters where id = beast.beastmaster_character_id;
  if not public.is_dm() and owner_id is distinct from auth.uid() then raise exception 'You do not control this Beastmaster.'; end if;

  update public.tamed_beasts set is_active = desired_active where id = beast.id;
  if desired_active then
    loop
      select coalesce(sum(wild_score), 0)::int into current_total
      from public.tamed_beasts
      where beastmaster_character_id = beast.beastmaster_character_id and is_active;
      exit when current_total <= 20;

      select id into remove_id
      from public.tamed_beasts
      where beastmaster_character_id = beast.beastmaster_character_id
        and is_active and id <> beast.id
      order by random()
      limit 1;

      if remove_id is null then
        update public.tamed_beasts set is_active = false where id = beast.id;
        return beast.name || ' cannot be active because its Wild score exceeds the remaining limit.';
      end if;
      update public.tamed_beasts set is_active = false where id = remove_id;
    end loop;
  end if;
  return case when desired_active then beast.name || ' is active.' else beast.name || ' is inactive.' end;
end;
$$;

grant execute on function public.set_tamed_beast_active(uuid, boolean) to authenticated;

create or replace function public.delete_tamed_beast(target_beast_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  beast public.tamed_beasts;
begin
  if not public.is_dm() then raise exception 'Only the DM may remove a tamed beast.'; end if;
  select * into beast from public.tamed_beasts where id = target_beast_id;
  if beast.id is null then return; end if;
  delete from public.characters where id = beast.battle_character_id;
end;
$$;

grant execute on function public.delete_tamed_beast(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tamed_beasts'
  ) then alter publication supabase_realtime add table public.tamed_beasts; end if;
end
$$;

-- ============================================================
-- Inventory arranging, unique storage gear, and endless holding
-- ============================================================

create or replace function public.place_inventory_item(
  target_character_id uuid,
  new_name text,
  new_quantity int,
  new_notes text,
  new_item_type text,
  new_storage_capacity int default 0,
  new_source_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  character_slots int;
  chosen_slot int;
  chosen_parent uuid;
  container record;
  result_id uuid;
  container_limit int;
begin
  select inventory_slots into character_slots
  from public.characters
  where id = target_character_id;

  if character_slots is null then
    raise exception 'Character not found.';
  end if;

  if new_storage_capacity > 0 then
    if new_source_product_id is not null and exists (
      select 1
      from public.inventory_items
      where character_id = target_character_id
        and is_storage = true
        and source_product_id = new_source_product_id
    ) then
      raise exception 'This character already owns that storage item.';
    end if;

    insert into public.inventory_items (
      character_id, item_name, quantity, notes, item_type, slot_index,
      parent_item_id, is_storage, storage_capacity, source_product_id
    ) values (
      target_character_id, new_name, 1, new_notes, new_item_type, -1,
      null, true, new_storage_capacity, new_source_product_id
    ) returning id into result_id;
    return result_id;
  end if;

  select slot into chosen_slot
  from generate_series(0, greatest(character_slots - 1, -1)) as slot
  where not exists (
    select 1 from public.inventory_items i
    where i.character_id = target_character_id
      and i.parent_item_id is null
      and i.is_storage = false
      and i.slot_index = slot
  )
  order by slot
  limit 1;

  if chosen_slot is null then
    for container in
      select id, storage_capacity, item_name
      from public.inventory_items
      where character_id = target_character_id and is_storage = true
      order by case when lower(trim(item_name)) = 'bag of holding' then 0 else 1 end, created_at
    loop
      if lower(trim(container.item_name)) = 'bag of holding' then
        select greatest(
          container.storage_capacity - 1,
          coalesce(max(slot_index), -1) + 1
        ) into container_limit
        from public.inventory_items
        where parent_item_id = container.id;
      else
        container_limit := container.storage_capacity - 1;
      end if;

      select slot into chosen_slot
      from generate_series(0, greatest(container_limit, -1)) as slot
      where not exists (
        select 1 from public.inventory_items i
        where i.parent_item_id = container.id and i.slot_index = slot
      )
      order by slot
      limit 1;

      if chosen_slot is not null then
        chosen_parent := container.id;
        exit;
      end if;
    end loop;
  end if;

  if chosen_slot is null then
    raise exception 'No inventory space available.';
  end if;

  insert into public.inventory_items (
    character_id, item_name, quantity, notes, item_type, slot_index,
    parent_item_id, is_storage, storage_capacity, source_product_id
  ) values (
    target_character_id, new_name, greatest(new_quantity, 1), new_notes, new_item_type, chosen_slot,
    chosen_parent, false, 0, new_source_product_id
  ) returning id into result_id;

  return result_id;
end;
$$;

create or replace function public.move_inventory_item_slot(
  target_item_id uuid,
  target_parent_item_id uuid,
  target_slot_index int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moving public.inventory_items;
  destination public.inventory_items;
  target_container public.inventory_items;
  source_parent uuid;
  source_slot int;
  main_capacity int;
begin
  if target_slot_index < 0 then raise exception 'Choose a valid inventory slot.'; end if;

  select * into moving
  from public.inventory_items
  where id = target_item_id
  for update;

  if moving.id is null then raise exception 'Item not found.'; end if;
  if moving.is_storage then raise exception 'Storage containers cannot be placed inside another container.'; end if;
  if not public.is_dm() and not exists (
    select 1 from public.characters
    where id = moving.character_id and owner_user_id = auth.uid()
  ) then
    raise exception 'You do not control this inventory.';
  end if;

  if target_parent_item_id is null then
    select inventory_slots into main_capacity from public.characters where id = moving.character_id;
    if target_slot_index >= coalesce(main_capacity, 0) then raise exception 'That inventory slot is unavailable.'; end if;
  else
    select * into target_container
    from public.inventory_items
    where id = target_parent_item_id
      and character_id = moving.character_id
      and is_storage = true;
    if target_container.id is null then raise exception 'Storage container not found.'; end if;
    if lower(trim(target_container.item_name)) <> 'bag of holding'
      and target_slot_index >= target_container.storage_capacity then
      raise exception 'That storage container is full.';
    end if;
  end if;

  source_parent := moving.parent_item_id;
  source_slot := moving.slot_index;

  select * into destination
  from public.inventory_items
  where character_id = moving.character_id
    and id <> moving.id
    and is_storage = false
    and parent_item_id is not distinct from target_parent_item_id
    and slot_index = target_slot_index
  for update;

  update public.inventory_items
  set parent_item_id = null, slot_index = -1
  where id = moving.id;

  if destination.id is not null then
    update public.inventory_items
    set parent_item_id = source_parent, slot_index = source_slot
    where id = destination.id;
  end if;

  update public.inventory_items
  set parent_item_id = target_parent_item_id, slot_index = target_slot_index
  where id = moving.id;
end;
$$;

grant execute on function public.move_inventory_item_slot(uuid, uuid, int) to authenticated;

create or replace function public.move_inventory_item_to_house(
  target_source_item_id uuid,
  move_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  source_item public.inventory_items;
  source_character public.characters;
  house public.player_houses;
  chosen_slot int;
  result_id uuid;
begin
  if move_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into source_item from public.inventory_items where id = target_source_item_id for update;
  if source_item.id is null or source_item.quantity < move_quantity then raise exception 'Item quantity is no longer available.'; end if;
  select * into source_character from public.characters where id = source_item.character_id;
  if source_character.owner_user_id is null then raise exception 'The character needs an assigned player.'; end if;
  if not public.is_dm() and source_character.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;
  select * into house from public.ensure_player_house(source_character.owner_user_id);
  select slot into chosen_slot from generate_series(0, house.capacity - 1) slot
  where not exists (select 1 from public.house_inventory_items h where h.house_id = house.id and h.slot_index = slot)
  order by slot limit 1;
  if chosen_slot is null then raise exception 'The house is full.'; end if;
  if source_item.is_storage and (move_quantity <> 1 or source_item.quantity <> 1 or exists (select 1 from public.inventory_items where parent_item_id = source_item.id)) then
    raise exception 'Storage items must be empty and move one at a time.';
  end if;
  insert into public.house_inventory_items (
    house_id, item_name, quantity, notes, item_type, slot_index,
    is_storage, storage_capacity, source_product_id, rarity
  ) values (
    house.id, source_item.item_name, move_quantity, '', source_item.item_type, chosen_slot,
    source_item.is_storage, source_item.storage_capacity, source_item.source_product_id, source_item.rarity
  ) returning id into result_id;
  if source_item.quantity = move_quantity then delete from public.inventory_items where id = source_item.id;
  else update public.inventory_items set quantity = quantity - move_quantity where id = source_item.id;
  end if;
  return result_id;
end;
$$;

grant execute on function public.move_inventory_item_to_house(uuid, int) to authenticated;

create or replace function public.move_house_item_to_character(
  target_house_item_id uuid,
  target_character_id uuid,
  move_quantity int
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  house_item public.house_inventory_items;
  house public.player_houses;
  target_character public.characters;
  result_id uuid;
begin
  if move_quantity <= 0 then raise exception 'Quantity must be positive.'; end if;
  select * into house_item from public.house_inventory_items where id = target_house_item_id for update;
  if house_item.id is null or house_item.quantity < move_quantity then raise exception 'House item quantity is no longer available.'; end if;
  select * into house from public.player_houses where id = house_item.house_id;
  select * into target_character from public.characters where id = target_character_id;
  if not public.is_dm() and house.owner_user_id is distinct from auth.uid() then raise exception 'You do not control this house.'; end if;
  if not public.is_dm() and target_character.owner_user_id is distinct from house.owner_user_id then raise exception 'That character does not share this house.'; end if;
  result_id := public.place_inventory_item_with_rarity(
    target_character.id, house_item.item_name, move_quantity, '',
    house_item.item_type, case when house_item.is_storage then house_item.storage_capacity else 0 end,
    house_item.source_product_id, house_item.rarity
  );
  if house_item.quantity = move_quantity then delete from public.house_inventory_items where id = house_item.id;
  else update public.house_inventory_items set quantity = quantity - move_quantity where id = house_item.id;
  end if;
  return result_id;
end;
$$;

grant execute on function public.move_house_item_to_character(uuid, uuid, int) to authenticated;

-- ============================================================
-- Locations, campaign notifications, announcements, trades,
-- and reliable quantity-based market purchases
-- ============================================================

create table if not exists public.campaign_locations (
  id uuid primary key default gen_random_uuid(),
  location_key text not null unique,
  name text not null unique,
  is_city boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.campaign_locations(location_key, name, is_city)
values
  ('calostrynn', 'Calostrynn', true),
  ('wild-party-1', 'Wild', false),
  ('wild-party-2', 'Wild2', false),
  ('wild-party-3', 'Wild3', false)
on conflict (location_key) do update set name = excluded.name, is_city = excluded.is_city;

alter table public.characters
  add column if not exists location_id uuid references public.campaign_locations(id) on delete set null;

create table if not exists public.player_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  location_id uuid not null references public.campaign_locations(id) on delete restrict,
  previous_location_id uuid references public.campaign_locations(id) on delete set null,
  changed_at timestamptz not null default now(),
  return_since timestamptz,
  return_summary_pending boolean not null default false
);

update public.characters ch
set location_id = coalesce(
  (
    select pl.location_id
    from public.player_locations pl
    where pl.user_id = ch.owner_user_id
  ),
  (
    select id
    from public.campaign_locations
    where location_key = 'calostrynn'
    limit 1
  )
)
where ch.kind in ('player', 'npc', 'enemy')
  and ch.location_id is null;

create table if not exists public.location_departures (
  user_id uuid not null references public.profiles(id) on delete cascade,
  location_id uuid not null references public.campaign_locations(id) on delete cascade,
  departed_at timestamptz not null default now(),
  primary key(user_id, location_id)
);

create table if not exists public.feed_events (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.campaign_locations(id) on delete cascade,
  event_type text not null check (event_type in ('announcement', 'trade')),
  title text not null,
  body text not null default '',
  speaker text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_character_id uuid not null references public.characters(id) on delete cascade,
  recipient_character_id uuid not null references public.characters(id) on delete cascade,
  location_id uuid not null references public.campaign_locations(id) on delete restrict,
  currency_system_id uuid references public.currency_systems(id) on delete set null,
  offered_currency_base bigint not null default 0 check (offered_currency_base >= 0),
  requested_currency_base bigint not null default 0 check (requested_currency_base >= 0),
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'countered')),
  parent_offer_id uuid references public.trade_offers(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.trade_offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  side text not null check (side in ('offered', 'requested')),
  source_item_id uuid not null references public.inventory_items(id) on delete cascade,
  item_name text not null,
  quantity int not null check (quantity > 0),
  rarity text not null default 'Common'
);

alter table public.trade_offer_items drop constraint if exists trade_offer_items_source_item_id_fkey;
alter table public.trade_offer_items alter column source_item_id drop not null;
alter table public.trade_offer_items
  add constraint trade_offer_items_source_item_id_fkey
  foreign key (source_item_id) references public.inventory_items(id) on delete set null;

create table if not exists public.campaign_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('announcement', 'trade_offer', 'trade_update', 'trade_complete')),
  title text not null,
  body text not null default '',
  trade_offer_id uuid references public.trade_offers(id) on delete cascade,
  event_id uuid references public.feed_events(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists campaign_notifications_user_unread_idx
on public.campaign_notifications(user_id, is_read, created_at desc);
create index if not exists trade_offers_participants_idx
on public.trade_offers(sender_user_id, recipient_user_id, status, created_at desc);
create index if not exists feed_events_location_idx
on public.feed_events(location_id, created_at desc);

alter table public.campaign_locations enable row level security;
alter table public.player_locations enable row level security;
alter table public.location_departures enable row level security;
alter table public.feed_events enable row level security;
alter table public.trade_offers enable row level security;
alter table public.trade_offer_items enable row level security;
alter table public.campaign_notifications enable row level security;

drop policy if exists "locations_authenticated_read" on public.campaign_locations;
create policy "locations_authenticated_read" on public.campaign_locations for select to authenticated using (true);
drop policy if exists "locations_dm_all" on public.campaign_locations;
create policy "locations_dm_all" on public.campaign_locations for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "player_locations_authenticated_read" on public.player_locations;
create policy "player_locations_authenticated_read" on public.player_locations for select to authenticated using (true);
drop policy if exists "player_locations_dm_all" on public.player_locations;
create policy "player_locations_dm_all" on public.player_locations for all to authenticated using (public.is_dm()) with check (public.is_dm());

drop policy if exists "departures_self_or_dm" on public.location_departures;
create policy "departures_self_or_dm" on public.location_departures for select to authenticated
using (user_id = auth.uid() or public.is_dm());

drop policy if exists "feed_events_current_location" on public.feed_events;
create policy "feed_events_current_location" on public.feed_events for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.player_locations pl
    where pl.user_id = auth.uid() and pl.location_id = feed_events.location_id
  )
);

drop policy if exists "trade_offers_participant_read" on public.trade_offers;
create policy "trade_offers_participant_read" on public.trade_offers for select to authenticated
using (public.is_dm() or sender_user_id = auth.uid() or recipient_user_id = auth.uid());

drop policy if exists "trade_items_participant_read" on public.trade_offer_items;
create policy "trade_items_participant_read" on public.trade_offer_items for select to authenticated
using (
  exists (
    select 1 from public.trade_offers t
    where t.id = trade_offer_items.offer_id
      and (public.is_dm() or t.sender_user_id = auth.uid() or t.recipient_user_id = auth.uid())
  )
);

drop policy if exists "notifications_self_read" on public.campaign_notifications;
create policy "notifications_self_read" on public.campaign_notifications for select to authenticated
using (user_id = auth.uid() or public.is_dm());
drop policy if exists "notifications_self_update" on public.campaign_notifications;
create policy "notifications_self_update" on public.campaign_notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "inventory_authenticated_read" on public.inventory_items;
create policy "inventory_authenticated_read" on public.inventory_items for select to authenticated using (true);

drop policy if exists "character_spells_authenticated_read" on public.character_spells;
create policy "character_spells_authenticated_read" on public.character_spells for select to authenticated using (true);

create or replace function public.ensure_player_locations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  default_location uuid;
begin
  select id into default_location from public.campaign_locations where location_key = 'calostrynn';
  insert into public.player_locations(user_id, location_id)
  select p.id, default_location from public.profiles p
  on conflict (user_id) do nothing;
end;
$$;

grant execute on function public.ensure_player_locations() to authenticated;

create or replace function public.create_campaign_location(location_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare result_id uuid;
begin
  if not public.is_dm() then raise exception 'Only the DM may create locations.'; end if;
  if length(trim(location_name)) < 2 then raise exception 'Enter a location name.'; end if;
  insert into public.campaign_locations(location_key, name, is_city, created_by)
  values (
    trim(both '-' from regexp_replace(lower(trim(location_name)), '[^a-z0-9]+', '-', 'g')),
    trim(location_name),
    false,
    auth.uid()
  )
  on conflict (location_key) do update set name = excluded.name
  returning id into result_id;
  return result_id;
end;
$$;

grant execute on function public.create_campaign_location(text) to authenticated;

create or replace function public.ensure_character_locations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  default_location uuid;
begin
  select id into default_location from public.campaign_locations where location_key = 'calostrynn';
  if default_location is null then return; end if;
  update public.characters
  set location_id = default_location
  where kind in ('player', 'npc', 'enemy') and location_id is null;
end;
$$;

grant execute on function public.ensure_character_locations() to authenticated;

create or replace function public.set_character_location(target_character_id uuid, target_location_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  destination_name text;
begin
  if not public.is_dm() then raise exception 'Only the DM may move characters.'; end if;
  select name into destination_name from public.campaign_locations where id = target_location_id;
  if destination_name is null then raise exception 'Location not found.'; end if;
  update public.characters
  set location_id = target_location_id
  where id = target_character_id;
  if not found then raise exception 'Character not found.'; end if;
  return destination_name;
end;
$$;

grant execute on function public.set_character_location(uuid, uuid) to authenticated;

create or replace function public.set_player_location(target_user_id uuid, target_location_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_location uuid;
  destination_name text;
  previous_departure timestamptz;
  missed_count int;
begin
  if not public.is_dm() then raise exception 'Only the DM may move players.'; end if;
  perform public.ensure_player_locations();
  select location_id into current_location from public.player_locations where user_id = target_user_id for update;
  select name into destination_name from public.campaign_locations where id = target_location_id;
  if destination_name is null then raise exception 'Location not found.'; end if;
  if current_location = target_location_id then return destination_name; end if;

  if current_location is not null then
    insert into public.location_departures(user_id, location_id, departed_at)
    values(target_user_id, current_location, now())
    on conflict (user_id, location_id) do update set departed_at = excluded.departed_at;
  end if;

  select departed_at into previous_departure
  from public.location_departures
  where user_id = target_user_id and location_id = target_location_id;

  select count(*)::int into missed_count
  from public.feed_events
  where location_id = target_location_id
    and previous_departure is not null
    and created_at > previous_departure;

  update public.player_locations
  set previous_location_id = current_location,
      location_id = target_location_id,
      changed_at = now(),
      return_since = previous_departure,
      return_summary_pending = missed_count > 0
  where user_id = target_user_id;

  return destination_name;
end;
$$;

grant execute on function public.set_player_location(uuid, uuid) to authenticated;

create or replace function public.mark_return_summary_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.player_locations set return_summary_pending = false where user_id = auth.uid();
$$;

grant execute on function public.mark_return_summary_seen() to authenticated;

create or replace function public.dm_publish_announcement(
  target_location_id uuid,
  announcement_title text,
  announcement_body text,
  announcement_mode text,
  npc_speaker text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  event_id uuid;
  speaker_name text;
begin
  if not public.is_dm() then raise exception 'Only the DM may publish announcements.'; end if;
  if trim(announcement_title) = '' then raise exception 'Add a header.'; end if;
  speaker_name := case
    when announcement_mode = 'in_game' then coalesce(nullif(trim(npc_speaker), ''), 'Town Crier')
    else 'Dungeon Master'
  end;
  insert into public.feed_events(location_id, event_type, title, body, speaker)
  values(target_location_id, 'announcement', trim(announcement_title), trim(announcement_body), speaker_name)
  returning id into event_id;

  insert into public.campaign_notifications(user_id, kind, title, body, event_id)
  select pl.user_id, 'announcement', trim(announcement_title),
         speaker_name || case when trim(announcement_body) = '' then '' else ': ' || trim(announcement_body) end,
         event_id
  from public.player_locations pl
  where pl.location_id = target_location_id;
  return event_id;
end;
$$;

grant execute on function public.dm_publish_announcement(uuid, text, text, text, text) to authenticated;

create or replace function public.create_trade_offer(
  sender_character uuid,
  recipient_character uuid,
  offered_items jsonb default '[]'::jsonb,
  requested_items jsonb default '[]'::jsonb,
  currency_system uuid default null,
  offered_currency bigint default 0,
  requested_currency bigint default 0,
  offer_message text default '',
  counter_to uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sender_row public.characters;
  recipient_row public.characters;
  sender_location uuid;
  recipient_location uuid;
  result_id uuid;
  line jsonb;
  item public.inventory_items;
  committed int;
begin
  select * into sender_row from public.characters where id = sender_character;
  select * into recipient_row from public.characters where id = recipient_character;
  if sender_row.id is null or sender_row.owner_user_id is distinct from auth.uid() then raise exception 'Choose one of your characters.'; end if;
  if recipient_row.id is null or recipient_row.owner_user_id is null or recipient_row.owner_user_id = auth.uid() then raise exception 'Choose another player character.'; end if;
  if offered_currency < 0 or requested_currency < 0 then raise exception 'Currency amounts cannot be negative.'; end if;
  sender_location := sender_row.location_id;
  recipient_location := recipient_row.location_id;
  if sender_location is null then select id into sender_location from public.campaign_locations where location_key = 'calostrynn'; end if;
  if recipient_location is null then select id into recipient_location from public.campaign_locations where location_key = 'calostrynn'; end if;
  if sender_location is distinct from recipient_location then raise exception 'Both characters must be at the same location to trade.'; end if;

  insert into public.trade_offers(
    sender_user_id, recipient_user_id, sender_character_id, recipient_character_id,
    location_id, currency_system_id, offered_currency_base, requested_currency_base,
    message, parent_offer_id
  ) values (
    auth.uid(), recipient_row.owner_user_id, sender_row.id, recipient_row.id,
    sender_location, currency_system, offered_currency, requested_currency,
    trim(offer_message), counter_to
  ) returning id into result_id;

  for line in select * from jsonb_array_elements(coalesce(offered_items, '[]'::jsonb)) loop
    select * into item from public.inventory_items where id = (line->>'item_id')::uuid;
    if item.id is null or item.character_id <> sender_row.id or item.parent_item_id is not null then raise exception 'An offered item is unavailable.'; end if;
    select coalesce(sum(toi.quantity), 0)::int into committed
    from public.trade_offer_items toi join public.trade_offers t on t.id = toi.offer_id
    where toi.source_item_id = item.id and t.status = 'pending';
    if greatest((line->>'quantity')::int, 0) + committed > item.quantity then raise exception 'An offered item quantity is already committed.'; end if;
    insert into public.trade_offer_items(offer_id, side, source_item_id, item_name, quantity, rarity)
    values(result_id, 'offered', item.id, item.item_name, greatest((line->>'quantity')::int, 1), item.rarity);
  end loop;

  for line in select * from jsonb_array_elements(coalesce(requested_items, '[]'::jsonb)) loop
    select * into item from public.inventory_items where id = (line->>'item_id')::uuid;
    if item.id is null or item.character_id <> recipient_row.id or item.parent_item_id is not null then raise exception 'A requested item is unavailable.'; end if;
    insert into public.trade_offer_items(offer_id, side, source_item_id, item_name, quantity, rarity)
    values(result_id, 'requested', item.id, item.item_name, greatest((line->>'quantity')::int, 1), item.rarity);
  end loop;

  if counter_to is not null then
    update public.trade_offers
    set status = 'countered', resolved_at = now()
    where id = counter_to and recipient_user_id = auth.uid() and status = 'pending';
  end if;

  insert into public.campaign_notifications(user_id, kind, title, body, trade_offer_id)
  values(recipient_row.owner_user_id, 'trade_offer', 'Trade offer from ' || sender_row.name,
         coalesce(nullif(trim(offer_message), ''), 'A new trade is waiting.'), result_id);
  return result_id;
end;
$$;

grant execute on function public.create_trade_offer(uuid, uuid, jsonb, jsonb, uuid, bigint, bigint, text, uuid) to authenticated;

create or replace function public.resolve_trade_offer(target_offer_id uuid, resolution text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  offer public.trade_offers;
  sender_character public.characters;
  recipient_character public.characters;
  sender_balance bigint;
  recipient_balance bigint;
  line record;
  event_id uuid;
  summary text;
  offered_text text;
  requested_text text;
begin
  select * into offer from public.trade_offers where id = target_offer_id for update;
  if offer.id is null or offer.status <> 'pending' then raise exception 'This trade is no longer pending.'; end if;

  if resolution = 'cancelled' then
    if offer.sender_user_id <> auth.uid() then raise exception 'Only the sender may cancel this trade.'; end if;
    update public.trade_offers set status = 'cancelled', resolved_at = now() where id = offer.id;
    insert into public.campaign_notifications(user_id, kind, title, body, trade_offer_id)
    values(offer.recipient_user_id, 'trade_update', 'Trade cancelled', 'The sender cancelled the offer.', offer.id);
    return 'Trade cancelled.';
  end if;

  if offer.recipient_user_id <> auth.uid() then raise exception 'Only the recipient may answer this trade.'; end if;
  if resolution = 'declined' then
    update public.trade_offers set status = 'declined', resolved_at = now() where id = offer.id;
    insert into public.campaign_notifications(user_id, kind, title, body, trade_offer_id)
    values(offer.sender_user_id, 'trade_update', 'Trade declined', 'The trade offer was declined.', offer.id);
    return 'Trade declined.';
  end if;
  if resolution <> 'accepted' then raise exception 'Unknown trade response.'; end if;

  select * into sender_character from public.characters where id = offer.sender_character_id;
  select * into recipient_character from public.characters where id = offer.recipient_character_id;

  if offer.currency_system_id is not null then
    insert into public.character_wallets(character_id, currency_system_id, balance_base)
    values(sender_character.id, offer.currency_system_id, 0), (recipient_character.id, offer.currency_system_id, 0)
    on conflict (character_id, currency_system_id) do nothing;
    select balance_base into sender_balance from public.character_wallets where character_id = sender_character.id and currency_system_id = offer.currency_system_id for update;
    select balance_base into recipient_balance from public.character_wallets where character_id = recipient_character.id and currency_system_id = offer.currency_system_id for update;
    if sender_balance < offer.offered_currency_base then raise exception 'The sender no longer has the offered currency.'; end if;
    if recipient_balance < offer.requested_currency_base then raise exception 'You no longer have the requested currency.'; end if;
  end if;

  create temporary table if not exists trade_move_buffer (
    source_item_id uuid,
    side text,
    item_name text,
    move_quantity int,
    rarity text,
    character_id uuid,
    available_quantity int,
    item_type text,
    is_storage boolean,
    storage_capacity int,
    source_product_id uuid,
    parent_item_id uuid
  ) on commit drop;
  truncate table trade_move_buffer;
  perform ii.id
  from public.trade_offer_items toi
  join public.inventory_items ii on ii.id = toi.source_item_id
  where toi.offer_id = offer.id
  for update of ii;
  insert into trade_move_buffer
  select toi.source_item_id, toi.side, toi.item_name, toi.quantity, toi.rarity,
         ii.character_id, ii.quantity, ii.item_type, ii.is_storage,
         ii.storage_capacity, ii.source_product_id, ii.parent_item_id
  from public.trade_offer_items toi
  join public.inventory_items ii on ii.id = toi.source_item_id
  where toi.offer_id = offer.id;

  if (select count(*) from trade_move_buffer) <> (select count(*) from public.trade_offer_items where offer_id = offer.id) then
    raise exception 'One or more trade items are no longer available.';
  end if;

  for line in select * from trade_move_buffer loop
    if line.move_quantity > line.available_quantity or line.parent_item_id is not null then raise exception '% is no longer available.', line.item_name; end if;
    if line.side = 'offered' and line.character_id <> sender_character.id then raise exception 'An offered item changed owners.'; end if;
    if line.side = 'requested' and line.character_id <> recipient_character.id then raise exception 'A requested item changed owners.'; end if;
    if line.is_storage and (line.move_quantity <> 1 or exists(select 1 from public.inventory_items where parent_item_id = line.source_item_id)) then
      raise exception 'Storage items must be empty before trading.';
    end if;
  end loop;

  for line in select * from trade_move_buffer loop
    update public.inventory_items set quantity = quantity - line.move_quantity
    where id = line.source_item_id and quantity > line.move_quantity;
    if not found then delete from public.inventory_items where id = line.source_item_id; end if;
  end loop;

  for line in select * from trade_move_buffer order by side loop
    perform public.place_inventory_item_with_rarity(
      case when line.side = 'offered' then recipient_character.id else sender_character.id end,
      line.item_name, line.move_quantity, '', line.item_type,
      case when line.is_storage then line.storage_capacity else 0 end,
      line.source_product_id, line.rarity
    );
  end loop;

  if offer.currency_system_id is not null then
    update public.character_wallets
    set balance_base = balance_base - offer.offered_currency_base + offer.requested_currency_base
    where character_id = sender_character.id and currency_system_id = offer.currency_system_id;
    update public.character_wallets
    set balance_base = balance_base - offer.requested_currency_base + offer.offered_currency_base
    where character_id = recipient_character.id and currency_system_id = offer.currency_system_id;
  end if;

  update public.trade_offers set status = 'accepted', resolved_at = now() where id = offer.id;
  select string_agg(quantity || '× ' || item_name, ', ') into offered_text
  from public.trade_offer_items where offer_id = offer.id and side = 'offered';
  select string_agg(quantity || '× ' || item_name, ', ') into requested_text
  from public.trade_offer_items where offer_id = offer.id and side = 'requested';
  if offer.offered_currency_base > 0 then offered_text := concat_ws(', ', offered_text, offer.offered_currency_base || ' base currency'); end if;
  if offer.requested_currency_base > 0 then requested_text := concat_ws(', ', requested_text, offer.requested_currency_base || ' base currency'); end if;
  summary := sender_character.name || ' gave ' || coalesce(offered_text, 'nothing') ||
             '; ' || recipient_character.name || ' gave ' || coalesce(requested_text, 'nothing') || '.';
  insert into public.feed_events(location_id, event_type, title, body, speaker)
  values(offer.location_id, 'trade', 'Trade completed', summary, 'Marketplace')
  returning id into event_id;
  insert into public.campaign_notifications(user_id, kind, title, body, trade_offer_id, event_id)
  select distinct ch.owner_user_id, 'trade_complete', 'Trade completed', summary, offer.id, event_id
  from public.characters ch
  where ch.location_id = offer.location_id and ch.owner_user_id is not null;
  return summary;
end;
$$;

grant execute on function public.resolve_trade_offer(uuid, text) to authenticated;

create or replace function public.purchase_market_item_quantity(
  target_character_id uuid,
  target_listing_id uuid,
  purchase_quantity int
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  listing record;
  buyer public.characters;
  buyer_location text;
  current_balance bigint;
  total_price bigint;
  purchased_spell_id uuid;
  available_spell_slot int;
  copy_number int;
begin
  if purchase_quantity <= 0 then raise exception 'Choose an amount of at least 1.'; end if;
  select ml.id as listing_id, p.id as product_id, p.name, p.item_type, p.price_base,
         p.stock_quantity, p.storage_capacity, p.is_available, p.spell_key,
         c.currency_system_id, c.is_open, c.is_discovered, c.city_key
  into listing
  from public.market_listings ml
  join public.market_products p on p.id = ml.product_id
  join public.city_vendors v on v.id = ml.vendor_id
  join public.city_facilities f on f.id = v.facility_id
  join public.cities c on c.id = f.city_id
  where ml.id = target_listing_id;
  select * into buyer from public.characters where id = target_character_id;
  if listing.listing_id is null or buyer.id is null then raise exception 'Market item or character not found.'; end if;
  if not public.is_dm() and buyer.owner_user_id is distinct from auth.uid() then raise exception 'You do not control that character.'; end if;
  if not listing.is_discovered or not listing.is_open then raise exception 'This city is not currently available.'; end if;
  if not listing.is_available or listing.price_base <= 0 then raise exception 'This item is not currently for sale.'; end if;
  if listing.stock_quantity is not null and purchase_quantity > listing.stock_quantity then
    raise exception 'Only % remain in stock.', listing.stock_quantity;
  end if;
  select cl.location_key into buyer_location
  from public.campaign_locations cl
  where cl.id = buyer.location_id;
  if buyer_location is null then
    select location_key into buyer_location from public.campaign_locations where location_key = 'calostrynn';
  end if;
  if buyer_location is distinct from listing.city_key then
    raise exception '% is not currently in %.', buyer.name, listing.city_key;
  end if;
  if listing.spell_key is not null and purchase_quantity <> 1 then raise exception 'Spells are purchased one at a time.'; end if;
  total_price := listing.price_base::bigint * purchase_quantity;
  insert into public.character_wallets(character_id, currency_system_id, balance_base)
  values(target_character_id, listing.currency_system_id, 0)
  on conflict (character_id, currency_system_id) do nothing;
  select balance_base into current_balance
  from public.character_wallets
  where character_id = target_character_id and currency_system_id = listing.currency_system_id
  for update;
  if current_balance < total_price then raise exception 'Not enough currency for that amount.'; end if;

  if listing.spell_key is not null then
    select id into purchased_spell_id from public.spells where spell_key = listing.spell_key;
    if purchased_spell_id is null then raise exception 'Spell record not found.'; end if;
    if exists(select 1 from public.character_spells where character_id = target_character_id and spell_id = purchased_spell_id) then
      raise exception 'This character already knows that spell.';
    end if;
    select slot into available_spell_slot
    from generate_series(0, greatest(buyer.spell_slots - 1, -1)) slot
    where not exists (
      select 1 from public.character_spells cs
      where cs.character_id = target_character_id and cs.prepared_slot = slot
    ) order by slot limit 1;
    insert into public.character_spells(character_id, spell_id, prepared_slot)
    values(target_character_id, purchased_spell_id, available_spell_slot);
  elsif listing.storage_capacity > 0 then
    for copy_number in 1..purchase_quantity loop
      perform public.place_inventory_item_with_rarity(
        target_character_id, listing.name, 1, '', listing.item_type,
        listing.storage_capacity, listing.product_id, 'Common'
      );
    end loop;
  else
    perform public.place_inventory_item_with_rarity(
      target_character_id, listing.name, purchase_quantity, '', listing.item_type,
      0, listing.product_id, 'Common'
    );
  end if;

  update public.character_wallets set balance_base = balance_base - total_price
  where character_id = target_character_id and currency_system_id = listing.currency_system_id;
  if listing.stock_quantity is not null then
    update public.market_products set stock_quantity = stock_quantity - purchase_quantity
    where id = listing.product_id;
  end if;
  return purchase_quantity || '× ' || listing.name;
end;
$$;

grant execute on function public.purchase_market_item_quantity(uuid, uuid, int) to authenticated;

create or replace function public.purchase_market_item(target_character_id uuid, target_listing_id uuid)
returns text
language sql
security definer
set search_path = public
as $$
  select public.purchase_market_item_quantity(target_character_id, target_listing_id, 1);
$$;

grant execute on function public.purchase_market_item(uuid, uuid) to authenticated;

do $$
begin
  perform public.ensure_player_locations();
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'player_locations') then
    alter publication supabase_realtime add table public.player_locations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'campaign_notifications') then
    alter publication supabase_realtime add table public.campaign_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'trade_offers') then
    alter publication supabase_realtime add table public.trade_offers;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'feed_events') then
    alter publication supabase_realtime add table public.feed_events;
  end if;
end
$$;

-- ============================================================
-- Final polish: encounter removal, property, and duplicate bags
-- ============================================================

create table if not exists public.character_properties (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  property_key text not null,
  property_name text not null,
  custom_name text not null default '',
  property_type text not null default 'property' check (property_type in ('wagon', 'animal', 'property')),
  notes text not null default '',
  source_product_id uuid references public.market_products(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists character_properties_set_updated_at on public.character_properties;
create trigger character_properties_set_updated_at before update on public.character_properties
for each row execute function public.set_updated_at();

alter table public.character_properties enable row level security;

drop policy if exists "properties_owner_or_dm_read" on public.character_properties;
create policy "properties_owner_or_dm_read" on public.character_properties for select to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = character_properties.character_id and c.owner_user_id = auth.uid()
  )
);

drop policy if exists "properties_owner_or_dm_update" on public.character_properties;
create policy "properties_owner_or_dm_update" on public.character_properties for update to authenticated
using (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = character_properties.character_id and c.owner_user_id = auth.uid()
  )
)
with check (
  public.is_dm() or exists (
    select 1 from public.characters c
    where c.id = character_properties.character_id and c.owner_user_id = auth.uid()
  )
);

drop policy if exists "properties_dm_all" on public.character_properties;
create policy "properties_dm_all" on public.character_properties for all to authenticated
using (public.is_dm()) with check (public.is_dm());

create or replace function public.property_kind_for_item(item_key text, item_name text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(coalesce(item_key, '')) in ('light-wagon', 'heavy-wagon', 'wagon', 'cart') then 'wagon'
    when lower(coalesce(item_name, '')) in ('light wagon', 'heavy wagon', 'wagon', 'cart') then 'wagon'
    when lower(coalesce(item_key, '')) in ('horse', 'war-horse', 'dog', 'mule', 'pony') then 'animal'
    when lower(coalesce(item_name, '')) in ('horse', 'war horse', 'dog', 'mule', 'pony') then 'animal'
    else null
  end;
$$;

create or replace function public.add_character_property(
  target_character_id uuid,
  new_name text,
  new_property_type text,
  new_notes text default '',
  new_source_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_id uuid;
begin
  if not exists (select 1 from public.characters where id = target_character_id) then
    raise exception 'Character not found.';
  end if;

  insert into public.character_properties (
    character_id, property_key, property_name, custom_name, property_type, notes, source_product_id
  ) values (
    target_character_id,
    lower(regexp_replace(trim(new_name), '[^a-z0-9]+', '-', 'gi')),
    trim(new_name),
    '',
    coalesce(nullif(new_property_type, ''), 'property'),
    coalesce(new_notes, ''),
    new_source_product_id
  ) returning id into result_id;

  return result_id;
end;
$$;

revoke all on function public.add_character_property(uuid, text, text, text, uuid) from public;

update public.market_products
set storage_capacity = 0,
    description = case
      when product_key = 'light-wagon' then 'A travel wagon. It becomes character property, not carried storage.'
      when product_key = 'heavy-wagon' then 'A heavy travel wagon. It becomes character property, not carried storage.'
      else description
    end
where product_key in ('light-wagon', 'heavy-wagon');

create or replace function public.place_inventory_item(
  target_character_id uuid,
  new_name text,
  new_quantity int,
  new_notes text,
  new_item_type text,
  new_storage_capacity int default 0,
  new_source_product_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  character_slots int;
  chosen_slot int;
  chosen_parent uuid;
  container record;
  result_id uuid;
  container_limit int;
  source_key text;
  property_kind text;
  copy_number int;
begin
  select inventory_slots into character_slots
  from public.characters
  where id = target_character_id;

  if character_slots is null then
    raise exception 'Character not found.';
  end if;

  select product_key into source_key
  from public.market_products
  where id = new_source_product_id;

  property_kind := public.property_kind_for_item(source_key, new_name);
  if property_kind is not null then
    for copy_number in 1..greatest(new_quantity, 1) loop
      result_id := public.add_character_property(
        target_character_id, new_name, property_kind, new_notes, new_source_product_id
      );
    end loop;
    return result_id;
  end if;

  if new_storage_capacity > 0 then
    if exists (
      select 1
      from public.inventory_items
      where character_id = target_character_id
        and is_storage = true
        and (
          (new_source_product_id is not null and source_product_id = new_source_product_id)
          or (lower(trim(item_name)) = lower(trim(new_name)) and storage_capacity = new_storage_capacity)
        )
    ) then
      new_storage_capacity := 0;
    else
      insert into public.inventory_items (
        character_id, item_name, quantity, notes, item_type, slot_index,
        parent_item_id, is_storage, storage_capacity, source_product_id
      ) values (
        target_character_id, new_name, 1, new_notes, new_item_type, -1,
        null, true, new_storage_capacity, new_source_product_id
      ) returning id into result_id;
      return result_id;
    end if;
  end if;

  select slot into chosen_slot
  from generate_series(0, greatest(character_slots - 1, -1)) as slot
  where not exists (
    select 1 from public.inventory_items i
    where i.character_id = target_character_id
      and i.parent_item_id is null
      and i.is_storage = false
      and i.slot_index = slot
  )
  order by slot
  limit 1;

  if chosen_slot is null then
    for container in
      select id, storage_capacity, item_name
      from public.inventory_items
      where character_id = target_character_id and is_storage = true
      order by case when lower(trim(item_name)) = 'bag of holding' then 0 else 1 end, created_at
    loop
      if lower(trim(container.item_name)) = 'bag of holding' then
        select greatest(
          container.storage_capacity - 1,
          coalesce(max(slot_index), -1) + 1
        ) into container_limit
        from public.inventory_items
        where parent_item_id = container.id;
      else
        container_limit := container.storage_capacity - 1;
      end if;

      select slot into chosen_slot
      from generate_series(0, greatest(container_limit, -1)) as slot
      where not exists (
        select 1 from public.inventory_items i
        where i.parent_item_id = container.id and i.slot_index = slot
      )
      order by slot
      limit 1;

      if chosen_slot is not null then
        chosen_parent := container.id;
        exit;
      end if;
    end loop;
  end if;

  if chosen_slot is null then
    raise exception 'No inventory space available.';
  end if;

  insert into public.inventory_items (
    character_id, item_name, quantity, notes, item_type, slot_index,
    parent_item_id, is_storage, storage_capacity, source_product_id
  ) values (
    target_character_id, new_name, greatest(new_quantity, 1), new_notes, new_item_type, chosen_slot,
    chosen_parent, false, 0, new_source_product_id
  ) returning id into result_id;

  return result_id;
end;
$$;

-- Demote extra duplicate active storage containers into normal carried items.
do $$
declare
  duplicate record;
  child record;
begin
  for duplicate in
    with ranked as (
      select i.*,
             row_number() over (
               partition by character_id, lower(trim(item_name)), storage_capacity
               order by created_at, id
             ) as duplicate_rank
      from public.inventory_items i
      where i.is_storage = true
        and lower(trim(i.item_name)) not in ('light wagon', 'heavy wagon', 'wagon', 'cart')
    )
    select * from ranked where duplicate_rank > 1
  loop
    begin
      for child in
        select * from public.inventory_items
        where parent_item_id = duplicate.id
        order by slot_index
      loop
        perform public.place_inventory_item_with_rarity(
          duplicate.character_id, child.item_name, child.quantity, '',
          child.item_type, 0, child.source_product_id, child.rarity
        );
        delete from public.inventory_items where id = child.id;
      end loop;

      perform public.place_inventory_item_with_rarity(
        duplicate.character_id, duplicate.item_name, greatest(duplicate.quantity, 1), '',
        duplicate.item_type, 0, duplicate.source_product_id, duplicate.rarity
      );
      delete from public.inventory_items where id = duplicate.id;
    exception when others then
      -- If a character has no safe space to receive the contents yet, leave that bag alone.
      null;
    end;
  end loop;
end
$$;

-- Convert existing wagon-style storage into property whenever it can be done safely.
do $$
declare
  wagon record;
  child_count int;
begin
  for wagon in
    select *
    from public.inventory_items
    where is_storage = true
      and lower(trim(item_name)) in ('light wagon', 'heavy wagon', 'wagon', 'cart')
  loop
    select count(*) into child_count
    from public.inventory_items
    where parent_item_id = wagon.id;

    if child_count = 0 then
      perform public.add_character_property(
        wagon.character_id,
        wagon.item_name,
        'wagon',
        '',
        wagon.source_product_id
      );
      delete from public.inventory_items where id = wagon.id;
    end if;
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'character_properties'
  ) then
    alter publication supabase_realtime add table public.character_properties;
  end if;
end
$$;

-- ============================================================
-- Loot table fixes from "Loot Drops - fixed loot drop size.xlsx"
-- ============================================================

update public.loot_entries
set max_quantity = 10
where item_key = 'arcane-nector';

update public.loot_entries
set biomes = 'Mountians, Caves'
where item_key = 'mountian-dragons-scales';

update public.loot_entries
set biomes = 'Any'
where item_key = 'void-rune';

-- ============================================================
-- Personal Scroll notes
-- ============================================================

create table if not exists public.personal_scrolls (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  content_html text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists personal_scrolls_set_updated_at on public.personal_scrolls;
create trigger personal_scrolls_set_updated_at before update on public.personal_scrolls
for each row execute function public.set_updated_at();

alter table public.personal_scrolls enable row level security;

drop policy if exists "personal_scrolls_owner_read" on public.personal_scrolls;
create policy "personal_scrolls_owner_read" on public.personal_scrolls for select to authenticated
using (user_id = auth.uid());

drop policy if exists "personal_scrolls_owner_insert" on public.personal_scrolls;
create policy "personal_scrolls_owner_insert" on public.personal_scrolls for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "personal_scrolls_owner_update" on public.personal_scrolls;
create policy "personal_scrolls_owner_update" on public.personal_scrolls for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

