import type { InventoryItemType } from '@/lib/types';
import { CALOSTRYNN_SPELLS } from '@/lib/spellPresets';
import { inferItemType } from '@/lib/itemTyping';

export const CALOSTRYNN_CURRENCY = {
  system_key: 'calostrynn',
  name: 'Calostrynn Currency',
  base_unit_name: 'Coin',
  denominations: [
    { denomination_key: 'coin', name: 'Coin', base_value: 1, sort_order: 0 },
    { denomination_key: 'callis', name: 'Callis', base_value: 10, sort_order: 1 },
    { denomination_key: 'callor', name: 'Callor', base_value: 100, sort_order: 2 },
    { denomination_key: 'cal', name: 'Cal', base_value: 10000, sort_order: 3 }
  ]
};

export const CALOSTRYNN_FACILITIES = [
  { facility_key: 'market', name: 'Grand Market', description: 'Independent stands, supplies, lodging, animals, and daily necessities.', sort_order: 0 },
  { facility_key: 'brewery', name: 'Calostrynn Brewery', description: 'Fine potions, plants, stabilizers, catalysts, and practical brewing guidance.', sort_order: 1 },
  { facility_key: 'blacksmith', name: 'Royal Blacksmith', description: 'Weapons, materials, repairs, enhancements, and enchantments.', sort_order: 3 },
  { facility_key: 'armory', name: 'Royal Armory', description: 'Armor construction, repairs, and specialist materials.', sort_order: 4 },
  { facility_key: 'library', name: 'Grand Library', description: 'Books, research, learned spells, and restricted archives.', sort_order: 5 }
];

export const CALOSTRYNN_VENDORS = [
  { facility_key: 'market', vendor_key: 'storage', name: 'Storage Keeper', role: 'Storage merchant', sort_order: 0 },
  { facility_key: 'market', vendor_key: 'supplies', name: 'Supply Merchant', role: 'General supplies', sort_order: 1 },
  { facility_key: 'market', vendor_key: 'jeweler', name: 'Jeweler', role: 'Gems and valuables', sort_order: 2 },
  { facility_key: 'market', vendor_key: 'clothier', name: 'Clothier', role: 'Travel clothing', sort_order: 3 },
  { facility_key: 'market', vendor_key: 'tavern', name: 'Tavern Keeper', role: 'Meals and rooms', sort_order: 4 },
  { facility_key: 'market', vendor_key: 'stable', name: 'Stable Keeper', role: 'Mounts and animals', sort_order: 5 },
  { facility_key: 'brewery', vendor_key: 'brewer', name: 'Master Brewer', role: 'Fine potions', sort_order: 0 },
  { facility_key: 'brewery', vendor_key: 'pantry', name: 'Ingredient Keeper', role: 'Plants, stabilizers, and catalysts', sort_order: 1 },
  { facility_key: 'blacksmith', vendor_key: 'smith', name: 'Royal Smith', role: 'Weapons and smithing', sort_order: 0 },
  { facility_key: 'armory', vendor_key: 'armorer', name: 'Royal Armorer', role: 'Armor and materials', sort_order: 0 },
  { facility_key: 'library', vendor_key: 'librarian', name: 'Archivist', role: 'Books and research', sort_order: 0 },
  { facility_key: 'library', vendor_key: 'spellwright', name: 'Spellwright', role: 'Practical spell instruction', sort_order: 1 },
  { facility_key: 'library', vendor_key: 'restricted', name: 'Restricted Curator', role: 'Restricted archives', sort_order: 2 }
];

export type SeedProduct = {
  product_key: string;
  name: string;
  description: string;
  item_type: InventoryItemType;
  price_base: number;
  stock_quantity: number | null;
  storage_capacity: number;
  is_available: boolean;
  spell_key?: string | null;
  vendor_keys: string[];
};

const p = (
  product_key: string,
  name: string,
  price_base: number,
  vendor_keys: string[],
  options: Partial<Omit<SeedProduct, 'product_key' | 'name' | 'price_base' | 'vendor_keys'>> = {}
): SeedProduct => ({
  product_key,
  name,
  description: '',
  item_type: inferItemType(name, vendor_keys[0] ?? ''),
  price_base,
  stock_quantity: null,
  storage_capacity: 0,
  is_available: true,
  spell_key: null,
  vendor_keys,
  ...options
});

