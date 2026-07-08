import type { EnemyAsset } from '@/lib/types';

const categoryColors: Record<string, string> = {
  'Common Wildlife': '#6f8554',
  'Magical Wildlife': '#647bc4',
  Monsters: '#9a5b45',
  'High Elves': '#c09a52',
  'Dark Elves': '#67528f',
  Giants: '#8b684d',
  Dwarfs: '#a06f42',
  Voidspawn: '#59447c',
  Dragons: '#a5483d',
  'Expedition Threats': '#7b4f45'
};

type EnemyRow = [string, number, number, number?, string?];

const groups: Record<string, EnemyRow[]> = {
  'Common Wildlife': [
    ['Rat', 4, 1], ['Rabbit', 5, 0], ['Fox', 18, 4], ['Wolf', 40, 8],
    ['Mountain Wolf', 85, 16], ['Deer', 55, 14], ['Elk', 65, 18], ['Brown Bear', 120, 32],
    ['Mountain Bear', 200, 58], ['Mountain Lion', 100, 28], ['Giant Bat', 35, 7], ['Hawk', 20, 5],
    ['Eagle', 50, 15], ['Raven', 15, 1], ['Badger', 28, 7], ['Wolverine', 55, 16],
    ['Boar', 65, 18], ['Razor Boar', 100, 28], ['Mountain Boar', 145, 38], ['Ram', 55, 14],
    ['Mountain Ram', 95, 26], ['Lynx', 45, 12], ['Panther', 85, 24], ['Snow Leopard', 90, 26],
    ['Hyena', 50, 13], ['Krug', 250, 10], ['Golem', 420, 34], ['Griffin', 200, 40]
  ],
  'Magical Wildlife': [
    ['Luminous Moth', 5, 0], ['Mana Tick', 20, 2, 0, 'On hit, target loses 5 Mana.'],
    ['Mana Leech', 40, 6, 0, 'On hit, target loses 10 Mana.'], ['Crystaline Tortoise', 220, 5],
    ['Embertoothed Wolf', 75, 20], ['Frosthorn Elk', 110, 18], ['Charged Eagle', 70, 22],
    ['Blistering Hare', 30, 4], ['Mystic Serpent', 140, 26, 0, 'On hit, target takes 5 poison damage for 2 turns.'],
    ['Bogbeast', 160, 24], ['The Great Frozen Bear', 200, 35],
    ['Crystaline Krug', 400, 12, 0, 'Takes 8 less damage from non-heavy physical weapons.'],
    ['Crystaline Golem', 700, 55, 0, 'Takes 10 less damage from non-heavy physical weapons.'],
    ['Magma Krug', 200, 15], ['Magma Golem', 400, 65, 0, 'Melee attackers take 6 fire damage when they hit it.']
  ],
  Monsters: [
    ['Goblin', 35, 7], ['Goblin Bully', 50, 10], ['Hobgoblin', 70, 15],
    ['Hobgoblin Captain', 100, 20], ['Orc', 120, 28], ['Orc Mage', 170, 35, 85, 'Battle caster and support bruiser.'],
    ['Orc Brute', 200, 40], ['Troll', 300, 45, 0, 'Heals 15 HP at start of turn; fire disables this.'],
    ['Cave Troll', 450, 50, 0, 'Heals 20 HP at start of turn; fire disables this.'], ['Ogre', 260, 60]
  ],
  'High Elves': [
    ['High Elf Scholar', 60, 12, 35], ['High Elf Support Mage', 70, 18, 60, 'Once per combat, heals an ally for 25 HP.'],
    ['High Elf Adept', 75, 24, 50], ['High Elf Mage', 85, 30, 75], ['High Elf Spellblade', 115, 34, 70],
    ['High Elf Arcane Guard', 125, 28, 50], ['High Elf High Sorcerer', 160, 45, 120, 'Once per combat, deals +15 damage with a spell.'],
    ['High Elf High Magister', 190, 50, 140], ['High Elf Archsage', 220, 55, 160, 'Once per combat, heals all allies in range for 40 HP.']
  ],
  'Dark Elves': [
    ['Dark Elf Scout', 65, 16], ['Dark Elf Rogue', 75, 26, 0, 'Backstab gains +3 attack and +1d6 damage.'],
    ['Dark Elf Longbowman', 80, 24], ['Dark Elf Spellbow', 90, 28, 60, 'Once per combat, may target Magic Defense.'],
    ['Dark Elf Blade Dancer', 95, 30], ['Dark Elf Shadeblade', 110, 35], ['Dark Elf Night Captain', 120, 36],
    ['Dark Elf Shadowmancer', 125, 38, 100], ['Dark Elf Deadeye', 130, 40, 0, 'On an 18–20 attack roll, deals +10 damage.'],
    ['Dark Elf Umbral Lord', 150, 42, 130], ['Dark Elf Eclipse Lord', 220, 60, 170]
  ],
  Giants: [
    ['Giant Laborer', 130, 16], ['Giant Brawler', 160, 20], ['Giant Mason', 190, 24, 0, 'Boulder Throw deals 24 ranged damage.'],
    ['Giant Warden', 230, 28], ['Giant Stoneguard', 270, 30], ['Giant Ironkeeper', 320, 34],
    ['Giant Rune-Seer', 300, 32, 120], ['Giant Elder', 390, 38, 0, 'Cannot be pushed or knocked prone by normal-sized creatures.'],
    ['Giant High Chieftain', 460, 44], ['Giant King', 575, 52, 75, 'Once per combat, allies gain +2 Strength until their next turn.']
  ],
  Dwarfs: [
    ['Dwarf Miner', 75, 18], ['Dwarf Crossbowman', 85, 24], ['Dwarf Axeman', 100, 26],
    ['Dwarf Blacksmith', 120, 20, 40, 'Once per combat, an ally gains +1 Armor until combat ends.'],
    ['Dwarf Shieldbearer', 130, 22, 0, 'Adjacent ally gains +1 Armor.'], ['Dwarf Veteran', 140, 30],
    ['Dwarf Rune-Axeman', 150, 35, 60, 'Once per combat, adds +10 magic damage to a melee hit.'],
    ['Dwarf Ironshield', 180, 32], ['Dwarf Rune-Smith', 190, 38, 100], ['Dwarf Forgeguard', 220, 45, 75],
    ['Dwarf Stone Lord', 300, 58, 120], ['Dwarf Deep King', 400, 70, 150, 'Once per combat, one dwarf ally immediately attacks.']
  ],
  Voidspawn: [
    ['Void Wisp', 30, 8, 0, 'On hit, target loses 5 Mana.'], ['Voidling', 60, 14],
    ['Hollow Stalker', 100, 26, 0, 'Gains +2 attack against targets above 50 current Mana.'],
    ['Null Hound', 140, 30, 0, 'On hit, target loses 10 Mana.'],
    ['Voidbound Brute', 220, 45, 0, 'Once per combat, reduce incoming spell damage by 20 and heal 20 HP.'],
    ['Null Priest', 160, 35, 0, 'Once per combat, target has -2 Intelligence until next turn.'],
    ['Void Devourer', 450, 70, 0, 'When hit by a spell, reduce damage by 15 and regain 15 HP.'],
    ['Abyssal Nullborn', 800, 100, 0, 'Nearby enemies have -2 Intelligence.'],
    ['Void Avatar', 1600, 150, 0, 'All spell damage against it is reduced by 25.']
  ],
  Dragons: [
    ['Young Dragon', 600, 65, 0, 'Every 3 turns, breath deals 45 elemental damage in a cone.'],
    ['Ember Dragon', 900, 90, 0, 'Every 3 turns, fire breath deals 70 damage in a cone.'],
    ['Frost Dragon', 1000, 85, 0, 'Every 3 turns, frost breath deals 60 damage and -1 Speed for 1 turn.'],
    ['Storm Dragon', 850, 100, 0, 'Every 3 turns, lightning breath deals 75 damage to up to 3 close targets.'],
    ['Mountain Dragon', 2000, 120, 0, 'Takes 15 less damage from non-magical physical attacks.'],
    ['Elder Dragon', 2250, 140, 0, 'Once per combat, reroll a failed attack or defense roll.'],
    ['Void Dragon', 2500, 180, 0, 'Nearby enemies have -3 Intelligence and lose 10 Mana at start of turn.']
  ],
  'Expedition Threats': [
    ['Ruin Stalker', 130, 28, 0, 'First attack from hiding gains +2 attack and +8 damage.'],
    ['Ironhide Beast', 350, 42], ['Dread Spider', 180, 38, 0, 'On hit, target takes 6 poison damage for 2 turns.'],
    ['Grave Howler', 240, 35, 0, 'Once per combat, enemies may suffer -2 Strength for 1 turn.'],
    ['Stone Maw', 500, 55, 0, 'Can burrow for 1 turn and avoid normal melee attacks.'],
    ['Titan Strider', 1200, 100, 0, 'Adjacent enemies take 20 damage when it moves through their space.'],
    ['Realm-Torn Beast', 800, 95, 0, 'Once per combat, force an attack or spell targeting it to reroll.']
  ]
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export const DEFAULT_ENEMY_ASSETS: EnemyAsset[] = Object.entries(groups).flatMap(([category, rows]) =>
  rows.map(([name, health, damage, mana = 0, notes = '']) => ({
    enemy_key: slug(`${category}-${name}`),
    category,
    name,
    health,
    mana,
    damage,
    notes,
    token_color: categoryColors[category],
    is_discovered: false
  }))
);

export const ENEMY_CATEGORIES = Object.keys(groups);
