import type { InventoryItemType } from '@/lib/types';

export type ItemCatalogEntry = {
  key: string;
  name: string;
  category: string;
  rarity: string;
  item_type: InventoryItemType;
  min_quantity: number;
  max_quantity: number;
};

export const ITEM_CATALOG: ItemCatalogEntry[] = [
  {
    "key": "torch",
    "name": "Torch",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "rope",
    "name": "Rope",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "waist-pouch",
    "name": "Waist Pouch",
    "category": "Storage",
    "rarity": "Common",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "back-bag",
    "name": "Back Bag",
    "category": "Storage",
    "rarity": "Common",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "leather",
    "name": "Leather",
    "category": "Material",
    "rarity": "Common",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 10
  },
  {
    "key": "jewlery",
    "name": "Jewlery",
    "category": "Item",
    "rarity": "Common",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "loose-arrows",
    "name": "Loose Arrows",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 3,
    "max_quantity": 25
  },
  {
    "key": "cloth",
    "name": "Cloth",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "fine-cloth",
    "name": "Fine Cloth",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "magic-bow",
    "name": "Magic Bow",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "coin",
    "name": "Coin",
    "category": "Currency",
    "rarity": "Common",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 50
  },
  {
    "key": "fishing-rod",
    "name": "Fishing Rod",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "hunting-trap",
    "name": "Hunting Trap",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "dried-rations",
    "name": "Dried Rations",
    "category": "Food",
    "rarity": "Common",
    "item_type": "food",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "tattered-cloak",
    "name": "Tattered Cloak",
    "category": "Clothing",
    "rarity": "Common",
    "item_type": "armor",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "leather-belt",
    "name": "Leather Belt",
    "category": "Clothing",
    "rarity": "Common",
    "item_type": "accessory",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "glass-flasks",
    "name": "Glass Flasks",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "small-net",
    "name": "Small Net",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "looks-like-a-good-walking-stick",
    "name": "Looks like a good walking stick",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 200
  },
  {
    "key": "callis",
    "name": "Callis",
    "category": "Currency",
    "rarity": "Uncommon",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 50
  },
  {
    "key": "longbow",
    "name": "Longbow",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "fur-skin",
    "name": "Fur Skin",
    "category": "Material",
    "rarity": "Uncommon",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "light-duffle",
    "name": "Light Duffle",
    "category": "Storage",
    "rarity": "Uncommon",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-shovel",
    "name": "Steel Shovel",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-pickaxe",
    "name": "Steel Pickaxe",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-sword",
    "name": "Steel Sword",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-axe",
    "name": "Steel Axe",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "spyglass",
    "name": "Spyglass",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "smoke-bomb",
    "name": "Smoke Bomb",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "steel-ring",
    "name": "Steel ring",
    "category": "Jewlery",
    "rarity": "Uncommon",
    "item_type": "accessory",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "large-net",
    "name": "Large Net",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "an-actual-walking-stick",
    "name": "An actual walking stick",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-battleaxe",
    "name": "Steel Battleaxe",
    "category": "Weapon",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "steel-mace",
    "name": "Steel Mace",
    "category": "Weapon",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "arcane-nector",
    "name": "Arcane Nector",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 10
  },
  {
    "key": "lesser-healing-potion",
    "name": "Lesser Healing Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-swiftness-potion",
    "name": "Lesser Swiftness Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-agility-potion",
    "name": "Lesser Agility Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-strength-potion",
    "name": "Lesser Strength Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-sorcery-potion",
    "name": "Lesser Sorcery Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-mana-potion",
    "name": "Lesser Mana Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-antidote-potion",
    "name": "Lesser Antidote Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-warming-potion",
    "name": "Lesser Warming Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-cooling-potion",
    "name": "Lesser Cooling Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-night-eye-potion",
    "name": "Lesser Night-Eye Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-thickskin-potion",
    "name": "Lesser Thickskin Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-clear-mind-potion",
    "name": "Lesser Clear-Mind Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-wake-up-potion",
    "name": "Lesser Wake-Up Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "lesser-clotting-potion",
    "name": "Lesser Clotting Potion",
    "category": "Potion",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "callor",
    "name": "Callor",
    "category": "Currency",
    "rarity": "Rare",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 50
  },
  {
    "key": "horse",
    "name": "Horse",
    "category": "Animal",
    "rarity": "Rare",
    "item_type": "pet",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "war-horse",
    "name": "War Horse",
    "category": "Animal",
    "rarity": "Rare",
    "item_type": "pet",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "quartz",
    "name": "Quartz",
    "category": "Gemstone",
    "rarity": "Rare",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "heavy-duffle",
    "name": "Heavy Duffle",
    "category": "Storage",
    "rarity": "Rare",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-shield",
    "name": "Steel Shield",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "shield",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-pickaxe",
    "name": "Mythril Pickaxe",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-sword",
    "name": "Mythril Sword",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-dagger",
    "name": "Mythril Dagger",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-axe",
    "name": "Mythril Axe",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-battleaxe",
    "name": "Mythril Battleaxe",
    "category": "Weapon",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "mythril-mace",
    "name": "Mythril Mace",
    "category": "Weapon",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "greater-wake-up-potion",
    "name": "Greater Wake-Up Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-clotting-potion",
    "name": "Greater Clotting Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-clear-mind-potion",
    "name": "Greater Clear-Mind Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-thickskin-potion",
    "name": "Greater Thickskin Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-night-eye-potion",
    "name": "Greater Night-Eye Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-cooling-potion",
    "name": "Greater Cooling Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-warming-potion",
    "name": "Greater Warming Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-antidote-potion",
    "name": "Greater Antidote Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-mana-potion",
    "name": "Greater Mana Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-sorcery-potion",
    "name": "Greater Sorcery Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-strength-potion",
    "name": "Greater Strength Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-agility-potion",
    "name": "Greater Agility Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-swiftness-potion",
    "name": "Greater Swiftness Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "greater-healing-potion",
    "name": "Greater Healing Potion",
    "category": "Potion",
    "rarity": "Rare",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "vaylium-battleaxe",
    "name": "Vaylium Battleaxe",
    "category": "Weapon",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "vaylium-mace",
    "name": "Vaylium Mace",
    "category": "Weapon",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "vaylium-pickaxe",
    "name": "Vaylium Pickaxe",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "vaylium-sword",
    "name": "Vaylium Sword",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "vaylium-dagger",
    "name": "Vaylium Dagger",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "vaylium-axe",
    "name": "Vaylium Axe",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "fire-scroll",
    "name": "Fire Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "frost-scroll",
    "name": "Frost Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "lightning-scroll",
    "name": "Lightning Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "earth-scroll",
    "name": "Earth Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "wind-scroll",
    "name": "Wind Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "energy-scroll",
    "name": "Energy Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "healing-scroll",
    "name": "Healing Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "enhancment-scroll",
    "name": "Enhancment Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "utility-scroll",
    "name": "Utility Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "mystery-tome",
    "name": "Mystery Tome",
    "category": "Tome",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "world-map-fragment",
    "name": "World Map Fragment",
    "category": "Lore",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "world-history",
    "name": "World History",
    "category": "Lore",
    "rarity": "Epic",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "emerald",
    "name": "Emerald",
    "category": "Gemstone",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 4
  },
  {
    "key": "ruby",
    "name": "Ruby",
    "category": "Gemstone",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "ember-rune",
    "name": "Ember Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "frost-rune",
    "name": "Frost Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "lightning-rune",
    "name": "Lightning Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "earth-rune",
    "name": "Earth Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "wind-rune",
    "name": "Wind Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "mountian-rune",
    "name": "Mountian Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "dragonscale-sword",
    "name": "Dragonscale Sword",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "dragonscale-dagger",
    "name": "Dragonscale Dagger",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "dragonscale-pickaxe",
    "name": "Dragonscale Pickaxe",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "dragonscale-axe",
    "name": "Dragonscale Axe",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "mythril-ore",
    "name": "Mythril Ore",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "vaylium-ore",
    "name": "Vaylium Ore",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "young-dragons-scales",
    "name": "Young Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "ember-dragons-scales",
    "name": "Ember Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "frost-dragons-scales",
    "name": "Frost Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "storm-dragons-scales",
    "name": "Storm Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "mountian-dragons-scales",
    "name": "Mountian Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "cal",
    "name": "Cal",
    "category": "Currency",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 50
  },
  {
    "key": "dragonscale-bow",
    "name": "Dragonscale Bow",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "fire-spell-upgrade",
    "name": "Fire Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "frost-spell-upgrade",
    "name": "Frost Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "lightning-spell-upgrade",
    "name": "Lightning Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "earth-spell-upgrade",
    "name": "Earth Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "wind-spell-upgrade",
    "name": "Wind Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "energy-spell-upgrade",
    "name": "Energy Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "healing-spell-upgrade",
    "name": "Healing Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "enhancement-spell-upgrade",
    "name": "Enhancement Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "utility-spell-upgrade",
    "name": "Utility Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "quest",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "sapphire",
    "name": "Sapphire",
    "category": "Gemstone",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "legendary-weapon",
    "name": "Legendary Weapon",
    "category": "Weapon",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "dragonscale-battleaxe",
    "name": "Dragonscale Battleaxe",
    "category": "Weapon",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "dragonscale-mace",
    "name": "Dragonscale Mace",
    "category": "Weapon",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "greatest-healing-potion",
    "name": "Greatest Healing Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-swiftness-potion",
    "name": "Greatest Swiftness Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-agility-potion",
    "name": "Greatest Agility Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-strength-potion",
    "name": "Greatest Strength Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-sorcery-potion",
    "name": "Greatest Sorcery Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-mana-potion",
    "name": "Greatest Mana Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-antidote-potion",
    "name": "Greatest Antidote Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-warming-potion",
    "name": "Greatest Warming Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-cooling-potion",
    "name": "Greatest Cooling Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-night-eye-potion",
    "name": "Greatest Night-Eye Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-thinkskin-potion",
    "name": "Greatest Thinkskin Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-clear-mind-potion",
    "name": "Greatest Clear-Mind Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-wake-up-potion",
    "name": "Greatest Wake-Up Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "greatest-clotting-potion",
    "name": "Greatest Clotting Potion",
    "category": "Potion",
    "rarity": "Legendary",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "bag-of-holding",
    "name": "Bag of Holding",
    "category": "Storage",
    "rarity": "Mythical",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "void-rune",
    "name": "Void Rune",
    "category": "Rune",
    "rarity": "Mythical",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "elder-dragons-scales",
    "name": "Elder Dragons Scales",
    "category": "Material",
    "rarity": "Mythical",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "void-dragon-scales",
    "name": "Void Dragon Scales",
    "category": "Material",
    "rarity": "Mythical",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "father-s-belt",
    "name": "Father's Belt",
    "category": "Weapon",
    "rarity": "Mythical",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  }
];
