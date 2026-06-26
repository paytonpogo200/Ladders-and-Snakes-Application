import type { InventoryItemType, LootEntry } from '@/lib/types';

type LootRow = [string, string, string, number, number, string, number, number, number];

const rows: LootRow[] = [
  ['Torch', 'Gear', 'Any', 1, 3, 'Common', 100, 1, 3],
  ['Rope', 'Gear', 'Any', 1, 3, 'Common', 90, 1, 5],
  ['Waist Pouch', 'Storage', 'Any', 1, 2, 'Common', 70, 1, 3],
  ['Back Bag', 'Storage', 'Any', 1, 3, 'Common', 60, 1, 2],
  ['Leather', 'Material', 'Goblin, Goblin Camp, Goblin Tower', 1, 5, 'Common', 100, 1, 10],
  ['Jewlery', 'Item', 'Goblin, Goblin Camp, Goblin Tower', 1, 5, 'Common', 80, 1, 3],
  ['Loose Arrows', 'Tool', 'Any', 1, 5, 'Common', 80, 3, 25],
  ['Cloth', 'Gear', 'Any', 1, 2, 'Common', 80, 1, 3],
  ['Fine Cloth', 'Gear', 'Any', 3, 5, 'Common', 75, 1, 5],
  ['Magic Bow', 'Tool', 'Any', 3, 5, 'Epic', 25, 1, 2],
  ['Coin', 'Currency', 'Any', 1, 2, 'Common', 80, 1, 50],
  ['Fishing Rod', 'Tool', 'Caves', 1, 5, 'Common', 60, 1, 1],
  ['Hunting Trap', 'Tool', 'Caves', 1, 5, 'Common', 60, 1, 2],
  ['Dried Rations', 'Food', 'Caves', 1, 5, 'Common', 60, 1, 3],
  ['Tattered Cloak', 'Clothing', 'Any', 1, 5, 'Common', 60, 1, 1],
  ['Leather Belt', 'Clothing', 'Caves', 1, 5, 'Common', 60, 1, 2],
  ['Glass Flasks', 'Tool', 'Any', 1, 5, 'Common', 60, 1, 5],
  ['Small Net', 'Tool', 'Caves', 1, 3, 'Common', 60, 1, 3],
  ['Looks like a good walking stick', 'Tool', 'Caves', 1, 3, 'Common', 60, 1, 200],
  ['Callis', 'Currency', 'Any', 2, 4, 'Uncommon', 60, 1, 50],
  ['Longbow', 'Tool', 'Any', 1, 3, 'Uncommon', 50, 1, 3],
  ['Lesser Healing Potion', 'Potion', 'Any', 1, 3, 'Uncommon', 50, 1, 5],
  ['Fur Skin', 'Material', 'Goblin, Goblin Camp, Goblin Tower', 1, 5, 'Uncommon', 60, 1, 5],
  ['Light Duffle', 'Storage', 'Any', 2, 4, 'Uncommon', 50, 1, 2],
  ['Steel Shovel', 'Tool', 'Any', 1, 3, 'Uncommon', 50, 1, 2],
  ['Steel Pickaxe', 'Tool', 'Any', 1, 3, 'Uncommon', 50, 1, 2],
  ['Steel Sword', 'Tool', 'Any', 1, 3, 'Uncommon', 50, 1, 2],
  ['Steel Axe', 'Tool', 'Any', 1, 3, 'Uncommon', 50, 1, 2],
  ['Spyglass', 'Tool', 'Caves', 1, 5, 'Uncommon', 50, 1, 1],
  ['Arcane Nector', 'Alchemy', 'Any', 1, 5, 'Uncommon', 50, 1, 10],
  ['Lesser Swiftness Potion', 'Alchemy', 'Any', 1, 5, 'Uncommon', 50, 1, 2],
  ['Lesser Strength Potion', 'Alchemy', 'Any', 1, 5, 'Uncommon', 50, 1, 2],
  ['Lesser Mana Regen Potion', 'Alchemy', 'Any', 1, 5, 'Uncommon', 50, 1, 2],
  ['Smoke Bomb', 'Tool', 'Caves', 1, 5, 'Uncommon', 50, 1, 1],
  ['Steel ring', 'Jewlery', 'Caves', 1, 5, 'Uncommon', 50, 1, 1],
  ['Large Net', 'Tool', 'Caves', 1, 5, 'Uncommon', 50, 1, 2],
  ['An actual walking stick', 'Tool', 'Caves', 1, 5, 'Uncommon', 50, 1, 2],
  ['Steel Battleaxe', 'Weapon', 'Any', 1, 3, 'Uncommon', 55, 1, 1],
  ['Steel Mace', 'Weapon', 'Any', 1, 3, 'Uncommon', 55, 1, 1],
  ['Callor', 'Currency', 'Any', 3, 5, 'Rare', 35, 1, 50],
  ['Horse', 'Animal', 'Base, Camp', 1, 3, 'Rare', 35, 1, 5],
  ['War Horse', 'Animal', 'Base, Camp', 3, 5, 'Rare', 35, 1, 5],
  ['Quartz', 'Gemstone', 'Goblin, Goblin Camp, Goblin Tower, Caves', 1, 5, 'Rare', 40, 1, 5],
  ['Heavy Duffle', 'Storage', 'Any', 2, 5, 'Rare', 35, 1, 2],
  ['Steel Shield', 'Tool', 'Any', 3, 5, 'Rare', 30, 1, 2],
  ['Mythril Pickaxe', 'Tool', 'Any', 2, 4, 'Rare', 35, 1, 2],
  ['Mythril Sword', 'Tool', 'Any', 2, 4, 'Rare', 35, 1, 2],
  ['Mythril Dagger', 'Tool', 'Any', 2, 4, 'Rare', 35, 1, 2],
  ['Mythril Axe', 'Tool', 'Any', 2, 4, 'Rare', 35, 1, 2],
  ['Mythril Battleaxe', 'Weapon', 'Any', 2, 4, 'Rare', 30, 1, 1],
  ['Mythril Mace', 'Weapon', 'Any', 2, 4, 'Rare', 30, 1, 1],
  ['Vaylium Battleaxe', 'Weapon', 'Any', 3, 5, 'Epic', 15, 1, 1],
  ['Vaylium Mace', 'Weapon', 'Any', 3, 5, 'Epic', 15, 1, 1],
  ['Vaylium Pickaxe', 'Tool', 'Any', 3, 5, 'Epic', 20, 1, 2],
  ['Vaylium Sword', 'Tool', 'Any', 3, 5, 'Epic', 20, 1, 2],
  ['Vaylium Dagger', 'Tool', 'Any', 3, 5, 'Epic', 20, 1, 2],
  ['Vaylium Axe', 'Tool', 'Any', 3, 5, 'Epic', 20, 1, 2],
  ['Fire Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Frost Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Lightning Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Earth Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Wind Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Energy Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Healing Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Enhancment Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 20, 1, 2],
  ['Utility Scroll', 'Scroll', 'Tower, Base', 3, 5, 'Epic', 25, 1, 1],
  ['Mystery Tome', 'Tome', 'Any', 1, 5, 'Epic', 20, 1, 1],
  ['World Map Fragment', 'Lore', 'Any', 1, 5, 'Epic', 20, 1, 1],
  ['World History', 'Lore', 'Any', 1, 5, 'Epic', 20, 1, 1],
  ['Greater Healing Potion', 'Potion', 'Any', 1, 5, 'Epic', 25, 1, 4],
  ['Emerald', 'Gemstone', 'Goblin, Goblin Camp, Goblin Tower, Caves', 2, 5, 'Epic', 30, 1, 4],
  ['Ruby', 'Gemstone', 'Goblin, Goblin Camp, Goblin Tower, Caves', 3, 5, 'Epic', 20, 1, 3],
  ['Ember Rune', 'Rune', 'Any', 1, 5, 'Epic', 15, 1, 3],
  ['Frost Rune', 'Rune', 'Any', 1, 5, 'Epic', 15, 1, 3],
  ['Lightning Rune', 'Rune', 'Any', 1, 5, 'Epic', 15, 1, 3],
  ['Earth Rune', 'Rune', 'Any', 1, 5, 'Epic', 15, 1, 3],
  ['Wind Rune', 'Rune', 'Any', 1, 5, 'Epic', 15, 1, 3],
  ['Mountian Rune', 'Rune', 'Any', 1, 5, 'Epic', 11, 1, 3],
  ['Dragonscale Sword', 'Tool', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Dragonscale Dagger', 'Tool', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Dragonscale Pickaxe', 'Tool', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Dragonscale Axe', 'Tool', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Mythril Ore', 'Material', 'Any', 2, 4, 'Legendary', 5, 1, 3],
  ['Vaylium Ore', 'Material', 'Any', 3, 5, 'Legendary', 5, 1, 3],
  ['Young Dragons Scales', 'Material', 'Any', 4, 5, 'Legendary', 5, 1, 3],
  ['Ember Dragons Scales', 'Material', 'Volcano, Caves', 4, 5, 'Legendary', 5, 1, 3],
  ['Frost Dragons Scales', 'Material', 'Mountians, Snow', 4, 5, 'Legendary', 5, 1, 3],
  ['Storm Dragons Scales', 'Material', 'Caves', 4, 5, 'Legendary', 5, 1, 3],
  ['Mountian Dragons Scales', 'Material', 'Mountians, Caves', 4, 5, 'Legendary', 5, 1, 3],
  ['Cal', 'Currency', 'Any', 5, 5, 'Legendary', 5, 1, 50],
  ['Dragonscale Bow', 'Tool', 'Any', 4, 5, 'Legendary', 5, 1, 1],
  ['Greatest Healing Potion', 'Potion', 'Any', 3, 5, 'Legendary', 5, 1, 3],
  ['Fire Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Frost Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Lightning Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Earth Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Wind Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Energy Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Healing Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Enhancement Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Utility Spell Upgrade', 'Upgrade', 'Elven Tower', 3, 5, 'Legendary', 9, 1, 1],
  ['Sapphire', 'Gemstone', 'Goblin, Goblin Camp, Goblin Tower, Caves', 4, 5, 'Legendary', 10, 1, 2],
  ['Legendary Weapon', 'Weapon', 'Any', 1, 5, 'Legendary', 10, 1, 1],
  ['Dragonscale Battleaxe', 'Weapon', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Dragonscale Mace', 'Weapon', 'Any', 4, 5, 'Legendary', 5, 1, 2],
  ['Bag of Holding', 'Storage', 'Any', 3, 5, 'Mythical', 2, 1, 1],
  ['Void Rune', 'Rune', 'Any', 1, 5, 'Mythical', 2, 1, 5],
  ['Elder Dragons Scales', 'Material', 'Elven Tower', 5, 5, 'Mythical', 2, 1, 3],
  ['Void Dragon Scales', 'Material', 'Voidlands', 5, 5, 'Mythical', 2, 1, 3],
  ["Father's Belt", 'Weapon', 'Any', 1, 5, 'Mythical', 2, 1, 1]
];

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function itemType(category: string): InventoryItemType {
  if (category === 'Weapon') return 'weapon';
  if (category === 'Clothing') return 'armor';
  if (['Potion', 'Alchemy', 'Food'].includes(category)) return 'consumable';
  if (['Tool', 'Storage', 'Gear'].includes(category)) return 'tool';
  if (['Scroll', 'Tome', 'Lore', 'Upgrade'].includes(category)) return 'quest';
  return 'misc';
}

function storageCapacity(name: string) {
  const capacities: Record<string, number> = {
    'Waist Pouch': 1,
    'Back Bag': 3,
    'Light Duffle': 6,
    'Heavy Duffle': 10,
    'Bag of Holding': 100
  };
  return capacities[name] ?? 0;
}

export const DEFAULT_LOOT_ENTRIES: LootEntry[] = rows.map(
  ([item_name, category, biomes, min_difficulty, max_difficulty, rarity, weight, min_quantity, max_quantity]) => ({
    item_key: slug(item_name),
    item_name,
    category,
    biomes,
    min_difficulty,
    max_difficulty,
    rarity,
    weight,
    min_quantity,
    max_quantity,
    item_type: itemType(category),
    storage_capacity: storageCapacity(item_name)
  })
);

export const LOOT_BIOMES = [
  'Any', 'Caves', 'Goblin Camp', 'Goblin Tower', 'Goblin Base', 'Ruined Camp', 'Ruined Base',
  'Elven Tower', 'Volcano', 'Mountains', 'Snow', 'Voidlands'
];
export const LOOT_POOL_SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Massive', 'Tower Floor', 'Base'];
export const LOOT_ROOM_TYPES = ['Normal', 'Secret Room', 'Tower Boss Room'];
