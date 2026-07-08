import { DEFAULT_ATTRIBUTES, type CharacterAttributes, type ClassAsset } from '@/lib/types';

export type ClassPreset = {
  key: string;
  name: string;
  type: string;
  armor: 'Light armor' | 'Medium armor' | 'Heavy armor';
  identity: string;
  inventorySlots: number;
  spellSlots: number;
  health: number;
  mana: number;
  attributes: CharacterAttributes;
  passives: string[];
};

function stats(values: Partial<CharacterAttributes>): CharacterAttributes {
  return { ...DEFAULT_ATTRIBUTES, ...values };
}

export const CLASS_PRESETS: ClassPreset[] = [
  {
    key: 'alchemist',
    name: 'Alchemist',
    type: 'Support · Decent sustain',
    armor: 'Light armor',
    identity: 'Intelligent and resourceful seekers of knowledge, renowned for their command of potions and alchemical craft.',
    inventorySlots: 16,
    spellSlots: 2,
    health: 110,
    mana: 50,
    attributes: stats({ strength: -1, vitality: -1, intelligence: 1, recovery: 1, alchemy: 5 }),
    passives: [
      'Once per combat, use or make a potion or alchemical item without spending the main action or movement.',
      'Has unlimited flasks and Arcane Nectar while maintaining a house or residence.'
    ]
  },
  {
    key: 'apothecary',
    name: 'Apothecary',
    type: 'Support · Great sustain',
    armor: 'Medium armor',
    identity: 'Durable battlefield mages whose restorative support can hold a party together even on the front line.',
    inventorySlots: 15,
    spellSlots: 5,
    health: 130,
    mana: 90,
    attributes: stats({ strength: -3, agility: -1, vitality: 1, recovery: 2, accuracy: -1, mana_regen: 2, alchemy: 2, stealth: -2 }),
    passives: ['Can heal an ally for 5 HP in place of movement.']
  },
  {
    key: 'apprentice',
    name: 'Apprentice',
    type: 'Hybrid · Decent sustain',
    armor: 'Medium armor',
    identity: 'Naturally talented learners who trade some magical utility for freedom, adaptability, and staying power.',
    inventorySlots: 16,
    spellSlots: 5,
    health: 100,
    mana: 75,
    attributes: stats({ agility: 1, vitality: -1, intelligence: 1, mana_regen: 1, alchemy: 1 }),
    passives: [
      'While paired with a Mage: +1 Intelligence.',
      'While paired with a Knight: +1 Strength.',
      'While paired with a Ranger: +1 Accuracy. These bonuses can stack.'
    ]
  },
  {
    key: 'armor-clad',
    name: 'Armor-clad',
    type: 'Defense · Great sustain',
    armor: 'Heavy armor',
    identity: 'Relentless front-line warriors who sacrifice speed and subtlety for overwhelming defensive presence.',
    inventorySlots: 10,
    spellSlots: 1,
    health: 165,
    mana: 50,
    attributes: stats({ strength: 2, agility: -3, vitality: 3, intelligence: -3, charisma: -1, range: -2, perception: -1, alchemy: 1, stealth: -2 }),
    passives: [
      'Distribution redirects 50% of a target’s incoming damage to the Armor-clad.',
      'Pays only material costs for armor labor.',
      'Cannot receive additional defensive bonuses from shields.'
    ]
  },
  {
    key: 'beastmaster',
    name: 'Beastmaster',
    type: 'Hybrid · Poor sustain',
    armor: 'Light armor',
    identity: 'Rare animal handlers whose companions become a force of their own across the battlefield.',
    inventorySlots: 20,
    spellSlots: 1,
    health: 90,
    mana: 50,
    attributes: stats({ strength: -3, agility: 1, recovery: 1, charisma: 3, accuracy: 1, perception: 2 }),
    passives: [
      'Tame is a free spell and uses d6 + Charisma + buffs against a creature’s Wild score; wounded creatures are easier to tame.',
      'Attacks against animals and beasts cannot reduce them below 1 HP and always critically hit.',
      'May bring up to 20 Wild score worth of beasts per mission; each receives its own initiative and turn.'
    ]
  },
  {
    key: 'blacksmith',
    name: 'Blacksmith',
    type: 'Support · Decent sustain',
    armor: 'Medium armor',
    identity: 'Practical craftspeople whose command of tools, weapons, armor, and runes makes them invaluable anywhere.',
    inventorySlots: 18,
    spellSlots: 3,
    health: 125,
    mana: 50,
    attributes: stats({ strength: 2, agility: -1, vitality: 1, charisma: 2, range: -2, alchemy: 1, stealth: -1 }),
    passives: [
      'Pays only material costs for smithing labor.',
      'Can create weapons away from a forge with a properly made fire.',
      'Once per combat, grant a chosen melee weapon +1 Strength until combat or the scene ends.'
    ]
  },
  {
    key: 'knight',
    name: 'Knight',
    type: 'Attack · Decent sustain',
    armor: 'Medium armor',
    identity: 'Well-rounded combat experts with political presence, battlefield leadership, and a talent for mounted fighting.',
    inventorySlots: 14,
    spellSlots: 2,
    health: 125,
    mana: 25,
    attributes: stats({ strength: 1, vitality: 1, intelligence: -1, charisma: 2, accuracy: 1, range: -1, mana_regen: -2, alchemy: -1 }),
    passives: [
      '+1 Strength while mounted on a horse.',
      'When hit, a parry roll of 18–20 prevents all damage; 15–17 prevents half, rounded up.',
      'Once per combat, Rally the Troops lets the party attack one target together; if the Knight hits, the others do as well.'
    ]
  },
  {
    key: 'mage',
    name: 'Mage',
    type: 'Attack · Poor sustain',
    armor: 'Light armor',
    identity: 'Versatile magical heavy-hitters with an answer for nearly every problem—provided they survive long enough to cast it.',
    inventorySlots: 10,
    spellSlots: 10,
    health: 70,
    mana: 100,
    attributes: stats({ strength: -3, vitality: -3, intelligence: 3, charisma: 1, range: 1, mana_regen: 1 }),
    passives: ['Regain 10 Mana whenever an enemy is killed with a spell.']
  },
  {
    key: 'mendrunner',
    name: 'Mendrunner',
    type: 'Hybrid · Poor sustain',
    armor: 'Medium armor',
    identity: 'Nimble practitioners of botany and natural medicine who reject magic in favor of hard-won remedies.',
    inventorySlots: 20,
    spellSlots: 0,
    health: 85,
    mana: 0,
    attributes: stats({ strength: -1, agility: 3, intelligence: -5, recovery: 3, charisma: -3, accuracy: 1, perception: 3, alchemy: 4, stealth: 1 }),
    passives: [
      'Heal an ally for 2d6 + Recovery + Alchemy and remove one debuff or negative effect; 1-turn cooldown.',
      'Immune to poison and illness.'
    ]
  },
  {
    key: 'the-muscle',
    name: 'The Muscle',
    type: 'Defense · Great sustain',
    armor: 'Medium armor',
    identity: 'Notorious for a large frame and small brains, built to soak punishment and become the group’s blunt-force answer.',
    inventorySlots: 10,
    spellSlots: 1,
    health: 150,
    mana: 40,
    attributes: stats({ strength: 3, agility: -1, vitality: 1, intelligence: -3, recovery: 2, charisma: -2, accuracy: -2, range: -2, perception: -1, alchemy: -2, stealth: -2 }),
    passives: [
      'When The Muscle kills an enemy, gain 1d6 for ensuing damage rolls. Resets after each combat or scene ends. Max of 5d6.'
    ]
  },
  {
    key: 'ranger',
    name: 'Ranger',
    type: 'Attack · Poor sustain',
    armor: 'Light armor',
    identity: 'Back-line attackers and scouts who combine punishing range with reconnaissance and specialized ammunition.',
    inventorySlots: 15,
    spellSlots: 1,
    health: 90,
    mana: 50,
    attributes: stats({ strength: -2, agility: 1, vitality: -2, intelligence: 1, accuracy: 2, range: 3, perception: 2, stealth: 1 }),
    passives: [
      'Can tame birds.',
      'Three times per combat, fire three arrows in one draw; roll accuracy for each arrow.',
      'May buy and craft elemental or effect-tipped arrows.'
    ]
  },
  {
    key: 'rogue',
    name: 'Rogue',
    type: 'Attack · Poor sustain',
    armor: 'Light armor',
    identity: 'Cunning duelists who thrive on surprise, isolation, and catching enemies at their most vulnerable.',
    inventorySlots: 16,
    spellSlots: 3,
    health: 90,
    mana: 50,
    attributes: stats({ strength: -1, agility: 2, vitality: -1, charisma: -3, perception: 3, alchemy: 1, stealth: 3 }),
    passives: [
      'Backstab deals double damage from behind, from stealth, or against a pinned or defenseless target.',
      'May use Agility instead of Strength for attacks that trigger Backstab.'
    ]
  },
  {
    key: 'sage',
    name: 'Sage',
    type: 'Support · Poor sustain',
    armor: 'Medium armor',
    identity: 'Selfless support casters whose mastery of recovery turns a single act of healing into aid for the whole party.',
    inventorySlots: 12,
    spellSlots: 5,
    health: 70,
    mana: 100,
    attributes: stats({ strength: -2, agility: 2, vitality: -2, intelligence: -5, recovery: 3, charisma: 2, accuracy: -2, mana_regen: 2 }),
    passives: [
      'Healing and enhancement spells use Recovery instead of Intelligence for magic rolls.',
      'Heals also restore half the amount, rounded up, to another ally or the original target.'
    ]
  },
  {
    key: 'talismanist',
    name: 'Talismanist',
    type: 'Attack · Decent sustain',
    armor: 'Medium armor',
    identity: 'Rune-armed warriors who bind magic into weapons and armor, turning every piece of gear into a spell vessel.',
    inventorySlots: 10,
    spellSlots: 0,
    health: 125,
    mana: 100,
    attributes: stats({ strength: 1, vitality: 1, intelligence: 1, accuracy: 1, alchemy: -1, stealth: -2 }),
    passives: [
      'Begins with three random low-level runes.',
      'Requires only three runes to force a spell into a weapon instead of five; additional runes improve the result.',
      'Each spell-infused weapon on hand can cast its spell twice per combat.'
    ]
  },
  {
    key: 'warden',
    name: 'Warden',
    type: 'Hybrid · Decent sustain',
    armor: 'Medium armor',
    identity: 'Jack-of-all-trades survivalists with broad usefulness, cunning instincts, and flexible party support.',
    inventorySlots: 20,
    spellSlots: 3,
    health: 110,
    mana: 75,
    attributes: stats({ charisma: -2, perception: 2, alchemy: 1 }),
    passives: [
      'Once per combat or exploration scene, reroll a failed Perception, Alchemy, Survival, or Utility check.',
      'Gains a +2 modifier of choice in a single category where the party has no bonuses.'
    ]
  }
];

