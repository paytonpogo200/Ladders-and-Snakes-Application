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
    "key": "an-actual-walking-stick",
    "name": "An actual walking stick",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "arcane-nector",
    "name": "Arcane Nector",
    "category": "Alchemy",
    "rarity": "Uncommon",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 10
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
    "key": "bag-of-holding",
    "name": "Bag of Holding",
    "category": "Storage",
    "rarity": "Mythical",
    "item_type": "storage",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "callis",
    "name": "Callis",
    "category": "Currency",
    "rarity": "Uncommon",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 50
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
    "key": "cloth",
    "name": "Cloth",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "dragonscale-axe",
    "name": "Dragonscale Axe",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
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
    "key": "dragonscale-bow",
    "name": "Dragonscale Bow",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "dragonscale-mace",
    "name": "Dragonscale Mace",
    "category": "Weapon",
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
    "key": "dragonscale-sword",
    "name": "Dragonscale Sword",
    "category": "Tool",
    "rarity": "Legendary",
    "item_type": "weapon",
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
    "key": "earth-rune",
    "name": "Earth Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "earth-scroll",
    "name": "Earth Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "earth-spell-upgrade",
    "name": "Earth Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "ember-dragons-scales",
    "name": "Ember Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "ember-rune",
    "name": "Ember Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "energy-scroll",
    "name": "Energy Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "energy-spell-upgrade",
    "name": "Energy Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "enhancement-spell-upgrade",
    "name": "Enhancement Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "enhancment-scroll",
    "name": "Enhancment Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "father-s-belt",
    "name": "Father's Belt",
    "category": "Weapon",
    "rarity": "Mythical",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "fine-cloth",
    "name": "Fine Cloth",
    "category": "Gear",
    "rarity": "Common",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "fire-scroll",
    "name": "Fire Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "fire-spell-upgrade",
    "name": "Fire Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "frost-dragons-scales",
    "name": "Frost Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "frost-rune",
    "name": "Frost Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "frost-scroll",
    "name": "Frost Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "frost-spell-upgrade",
    "name": "Frost Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "fur-skin",
    "name": "Fur Skin",
    "category": "Material",
    "rarity": "Uncommon",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 5
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
    "key": "greater-healing-potion",
    "name": "Greater Healing Potion",
    "category": "Potion",
    "rarity": "Epic",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 4
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
    "key": "healing-scroll",
    "name": "Healing Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "healing-spell-upgrade",
    "name": "Healing Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "horse",
    "name": "Horse",
    "category": "Animal",
    "rarity": "Rare",
    "item_type": "pet",
    "min_quantity": 1,
    "max_quantity": 5
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
    "key": "jewlery",
    "name": "Jewlery",
    "category": "Item",
    "rarity": "Common",
    "item_type": "accessory",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "leather",
    "name": "Leather",
    "category": "Material",
    "rarity": "Common",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 10
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
    "key": "legendary-weapon",
    "name": "Legendary Weapon",
    "category": "Weapon",
    "rarity": "Legendary",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "lesser-mana-regen-potion",
    "name": "Lesser Mana Regen Potion",
    "category": "Alchemy",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "lesser-strength-potion",
    "name": "Lesser Strength Potion",
    "category": "Alchemy",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "lesser-swiftness-potion",
    "name": "Lesser Swiftness Potion",
    "category": "Alchemy",
    "rarity": "Uncommon",
    "item_type": "potion",
    "min_quantity": 1,
    "max_quantity": 2
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
    "key": "lightning-rune",
    "name": "Lightning Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "lightning-scroll",
    "name": "Lightning Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "lightning-spell-upgrade",
    "name": "Lightning Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "looks-like-a-good-walking-stick",
    "name": "Looks like a good walking stick",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 200
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
    "key": "magic-bow",
    "name": "Magic Bow",
    "category": "Tool",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
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
    "key": "mountian-rune",
    "name": "Mountian Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "mystery-tome",
    "name": "Mystery Tome",
    "category": "Tome",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "mythril-dagger",
    "name": "Mythril Dagger",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
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
    "key": "mythril-ore",
    "name": "Mythril Ore",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "quartz",
    "name": "Quartz",
    "category": "Gemstone",
    "rarity": "Rare",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 5
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
    "key": "ruby",
    "name": "Ruby",
    "category": "Gemstone",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "small-net",
    "name": "Small Net",
    "category": "Tool",
    "rarity": "Common",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 3
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
    "key": "spyglass",
    "name": "Spyglass",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "steel-pickaxe",
    "name": "Steel Pickaxe",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 2
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
    "key": "steel-shield",
    "name": "Steel Shield",
    "category": "Tool",
    "rarity": "Rare",
    "item_type": "shield",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "steel-shovel",
    "name": "Steel Shovel",
    "category": "Tool",
    "rarity": "Uncommon",
    "item_type": "tool",
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
    "key": "storm-dragons-scales",
    "name": "Storm Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "tattered-cloak",
    "name": "Tattered Cloak",
    "category": "Clothing",
    "rarity": "Common",
    "item_type": "fabric",
    "min_quantity": 1,
    "max_quantity": 1
  },
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
    "key": "utility-scroll",
    "name": "Utility Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "utility-spell-upgrade",
    "name": "Utility Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "vaylium-battleaxe",
    "name": "Vaylium Battleaxe",
    "category": "Weapon",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "vaylium-mace",
    "name": "Vaylium Mace",
    "category": "Weapon",
    "rarity": "Epic",
    "item_type": "weapon",
    "min_quantity": 1,
    "max_quantity": 1
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
    "key": "void-dragon-scales",
    "name": "Void Dragon Scales",
    "category": "Material",
    "rarity": "Mythical",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "void-rune",
    "name": "Void Rune",
    "category": "Rune",
    "rarity": "Mythical",
    "item_type": "misc",
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
    "key": "war-horse",
    "name": "War Horse",
    "category": "Animal",
    "rarity": "Rare",
    "item_type": "pet",
    "min_quantity": 1,
    "max_quantity": 5
  },
  {
    "key": "wind-rune",
    "name": "Wind Rune",
    "category": "Rune",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 3
  },
  {
    "key": "wind-scroll",
    "name": "Wind Scroll",
    "category": "Scroll",
    "rarity": "Epic",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 2
  },
  {
    "key": "wind-spell-upgrade",
    "name": "Wind Spell Upgrade",
    "category": "Upgrade",
    "rarity": "Legendary",
    "item_type": "misc",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "world-history",
    "name": "World History",
    "category": "Lore",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "world-map-fragment",
    "name": "World Map Fragment",
    "category": "Lore",
    "rarity": "Epic",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 1
  },
  {
    "key": "young-dragons-scales",
    "name": "Young Dragons Scales",
    "category": "Material",
    "rarity": "Legendary",
    "item_type": "ore",
    "min_quantity": 1,
    "max_quantity": 3
  }
];