const marketProducts: SeedProduct[] = [
  p('waist-pouch', 'Waist Pouch', 8, ['storage'], { item_type: 'storage', storage_capacity: 1, description: 'A small 1-slot storage container.' }),
  p('back-bag', 'Back Bag', 80, ['storage'], { item_type: 'storage', storage_capacity: 3, description: 'A 3-slot storage container.' }),
  p('light-duffle', 'Light Duffle', 200, ['storage'], { item_type: 'storage', storage_capacity: 6, description: 'A 6-slot storage container.' }),
  p('heavy-duffle', 'Heavy Duffle', 500, ['storage'], { item_type: 'storage', storage_capacity: 10, description: 'A 10-slot storage container.' }),
  p('bag-of-holding', 'Bag of Holding', 2500000, ['storage'], { item_type: 'storage', storage_capacity: 100, description: 'A magical 100-slot storage container.' }),
  p('light-wagon', 'Light Wagon', 2500, ['storage'], { item_type: 'storage', description: 'A travel wagon. It becomes character property, not carried storage.' }),
  p('heavy-wagon', 'Heavy Wagon', 6000, ['storage'], { item_type: 'storage', description: 'A heavy travel wagon. It becomes character property, not carried storage.' }),
  ...[
    ['torches', 'Torches', 3], ['rope', 'Rope', 10], ['blankets', 'Blankets', 8], ['cooking-pots', 'Cooking Pots', 10],
    ['cloth', 'Cloth', 2], ['fine-cloth', 'Fine Cloth', 50], ['ink-paper', 'Ink and Paper', 5], ['lock', 'Lock', 20],
    ['shovel', 'Shovel', 20], ['hammer', 'Hammer', 10], ['axe', 'Axe', 40]
  ].map(([key, name, price]) => p(String(key), String(name), Number(price), ['supplies'], { item_type: 'tool' })),
  ...[
    ['quartz', 'Quartz', 1000], ['emerald', 'Emerald', 1500], ['ruby', 'Ruby', 2000], ['sapphire', 'Sapphire', 3500]
  ].map(([key, name, price]) => p(String(key), String(name), Number(price), ['jeweler'])),
  p('winter-wear', 'Winter Wear', 50, ['clothier'], { item_type: 'armor' }),
  p('heat-wear', 'Heat Wear', 40, ['clothier'], { item_type: 'armor' }),
  p('rainproof-wear', 'Rainproof Wear', 60, ['clothier'], { item_type: 'armor' }),
  p('basic-meal', 'Basic Meal', 2, ['tavern'], { item_type: 'food' }),
  p('tavern-meal', 'Tavern Meal', 5, ['tavern'], { item_type: 'food' }),
  p('inn-room', 'Inn Room', 10, ['tavern'], { description: 'One standard night of lodging.' }),
  p('fine-inn', 'Fine Inn', 50, ['tavern'], { description: 'One fine night of lodging.' }),
  p('horse', 'Horse', 1000, ['stable'], { description: 'A riding horse.' }),
  p('war-horse', 'War Horse', 5000, ['stable'], { description: 'A trained war horse.' }),
  p('dog', 'Dog', 1000, ['stable'], { description: 'A loyal dog.' })
];

