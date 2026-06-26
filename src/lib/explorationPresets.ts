export type EncounterRow = {
  difficulty: number;
  name: string;
  waves: string;
  boss: string;
};

export type CavePlan = {
  id: number;
  tunnels: number;
  enemies: string;
  secrets: number;
  layout: 'Multi Cave' | 'Forking Cave' | 'Snaking Cave';
  terrain?: string;
  difficulties: Array<number | null>;
};

export type GuideTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export const GOBLIN_CAVE_ENCOUNTERS: EncounterRow[] = [
  { difficulty: 1, name: 'Goblin Hideout', waves: 'Wave 1: 2–3 Goblins. Wave 2: 3–4 Goblins.', boss: 'Goblin Bully with 2 Goblins.' },
  { difficulty: 2, name: 'Organized Hideout', waves: 'Wave 1: 3–5 Goblins, or 2 Goblins with 1 Hobgoblin. Wave 2: 3–4 Goblins with 1 Hobgoblin, or 2 Hobgoblins.', boss: 'Hobgoblin Captain with 2 Hobgoblins.' },
  { difficulty: 3, name: 'Goblin Warband', waves: 'Wave 1: 4–5 Goblins with 2 Hobgoblins, or 3 Goblins with 1 Orc. Wave 2: 2 Hobgoblins with 1 Orc, or 4 Goblins with 1 Orc.', boss: 'Orc Brute with 2 Hobgoblins, or Orc Mage with 2 Hobgoblins.' },
  { difficulty: 4, name: 'Tribal Stronghold', waves: 'Wave 1: 4–6 Goblins, 2 Hobgoblins and 1 Orc; or 2 Orcs with 2 Goblins. Wave 2: 2 Orcs with 1 Hobgoblin, or 1 Orc Brute with 2 Goblins.', boss: 'Orc Brute with 1 Orc Mage, or an Ogre.' },
  { difficulty: 5, name: 'Warlord’s Cavern', waves: 'Wave 1: 2 Hobgoblins with 2 Orcs, or 1 Orc Brute with 2 Goblins. Wave 2: 1 Orc Brute with 2 Orcs, or 2 Orcs with 1 Orc Mage.', boss: 'Cave Troll, or Ogre with 1 Orc Mage.' }
];

export const BEAST_CAVE_ENCOUNTERS: EncounterRow[] = [
  { difficulty: 1, name: 'Small Animal Den', waves: 'Wave 1: 2–4 Giant Bats, 1–2 Foxes, or 1 Badger. Wave 2: 1 Wolf, 1 Lynx, 2 Foxes, or 2–3 Giant Bats.', boss: 'Alpha Wolf.' },
  { difficulty: 2, name: 'Predator Cave', waves: 'Wave 1: 2–3 Wolves, 2–3 Hyenas, or 1 Wolverine. Wave 2: 2 Wolves, 1 Panther, 1 Boar, or 1 Wolverine.', boss: 'Mountain Lion or Wolverine.' },
  { difficulty: 3, name: 'Large Beast Lair', waves: 'Wave 1: 2–3 Wolves, 1 Panther, 1 Boar, or 1–2 Rams. Wave 2: 1 Brown Bear, 1 Razor Boar, 2 Elk, or 1 Panther with 1 Wolf.', boss: 'Brown Bear or Razor Boar with up to 1 Wolf or Hyena.' },
  { difficulty: 4, name: 'Dangerous Monster Cave', waves: 'Wave 1: 1 Brown Bear, 1 Razor Boar, 1 Krug, or 1 Panther with 1–2 Wolves. Wave 2: 1 Krug, 1 Mystic Serpent, 1 Brown Bear with 1 Wolf, or 1 Razor Boar with 1 Hyena.', boss: 'Mountain Bear, Mountain Boar, or Mystic Serpent with up to 1–2 Wolves, Hyenas, or Panthers.' },
  { difficulty: 5, name: 'Apex Beast Lair', waves: 'Wave 1: 1 Krug with 1–2 Wolves, 1 Brown Bear with 1 Panther, or 1 Mystic Serpent. Wave 2: 1 Golem, 1 Krug with 1 Razor Boar, or 1 Mystic Serpent with 1 Panther.', boss: 'Griffin, Great Frozen Bear, or Golem with up to 1–2 Wolves, Panthers, or Razor Boars.' }
];