export const DEFAULT_CLASS = CLASS_PRESETS[0];

export function getClassPreset(key: string | null | undefined) {
  return CLASS_PRESETS.find((preset) => preset.key === key) ?? CLASS_PRESETS.find((preset) => preset.name.toLowerCase() === key?.toLowerCase()) ?? null;
}

export const DEFAULT_CLASS_ASSETS: ClassAsset[] = CLASS_PRESETS.map((preset, index) => ({
  class_key: preset.key,
  name: preset.name,
  type: preset.type,
  armor: preset.armor,
  identity: preset.identity,
  inventory_slots: preset.inventorySlots,
  spell_slots: preset.spellSlots,
  health: preset.health,
  mana: preset.mana,
  attributes: preset.attributes,
  passives: preset.passives,
  token_color: ['#4d8f83', '#5579a8', '#9a6e52', '#8a6da1', '#a05e5a', '#77875a', '#b28b45', '#567a7f'][index % 8]
}));

export function classAssetToPreset(asset: ClassAsset): ClassPreset {
  return {
    key: asset.class_key,
    name: asset.name,
    type: asset.type,
    armor: asset.armor as ClassPreset['armor'],
    identity: asset.identity,
    inventorySlots: asset.inventory_slots,
    spellSlots: asset.spell_slots,
    health: asset.health,
    mana: asset.mana,
    attributes: { ...DEFAULT_ATTRIBUTES, ...(asset.attributes ?? {}) },
    passives: asset.passives ?? []
  };
}