const smithProducts: SeedProduct[] = [
  p('dagger', 'Dagger', 50, ['smith'], { item_type: 'weapon' }),
  p('sword', 'Sword', 150, ['smith'], { item_type: 'weapon' }),
  p('spear', 'Spear', 80, ['smith'], { item_type: 'weapon' }),
  p('shield', 'Shield', 120, ['smith'], { item_type: 'shield' }),
  p('custom-weapon', 'Custom Weapon Commission', 200, ['smith'], { item_type: 'weapon', description: 'Starting price; final cost is set over the table.' }),
  p('smith-bronze-scale', 'Bronze Scale', 100, ['smith'], { description: 'Armor or weapon crafting material.' }),
  p('smith-iron-scale', 'Iron Scale', 400, ['smith'], { description: 'Durable material; items made from it will not break.' }),
  p('smith-steel-scale', 'Steel Scale', 1000, ['smith'], { description: 'Higher-damage material; grants +1 Strength.' }),
  p('smith-mythril-scale', 'Mythril Scale', 6500, ['smith'], { description: 'Enchantable crafting material.' }),
  p('smith-vaylium-scale', 'Vaylium Scale', 5000, ['smith'], { description: 'Magic-amplifying material that uses Intelligence.' }),
  p('smith-dragonscale', 'Dragonscale', 15000, ['smith'], { description: '+2 Strength and +3 Magic Resistance.' }),
  p('weapon-repair', 'Weapon Repair', 40, ['smith'], { description: 'Starting price; actual repair may cost up to 10 Callis.' }),
  p('weapon-enhancement', 'Weapon Enhancement', 100, ['smith'], { description: 'Starting price; actual enhancement may cost up to 10 Callor.' }),
  p('weapon-enchantment', 'Weapon Enchantment', 2000, ['smith'], { description: 'Starting price; actual enchantment may cost up to 25 Callor.' })
];

const armoryProducts: SeedProduct[] = [
  p('full-armor-labor', 'Full Armor Labor', 500, ['armorer'], { item_type: 'armor', description: 'Labor cost only; a full suit also requires 3 material scales.' }),
  p('armor-repair', 'Armor Repair', 100, ['armorer'], { item_type: 'armor', description: 'Labor cost plus 1 material scale.' }),
  p('armor-bronze-scale', 'Bronze Armor Scale', 100, ['armorer'], { description: '-1 Speed, -1 Agility.' }),
  p('armor-steel-scale', 'Steel Armor Scale', 1000, ['armorer'], { description: '-2 Speed, -1 Agility, +1 Vitality.' }),
  p('armor-mythril-scale', 'Mythril Armor Scale', 6500, ['armorer'], { description: '-1 Speed, -1 Agility, +1 Vitality; supports enchanting.' }),
  p('armor-vaylium-scale', 'Vaylium Armor Scale', 5000, ['armorer'], { description: '-1 Speed, -1 Agility, +3 Intelligence, +2 Recovery.' }),
  p('armor-dragonscale', 'Dragonscale Armor Scale', 15000, ['armorer'], { description: '+3 Vitality and strong Magic Resistance.' })
];

const libraryProducts: SeedProduct[] = [
  p('history-books', 'History Books', 100, ['librarian'], { item_type: 'quest' }),
  p('geography-books', 'Geography Books', 500, ['librarian'], { item_type: 'quest', description: 'Starting price; specialized volumes may cost up to 50 Callor.' }),
  p('alchemy-books', 'Alchemy Books', 500, ['librarian'], { item_type: 'quest' }),
  p('bestiaries', 'Bestiaries', 300, ['librarian'], { item_type: 'quest' }),
  p('magical-research', 'Magical Research', 2500, ['librarian'], { item_type: 'quest' }),
  p('forbidden-magic', 'Forbidden Magic', 50000, ['restricted'], { item_type: 'quest' }),
  p('hidden-history', 'Hidden History', 10000, ['restricted'], { item_type: 'quest' }),
  p('dragon-records', 'Dragon Records', 5000, ['restricted'], { item_type: 'quest' }),
  p('void-research', 'Void Research', 5000, ['restricted'], { item_type: 'quest' })
];

const spellProducts: SeedProduct[] = CALOSTRYNN_SPELLS.map((spell) =>
  p(`spell-${spell.spell_key}`, spell.name, spell.price_base, ['spellwright'], {
    item_type: 'quest',
    description: `${spell.mana_label} · ${spell.description}`,
    is_available: spell.is_available,
    spell_key: spell.spell_key
  })
);