type CaveTuple = [number, number, string, number, CavePlan['layout'], Array<number | null>, string?];

const caveRows: CaveTuple[] = [
  [1,5,'Beast',2,'Multi Cave',[4,5,4,2,4]],[2,3,'Beast',1,'Forking Cave',[2,3,4]],[3,4,'Beast',1,'Snaking Cave',[4,3,4,2]],[4,5,'Beast',1,'Multi Cave',[1,5,3,3,4]],
  [5,3,'Beast',3,'Forking Cave',[4,1,3]],[6,5,'Beast',1,'Snaking Cave',[1,5,4,3,2]],[7,3,'Beast',1,'Forking Cave',[4,2,1]],[8,2,'Goblin',2,'Snaking Cave',[2,3]],
  [9,4,'Goblin',2,'Multi Cave',[3,5,3,5]],[10,3,'Beast',2,'Forking Cave',[2,4,1]],[11,5,'Goblin',3,'Multi Cave',[1,4,1,1,5]],[12,4,'Goblin',3,'Forking Cave',[2,4,4,2]],
  [13,4,'Goblin',2,'Snaking Cave',[1,5,4,5]],[14,2,'Beast',1,'Snaking Cave',[2,4]],[15,3,'Goblin',1,'Forking Cave',[1,2,3]],[16,5,'Beast',2,'Multi Cave',[3,3,null,null,null],'Mountain'],
  [17,4,'Mixed',2,'Multi Cave',[2,3,5,4]],[18,3,'Beast',0,'Snaking Cave',[1,2,2]],[19,5,'Goblin',1,'Forking Cave',[2,5,3,1,4]],[20,4,'Beast',2,'Snaking Cave',[4,4,3,2]],
  [21,2,'Mixed',1,'Forking Cave',[3,5]],[22,5,'Beast',3,'Multi Cave',[5,2,4,3,5]],[23,3,'Goblin',2,'Forking Cave',[2,1,4]],[24,4,'Beast',1,'Multi Cave',[3,4,1,3]],
  [25,5,'Mixed',2,'Snaking Cave',[2,4,5,3,1]],[26,2,'Goblin',0,'Snaking Cave',[1,2]],[27,3,'Beast',1,'Forking Cave',[5,3,2]],[28,4,'Mixed',3,'Multi Cave',[4,2,5,3]],
  [29,5,'Goblin',2,'Multi Cave',[1,3,3,4,2]],[30,3,'Beast',2,'Snaking Cave',[4,5,3]],[31,4,'Goblin',1,'Forking Cave',[2,2,1,4]],[32,5,'Beast',1,'Multi Cave',[3,5,4,4,2]],
  [33,2,'Mixed',2,'Forking Cave',[4,1]],[34,3,'Goblin',0,'Snaking Cave',[2,3,1]],[35,4,'Beast',2,'Multi Cave',[5,4,2,3]],[36,5,'Mixed',3,'Multi Cave',[3,1,5,4,5]],
  [37,3,'Beast',1,'Forking Cave',[1,4,2]],[38,4,'Goblin',2,'Snaking Cave',[3,2,5,4]],[39,5,'Beast',0,'Snaking Cave',[2,2,3,4,1]],[40,2,'Goblin',1,'Forking Cave',[5,3]],
  [41,4,'Mixed',1,'Multi Cave',[1,4,2,5]],[42,3,'Beast',3,'Forking Cave',[3,5,4]],[43,5,'Goblin',2,'Multi Cave',[2,1,4,3,5]],[44,4,'Beast',1,'Snaking Cave',[4,3,3,2]],
  [45,3,'Mixed',2,'Forking Cave',[5,2,4]],[46,5,'Beast',3,'Multi Cave',[1,5,5,3,4]],[47,2,'Beast',0,'Snaking Cave',[3,1]],[48,4,'Goblin',3,'Forking Cave',[2,4,5,1]],
  [49,5,'Mixed',1,'Multi Cave',[4,2,3,5,3]],[50,3,'Goblin',1,'Snaking Cave',[1,3,2]],[51,4,'Beast',2,'Multi Cave',[5,5,4,2]],[52,5,'Goblin',0,'Forking Cave',[3,1,2,4,4]],
  [53,3,'Mixed',3,'Multi Cave',[2,5,3]],[54,4,'Beast',1,'Snaking Cave',[1,4,4,5]],[55,2,'Goblin',2,'Forking Cave',[2,5]],[56,5,'Beast',2,'Multi Cave',[3,4,2,1,5]],
  [57,4,'Mixed',2,'Forking Cave',[5,3,1,4]],[58,3,'Beast',0,'Snaking Cave',[2,2,4]],[59,5,'Goblin',3,'Multi Cave',[1,5,2,3,4]],[60,4,'Beast',2,'Snaking Cave',[4,1,5,3]],
  [61,3,'Mixed',1,'Forking Cave',[3,4,5]],[62,5,'Beast',1,'Multi Cave',[2,3,5,4,1]],[63,2,'Goblin',0,'Snaking Cave',[1,4]],[64,4,'Mixed',3,'Multi Cave',[5,2,3,5]],
  [65,3,'Beast',2,'Forking Cave',[4,1,2]],[66,5,'Goblin',1,'Snaking Cave',[3,3,2,5,4]],[67,4,'Beast',2,'Multi Cave',[1,5,4,3]],[68,3,'Mixed',0,'Snaking Cave',[2,5,1]],
  [69,5,'Beast',3,'Multi Cave',[4,2,5,5,3]],[70,2,'Goblin',1,'Forking Cave',[3,2]],[71,4,'Goblin',2,'Snaking Cave',[1,4,3,5]],[72,5,'Mixed',2,'Multi Cave',[2,5,1,4,3]],
  [73,3,'Beast',1,'Forking Cave',[5,3,4]],[74,4,'Mixed',1,'Snaking Cave',[3,2,4,1]],[75,5,'Goblin',3,'Multi Cave',[4,1,5,2,3]],[76,2,'Beast',2,'Forking Cave',[5,4]],
  [77,3,'Goblin',1,'Snaking Cave',[2,1,3]],[78,4,'Beast',3,'Multi Cave',[4,5,2,5]],[79,5,'Mixed',0,'Snaking Cave',[1,3,2,4,5]],[80,4,'Goblin',2,'Forking Cave',[3,5,4,2]]
];

