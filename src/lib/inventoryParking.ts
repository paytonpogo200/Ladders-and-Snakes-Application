import type { InventoryItem } from '@/lib/types';

export const LOADOUT_PARKING_BASE = 10000;

const LOADOUT_SLOT_ORDER = ['armor', 'weapon', 'shield', 'pet', 'accessory-1', 'accessory-2', 'accessory-3', 'accessory-4'];

function itemIdOffset(itemId?: string | null, fallbackIndex = 0) {
  const hex = String(itemId ?? '').replace(/[^a-f0-9]/gi, '').slice(0, 8);
  const parsed = hex ? Number.parseInt(hex, 16) : NaN;
  return Number.isFinite(parsed) ? parsed % 90000 : fallbackIndex;
}

export function parkedLoadoutSlot(loadoutSlot?: string | null, fallbackIndex = 0, itemId?: string | null) {
  const orderIndex = LOADOUT_SLOT_ORDER.indexOf(String(loadoutSlot ?? ''));
  return LOADOUT_PARKING_BASE
    + (orderIndex >= 0 ? orderIndex * 100000 : 900000)
    + itemIdOffset(itemId, fallbackIndex);
}

export function visibleInventorySlot(slotIndex: number, parentItemId: string | null, inventorySlots: number) {
  return parentItemId === null && slotIndex >= 0 && slotIndex < Math.max(0, inventorySlots);
}

export function shouldParkEquippedItem(item: Pick<InventoryItem, 'equipped' | 'is_storage' | 'parent_item_id' | 'slot_index'>, inventorySlots: number) {
  return Boolean(item.equipped)
    && !item.is_storage
    && visibleInventorySlot(Number(item.slot_index), item.parent_item_id, inventorySlots);
}

export async function parkVisibleEquippedItems(
  supabase: { from: (table: string) => any },
  items: InventoryItem[],
  inventorySlots: number
) {
  const toPark = items.filter((item) => shouldParkEquippedItem(item, inventorySlots));
  if (toPark.length === 0) return false;

  for (const [index, item] of toPark.entries()) {
    await supabase
      .from('inventory_items')
      .update({ parent_item_id: null, slot_index: parkedLoadoutSlot(item.loadout_slot, index, item.id) })
      .eq('id', item.id);
  }
  return true;
}