const potionLines = [
  ['healing', 'Healing', ['+25 Health', '+75 Health', '+250 Health'], [80, 300, 1200], [6, 3, 1]],
  ['swiftness', 'Swiftness', ['+1 Speed', '+2 Speed', '+5 Speed'], [80, 300, 1500], [4, 2, 1]],
  ['agility', 'Agility', ['+1 Agility', '+2 Agility', '+5 Agility'], [80, 300, 1600], [4, 2, 1]],
  ['strength', 'Strength', ['+1 Strength', '+2 Strength', '+5 Strength'], [80, 300, 1500], [4, 2, 1]],
  ['sorcery', 'Sorcery', ['+1 Intelligence', '+2 Intelligence', '+5 Intelligence'], [100, 400, 1800], [3, 2, 1]],
  ['mana', 'Mana', ['+25 Mana', '+75 Mana', '+250 Mana'], [200, 600, 2200], [3, 2, 1]],
  ['luck', 'Luck', ['+1 to rolls', '+3 to rolls', '+5 to rolls'], [10000, 70000, 300000], [1, 0, 0]],
  ['antidote', 'Antidote', ['Removes poison', 'Removes poison and grants resistance for 3 turns', 'Removes poison and grants immunity for 1 scene'], [60, 150, 400], [6, 3, 1]],
  ['warming', 'Warming', ['Protects from cold for 1 scene', 'Protects from extreme cold for 1 scene', 'Protects from cold, frost damage, and slowing for 1 scene'], [80, 200, 600], [4, 2, 1]],
  ['cooling', 'Cooling', ['Protects from heat for 1 scene', 'Protects from extreme heat for 1 scene', 'Protects from heat, fire damage, and burning for 1 scene'], [80, 200, 600], [4, 2, 1]],
  ['night-eye', 'Night-Eye', ['Better sight in darkness for 1 scene', 'Clear sight in darkness for 1 scene', 'Clear sight in magical darkness for 1 scene'], [100, 300, 800], [4, 2, 1]],
  ['thickskin', 'Thickskin', ['+1 Armor for 3 turns', '+2 Armor for 3 turns', '+4 Armor for 3 turns'], [150, 400, 1400], [3, 2, 1]],
  ['clear-mind', 'Clear-Mind', ['+1 Magic Resistance for 3 turns', '+2 Magic Resistance for 3 turns', '+4 Magic Resistance for 3 turns'], [150, 400, 1400], [3, 2, 1]],
  ['wake-up', 'Wake-Up', ['Wakes a target at 1 HP', 'Wakes a target at 10 HP', 'Wakes a target at 25 HP'], [200, 500, 1000], [3, 2, 1]],
  ['clotting', 'Clotting', ['Stops bleeding', 'Stops bleeding and restores 10 Health', 'Stops bleeding, restores 25 Health, and prevents bleeding for 1 scene'], [80, 200, 600], [5, 3, 1]]
] as const;

const potionProducts: SeedProduct[] = potionLines.flatMap(([key, name, descriptions, prices, stocks]) =>
  (['Lesser', 'Greater', 'Greatest'] as const).map((quality, index) =>
    p(`${key}-${quality.toLowerCase()}`, `${quality} ${name} Potion`, prices[index], ['brewer'], {
      item_type: 'potion',
      description: `${descriptions[index]}. Fine quality.`,
      stock_quantity: stocks[index],
      is_available: !(key === 'luck' && index > 0 && stocks[index] === 0)
    })
  )
);