export const CAVE_PLANS: CavePlan[] = caveRows.map(([id, tunnels, enemies, secrets, layout, difficulties, terrain]) => ({
  id, tunnels, enemies, secrets, layout, difficulties, terrain
}));

export const BASE_GUIDES: GuideTable[] = [
  {
    title: 'Alarm Timer',
    columns: ['Situation', 'Alarm Reaction'],
    rows: [
      ['Party enters loudly or is spotted', 'Alarm starts immediately'],
      ['Party kills sentry before alarm', 'Delay reaction wave by 2 rounds'],
      ['Party uses stealth well', 'No reaction wave until discovered'],
      ['Party starts open combat', 'Reaction wave arrives after listed rounds'],
      ['Party reaches center before alarm', 'Center guards are surprised for 1 round']
    ]
  },
  {
    title: 'Reaction Timing',
    columns: ['Base Level', 'First Reaction', 'Second Reaction', 'Center Guards'],
    rows: [
      ['Level 4 Base', 'Round 3', 'Optional Round 6', 'When party enters center'],
      ['Low Level 5 Base', 'Round 3', 'Round 6', 'Round 7 or center breach'],
      ['High Level 5 Base', 'Round 2', 'Round 5', 'Round 6 or center breach']
    ]
  },
  {
    title: 'Goblin Base — Level 4',
    columns: ['Area', 'Enemies Present'],
    rows: [
      ['Outside Camp', '6–8 Goblins, 1 Hobgoblin'], ['Sentry Posts', '2 Goblins, 1 Hobgoblin'],
      ['Armed Reaction', '4 Goblins, 1 Hobgoblin, 1 Orc'], ['Main Yard', '4–6 Goblins, 1 Hobgoblin, 1 Orc'],
      ['Inner Loot Guard', '2 Hobgoblins, 1 Orc, 1 Orc Brute'], ['Boss Position', '1 Orc Brute']
    ]
  },
  {
    title: 'Goblin Base — Low Level 5',
    columns: ['Area', 'Enemies Present'],
    rows: [
      ['Outside Camp', '8–10 Goblins, 2 Hobgoblins'], ['Watch Posts', '3 Goblins, 1 Hobgoblin'],
      ['First Armed Reaction', '5 Goblins, 1 Hobgoblin, 1 Orc'], ['Second Armed Reaction', '2 Hobgoblins, 1 Orc Brute'],
      ['Main Barracks', '4 Goblins, 1 Hobgoblin, 1 Orc'], ['Inner Loot Guard', '2 Orcs, 1 Orc Brute'],
      ['Boss Position', '1 Ogre, or 1 Orc Brute with 1 Orc Mage']
    ]
  },
  {
    title: 'Goblin Base — High Level 5',
    columns: ['Area', 'Enemies Present'],
    rows: [
      ['Outer War Camp', '10–14 Goblins, 2 Hobgoblins, 1 Orc'], ['Watchtowers / Sentries', '4 Goblins, 2 Hobgoblins'],
      ['Beast Pens or Prison Cages', '3 Goblins, 1 Orc, optional 1 Wolf, Hyena, or Razor Boar'],
      ['First Armed Reaction', '6 Goblins, 2 Hobgoblins, 1 Orc'], ['Second Armed Reaction', '2 Orcs, 1 Orc Brute'],
      ['Main Barracks', '4 Hobgoblins, 2 Orcs'], ['Inner Loot Ring', '2 Hobgoblins, 2 Orcs, 1 Orc Brute, 1 Orc Mage'],
      ['Boss Position', '1 Cave Troll, or 1 Ogre with 1 Orc Mage']
    ]
  }
];

