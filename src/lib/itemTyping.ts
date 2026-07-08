import type { InventoryItemType } from '@/lib/types';

const storageCapacities: Record<string, number> = {
  'waist pouch': 1,
  'back bag': 3,
  'light duffle': 6,
  'heavy duffle': 10,
  'bag of holding': 100
};

function clean(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function hasAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

export function inferItemType(itemName = '', category = ''): InventoryItemType {
  const name = clean(itemName);
  const cat = clean(category);
  const combined = `${name} ${cat}`;

  if (cat === 'storage' || hasAny(name, ['pouch', 'bag', 'duffle', 'satchel', 'pack', 'chest', 'storage'])) return 'storage';
  if (hasAny(name, ['horse', 'dog', 'hound', 'mule', 'pony', 'pet']) || cat === 'animal' || cat === 'stable') return 'pet';
  if (hasAny(name, ['shield', 'buckler'])) return 'shield';
  if (cat === 'weapon' || hasAny(name, ['sword', 'dagger', 'spear', 'axe', 'bow', 'crossbow', 'mace', 'hammer', 'staff', 'wand', 'blade', 'club', 'weapon'])) return 'weapon';
  if (cat === 'armor' || cat === 'clothing' || hasAny(name, ['armor', 'armour', 'helmet', 'helm', 'gauntlet', 'greave', 'mail', 'plate', 'wear'])) return 'armor';
  if (hasAny(name, ['ring', 'amulet', 'necklace', 'bracelet', 'belt', 'charm', 'talisman', 'jewel'])) return 'accessory';
  if (cat === 'potion' || hasAny(name, ['potion', 'elixir', 'draught', 'antidote'])) return 'potion';
  if (cat === 'food' || hasAny(name, ['meal', 'food', 'bread', 'meat', 'ration', 'stew'])) return 'food';
  if (cat === 'plant' || hasAny(name, ['berry', 'root', 'leaf', 'moss', 'flower', 'petal', 'reed', 'aloe', 'plant', 'wheat', 'clover', 'mint'])) return 'plant';
  if (cat === 'fabric' || hasAny(name, ['leather', 'cloth', 'fabric', 'silk', 'hide', 'thread'])) return 'fabric';
  if (cat === 'ore' || cat === 'catalyst' || cat === 'alchemy' || hasAny(name, ['ore', 'scale', 'ingot', 'crystal', 'stone', 'core', 'fang', 'feather', 'gland', 'residue', 'catalyst', 'quartz', 'ruby', 'emerald', 'sapphire', 'mythril', 'vaylium', 'iron', 'bronze', 'steel'])) return 'ore';
  if (cat === 'scroll' || cat === 'tome' || cat === 'lore' || cat === 'upgrade' || hasAny(name, ['book', 'record', 'research', 'scroll', 'tome'])) return 'quest';
  if (cat === 'tool' || cat === 'gear' || hasAny(combined, ['torch', 'rope', 'arrow', 'lock', 'shovel', 'tool', 'gear', 'kit', 'ink', 'paper'])) return 'tool';

  return 'misc';
}

export function storageCapacityForItem(itemName = '') {
  return storageCapacities[clean(itemName)] ?? 0;
}