const plants = [
  ['blessing-berry', 'Blessing Berry', 'Berry · Common · Healing'],
  ['aloe', 'Aloe', 'Succulent · Common · Healing / Stabilizer'],
  ['yarrow', 'Yarrow', 'Fern with flower · Common · Healing / Clotting / Stabilizer'],
  ['axillium', 'Axillium', 'Flower · Uncommon · Healing'],
  ['fulger-wheat', 'Fulger Wheat', 'Wheat · Common · Speed'],
  ['ventus-root', 'Ventus Root', 'Bush root · Uncommon · Speed'],
  ['agilis', 'Agilis', 'Moss · Uncommon · Agility'],
  ['acer-root', 'Acer Root', 'Tree root · Uncommon · Strength'],
  ['aethercap', 'Aethercap', 'Mushroom · Uncommon · Sorcery'],
  ['blueglass-petal', 'Blueglass Petal', 'Flower · Rare · Sorcery'],
  ['manabloom', 'Manabloom', 'Flower · Uncommon · Mana Regen'],
  ['leyroot', 'Leyroot', 'Root · Rare · Mana Regen'],
  ['fortune-clover', 'Fortune Clover', 'Clover · Rare · Luck'],
  ['bitterleaf', 'Bitterleaf', 'Leaf · Common · Antidote'],
  ['snakebane-root', 'Snakebane Root', 'Root · Uncommon · Antidote'],
  ['emberleaf', 'Emberleaf', 'Leaf · Common · Warming'],
  ['cinderroot', 'Cinderroot', 'Root · Uncommon · Warming'],
  ['frostmint', 'Frostmint', 'Herb · Common · Cooling'],
  ['blue-aloe', 'Blue Aloe', 'Succulent · Uncommon · Cooling'],
  ['moonberry', 'Moonberry', 'Berry · Uncommon · Night-Eye'],
  ['stonebark', 'Stonebark', 'Bark · Uncommon · Thickskin'],
  ['ironmoss', 'Ironmoss', 'Moss · Rare · Thickskin'],
  ['stillwater-reed', 'Stillwater Reed', 'Reed · Uncommon · Clear-Mind / Stabilizer'],
  ['clearbell-flower', 'Clearbell Flower', 'Flower · Rare · Clear-Mind'],
  ['dawnpetal', 'Dawnpetal', 'Flower · Uncommon · Wake-Up'],
  ['bitterwake-root', 'Bitterwake Root', 'Root · Rare · Wake-Up'],
  ['bloodmoss', 'Bloodmoss', 'Moss · Uncommon · Clotting'],
  ['purewater-reed', 'Purewater Reed', 'Reed · Common · Stabilizer'],
  ['moonwell-moss', 'Moonwell Moss', 'Moss · Uncommon · Stabilizer']
] as const;

const plantProducts: SeedProduct[] = plants.map(([key, name, description]) =>
  p(`plant-${key}`, name, 0, ['pantry'], {
    item_type: 'plant',
    description,
    stock_quantity: 0,
    is_available: false
  })
);

const catalysts = [
  ['wolf-fang', 'Wolf Fang', 'Common catalyst · +1 · Beast component'],
  ['krug-stone', 'Krug Stone', 'Common catalyst · +1 · Beast component'],
  ['griffin-feather', 'Griffin Feather', 'Uncommon catalyst · +2 · Beast component'],
  ['mana-tick', 'Mana Tick', 'Uncommon catalyst · +2 · Monster component'],
  ['mana-leech', 'Mana Leech', 'Uncommon catalyst · +2 · Monster component'],
  ['embertoothed-fang', 'Embertoothed Fang', 'Uncommon catalyst · +2 · Beast component'],
  ['frosthorn-antler', 'Frosthorn Antler', 'Uncommon catalyst · +2 · Beast component'],
  ['eagle-feather', 'Eagle Feather', 'Uncommon catalyst · +2 · Beast component'],
  ['mystic-serpent-venom', 'Mystic Serpent Venom', 'Uncommon catalyst · +2 · Monster component'],
  ['bogbeast-slime', 'Bogbeast Slime', 'Uncommon catalyst · +2 · Monster component'],
  ['crystaline-fragments', 'Crystaline Fragments', 'Rare catalyst · +3 · Monster component'],
  ['golem-core', 'Golem Core', 'Rare catalyst · +3 · Monster component'],
  ['dragon-scale-catalyst', 'Dragon Scale', 'Extremely rare catalyst · +4 · Dragon component'],
  ['dragon-gland', 'Dragon Gland', 'Extremely rare catalyst · +4 · Dragon component'],
  ['void-avatar-residue', 'Void Avatar Residue', 'Extremely rare catalyst · +4 · Voidspawn component']
] as const;

const catalystProducts: SeedProduct[] = catalysts.map(([key, name, description]) =>
  p(`catalyst-${key}`, name, 0, ['pantry'], {
    item_type: 'ore',
    description,
    stock_quantity: 0,
    is_available: false
  })
);

export const CALOSTRYNN_PRODUCTS: SeedProduct[] = [
  ...marketProducts,
  ...smithProducts,
  ...armoryProducts,
  ...libraryProducts,
  ...spellProducts,
  ...potionProducts,
  ...plantProducts,
  ...catalystProducts
];