export const RUIN_GUIDES: GuideTable[] = [
  { title: 'Beast-Inhabited Ruined City 2A', columns: ['Difficulty', 'Ruin Resistance', 'Enemies', 'Boss'], rows: [['2', 'Light beast occupation', 'Giant Bats, Wolves, Foxes, maybe a Mountain Lion', 'Mountain Lion']] },
  { title: 'Magical Beast-Inhabited Ruined City 2B', columns: ['Difficulty', 'Ruin Resistance', 'Enemies', 'Boss'], rows: [['2', 'Low magical infestation', 'Mana Ticks, Mana Leeches, Blistering Hare, Charged Eagle', 'Mana Leech Cluster or Charged Eagle']] },
  { title: 'Human Outlaw Ruined City', columns: ['Difficulty', 'Ruin Resistance', 'Enemies', 'Boss'], rows: [['3', 'Outlaw hideout', 'Bandits, Mercenaries, Assassin, Enemy Ranger', 'Mercenary Captain']] },
  { title: 'Mercenary Captain', columns: ['Stat', 'Suggested Value'], rows: [['HP', '140'], ['Damage', '28'], ['Strength', '+3'], ['Vitality', '+2'], ['Accuracy', '+2'], ['Magic Resistance', '+1'], ['Armor', '10'], ['Special', 'Command Order: Once per combat, one allied Bandit or Mercenary immediately attacks.']] },
  { title: 'Fortified Outlaw Ruined City', columns: ['Difficulty', 'Ruin Resistance', 'Enemies', 'Boss'], rows: [['4', 'Organized mercenary occupation', 'Mercenaries, Enemy Rangers, Assassins, Enemy Mage', 'Exiled Knight']] },
  { title: 'Exiled Knight', columns: ['Stat', 'Suggested Value'], rows: [['HP', '250'], ['Damage', '45'], ['Strength', '+4'], ['Vitality', '+4'], ['Accuracy', '+1'], ['Magic Resistance', '+2'], ['Armor', '12'], ['Special', 'Guarded Stance: Once per combat, gains +2 Armor until next turn.']] }
];
