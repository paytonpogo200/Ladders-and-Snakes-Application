import { ITEM_CATALOG, type ItemCatalogEntry } from '@/lib/itemCatalog';
import { catalogMatchForItemName, potionEffect } from '@/lib/itemCatalogTools';
import { storageCapacityForItem } from '@/lib/itemTyping';

type SupabaseLike = {
  from: (table: string) => any;
};

const SYNC_KEY = 'ladders-snakes-item-catalog-sync-2026-07-08-potion-balance';

function storagePatch(entry: ItemCatalogEntry) {
  const storageCapacity = entry.item_type === 'storage' ? Math.max(1, storageCapacityForItem(entry.name) || 1) : 0;
  return {
    is_storage: entry.item_type === 'storage',
    storage_capacity: storageCapacity
  };
}

function potionDescription(name: string) {
  const effect = potionEffect(name);
  const amount = effect && Number.isFinite(effect.amount) ? `+${effect.amount}` : 'Full';
  if (effect?.kind === 'hp') return `${amount} Health Recovery. Fine quality.`;
  if (effect?.kind === 'mana') return `${amount} Mana Recovery. Fine quality.`;
  return null;
}

async function syncInventoryTable(supabase: SupabaseLike, table: 'inventory_items' | 'house_inventory_items') {
  const { data, error } = await supabase.from(table).select('id,item_name,rarity,item_type,is_storage,storage_capacity');
  if (error || !data) return;
  const updates = data
    .map((item: any) => {
      const match = catalogMatchForItemName(item.item_name);
      if (!match) return null;
      const patch = {
        item_name: match.name,
        rarity: match.rarity,
        item_type: match.item_type,
        ...storagePatch(match)
      };
      const changed = item.item_name !== patch.item_name
        || item.rarity !== patch.rarity
        || item.item_type !== patch.item_type
        || Boolean(item.is_storage) !== patch.is_storage
        || Number(item.storage_capacity ?? 0) !== patch.storage_capacity;
      return changed ? { id: item.id, patch } : null;
    })
    .filter(Boolean) as { id: string; patch: Record<string, unknown> }[];

  for (const update of updates) {
    await supabase.from(table).update(update.patch).eq('id', update.id);
  }
}

async function syncLootEntries(supabase: SupabaseLike) {
  const { data, error } = await supabase.from('loot_entries').select('id,item_name,category,rarity,item_type,storage_capacity');
  if (error || !data) return;
  for (const loot of data as any[]) {
    const match = catalogMatchForItemName(loot.item_name);
    if (!match) continue;
    const storageCapacity = match.item_type === 'storage' ? Math.max(1, storageCapacityForItem(match.name) || Number(loot.storage_capacity) || 1) : 0;
    const patch = {
      item_name: match.name,
      category: match.category,
      rarity: match.rarity,
      item_type: match.item_type,
      storage_capacity: storageCapacity
    };
    const changed = loot.item_name !== patch.item_name
      || loot.category !== patch.category
      || loot.rarity !== patch.rarity
      || loot.item_type !== patch.item_type
      || Number(loot.storage_capacity ?? 0) !== patch.storage_capacity;
    if (changed) await supabase.from('loot_entries').update(patch).eq('id', loot.id);
  }
}

async function syncMarketProducts(supabase: SupabaseLike) {
  const { data, error } = await supabase.from('market_products').select('id,name,description,item_type,storage_capacity');
  if (error || !data) return;
  for (const product of data as any[]) {
    const match = catalogMatchForItemName(product.name);
    if (!match) continue;
    const storageCapacity = match.item_type === 'storage' ? Math.max(1, storageCapacityForItem(match.name) || Number(product.storage_capacity) || 1) : 0;
    const description = potionDescription(match.name) ?? product.description;
    const patch = {
      name: match.name,
      item_type: match.item_type,
      storage_capacity: storageCapacity,
      description
    };
    const changed = product.name !== patch.name
      || product.item_type !== patch.item_type
      || Number(product.storage_capacity ?? 0) !== patch.storage_capacity
      || product.description !== patch.description;
    if (changed) await supabase.from('market_products').update(patch).eq('id', product.id);
  }
}

export async function syncItemCatalogData(supabase: SupabaseLike, options: { force?: boolean } = {}) {
  if (typeof window === 'undefined') return catalogSyncSummary();
  if (!options.force && window.localStorage.getItem(SYNC_KEY) === 'done') return catalogSyncSummary();

  await Promise.all([
    syncInventoryTable(supabase, 'inventory_items'),
    syncInventoryTable(supabase, 'house_inventory_items'),
    syncLootEntries(supabase),
    syncMarketProducts(supabase)
  ]);

  window.localStorage.setItem(SYNC_KEY, 'done');
  return `Catalog synced. ${catalogSyncSummary()}`;
}

export function catalogSyncSummary() {
  return `${ITEM_CATALOG.length} catalog items ready.`;
}
