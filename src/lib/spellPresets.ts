export type SpellPreset = {
  spell_key: string;
  name: string;
  category: string;
  mana_cost: number;
  mana_label: string;
  description: string;
  price_base: number;
  is_available: boolean;
};

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const s = (
  category: string,
  name: string,
  mana: number,
  description: string,
  price: number,
  options: { manaLabel?: string; available?: boolean } = {}
): SpellPreset => ({
  spell_key: slug(name),
  name,
  category,
  mana_cost: mana,
  mana_label: options.manaLabel ?? (mana === 0 ? 'Free' : `${mana} Mana`),
  description,
  price_base: price,
  is_available: options.available ?? price > 0
});

export const CALOSTRYNN_SPELLS: SpellPreset[] = [
  s('Fire', 'Emberbolt', 8, 'Deals 15 fire damage.', 600),
  s('Fire', 'Scorch', 8, 'Deals 7 fire damage for 3 turns.', 800),
  s('Fire', 'Flame Ring', 18, 'Deals 22 fire damage in a nearby radius.', 2500),
  s('Fire', 'Solar Flare', 18, 'Blinds an opponent for 1 turn.', 3000),
  s('Fire', 'Fireball', 30, 'Deals 45 fire damage in an area.', 6500),
  s('Fire', 'Sear', 35, 'Deals an area burn for 10 fire damage per turn for 5 turns.', 9000),
  s('Fire', 'Radiance', 45, 'Blinds the 3 closest opponents for 1 turn.', 10000),
  s('Frost', 'Frostbite', 10, 'Deals 12 ice damage and slows the target.', 1000),
  s('Frost', 'Ice Shard', 11, 'Deals 20 piercing ice damage.', 1100),
  s('Frost', 'Hypothermia', 18, 'Prevents movement and dashes for 1 turn.', 2400),
  s('Frost', 'Ice Wall', 28, 'Creates a defensive ice barrier with 60 HP.', 4500),
  s('Frost', 'Ice Cube', 22, 'Skips a chosen enemy’s turn.', 4800),
  s('Frost', 'Christmas Tree', 25, 'Places a ward that deals 15 ice damage per turn in its radius for 3 turns.', 7500),
  s('Frost', 'Absolute Zero', 45, 'Prevents movement and dashes for every ally and enemy within 2 movements.', 10000),
  s('Lightning', 'Sparkshot', 9, 'Deals 14 lightning damage.', 600),
  s('Lightning', 'Static Charge', 20, 'Deals 26 damage to one enemy, 13 each to two enemies, or 9 each to three enemies.', 2800),
  s('Lightning', 'Arc Shot', 32, 'Deals 35 lightning damage to 3 nearby enemies.', 6000),
  s('Lightning', 'Defibulate', 10, 'Returns an unconscious ally or enemy to 1 HP.', 5000),
  s('Lightning', 'Electric Explosion', 20, 'Deals 15 lightning damage to all allies and enemies within one movement.', 1800),
  s('Lightning', 'Thunder Crash', 38, 'Deals 50 lightning damage in a small radius.', 8500),
  s('Lightning', 'Lightning Chain', 38, 'Deals 10 lightning damage through a chain of up to 10 reachable enemies.', 10000),
  s('Earth', 'Stone Fist', 12, 'Deals 18 physical damage.', 900),
  s('Earth', 'Quicksand', 15, 'Turns natural earth around the player into quicksand, preventing movement for 2 turns.', 3000),
  s('Earth', 'Earthen Spikes', 26, 'Deals 40 physical damage.', 4000),
  s('Earth', 'Earthquake', 30, 'Everyone rerolls initiative.', 5000),
  s('Wind', 'Wind Cutter', 10, 'Deals 16 wind damage.', 800),
  s('Wind', 'Mighty Gust', 15, 'Pushes a person one movement.', 2000),
  s('Wind', 'Wind Be With Me', 0, 'Allows the caster to dash and attack in the same turn. Mana and price still need a DM ruling.', 0, { manaLabel: 'Unset', available: false }),
  s('Wind', 'Gale Burst', 24, 'Pushes enemies back one movement while dealing 28 damage.', 3500),
  s('Energy', 'Pulse', 15, 'Deals 18 damage around the caster.', 1600),
  s('Energy', 'Energy Shield', 15, 'Creates a shield that absorbs 25 damage.', 2400),
  s('Defensive Support', 'Mend Wounds', 12, 'Heals a single target for 25 HP.', 2000),
  s('Defensive Support', 'Greater Mend', 28, 'Heals a target for 75 HP.', 5500),
  s('Defensive Support', 'Antivenom', 10, 'Removes poison from a single target.', 1200),
  s('Defensive Support', 'Fortify', 16, 'Grants +2 Vitality for 4 turns.', 3000),
  s('Defensive Support', 'Iron Skin', 25, 'Grants +4 Vitality for 5 turns.', 6000),
  s('Defensive Support', 'Shield', 10, 'Grants +5 Vitality for the next three attacks against the target.', 8000),
  s('Defensive Support', 'Cleanse', 50, 'Removes all debuffs from all party members.', 12000),
  s('Defensive Support', 'Revitalize', 10, 'Removes all slows and binds from a single target.', 2500),
  s('Defensive Support', 'Golden Boy', 40, 'Everyone on the battlefield heals twice as much for 3 rounds.', 7500),
  s('Defensive Support', 'Insurance', 45, 'Buffs the party except the caster. Falling below half HP expends the buff to restore 25 HP; it can revive after damage. Targets already below half heal 10 HP.', 10000),
  s('Defensive Support', 'Counter Attack', 30, 'Grants counterattack for 2 turns. Basic attacks always hit and never crit.', 5000),
  s('Defensive Support', 'Retaliation', 45, 'Grants the party counterattack for 1 turn. Basic attacks always hit and never crit.', 7500),
  s('Offensive Support', 'Internal Bleeding', 25, 'Prevents a target from healing for 3 turns.', 4500),
  s('Offensive Support', 'Strip', 30, 'Removes all buffs and potion effects from a target.', 5500),
  s('Offensive Support', 'Demoralize', 55, 'Removes all buffs and potion effects from all enemies.', 10000),
  s('Offensive Support', 'Weaken', 28, 'Lowers a target’s Strength, Accuracy, and Intelligence by 3 for 2 turns.', 5000),
  s('Offensive Support', 'Cripple', 50, 'Lowers a target’s Strength, Accuracy, and Intelligence by 5 for 3 turns.', 9000),
  s('Offensive Support', 'Enfeeblement', 60, 'Lowers all targets’ Strength, Accuracy, and Intelligence by 3 for 2 turns.', 11000),
  s('Offensive Support', 'Dreadfall', 90, 'Lowers all targets’ Strength, Accuracy, and Intelligence by 5 for 3 turns.', 15000),
  s('Offensive Support', 'What’s Mine Is Yours', 30, 'Swaps any active effects with any target.', 10000),
  s('Offensive Support', 'Judas', 65, 'Choose an enemy to attack its ally. The attack always crits.', 11000),
  s('Offensive Support', 'Jump Him', 70, 'Everyone attacks a chosen target without changing turn order or spending their turn or movement.', 12500),
  s('Offensive Support', 'Follow the Leader', 45, 'For 2 rounds, the party rolls one extra die and the caster rolls one fewer.', 8000),
  s('Offensive Support', 'Bloodthirsty', 30, 'A chosen teammate follows a chosen enemy’s movements and dashes for 3 rounds at no movement cost.', 6000),
  s('Enhancement', 'Swiftness', 14, 'Grants +1 Speed for 5 turns.', 2200),
  s('Enhancement', 'Clarity', 10, 'Grants +1 Accuracy and Perception for 5 turns.', 1400),
  s('Enhancement', 'Mana Surge', 18, 'Restores 5 Mana at the beginning of each turn for 5 turns.', 4500),
  s('Enhancement', 'Guided Strike', 10, 'Grants +2 Accuracy for the next attack.', 1200),
  s('Enhancement', 'Stabilize', 10, 'Prevents a target from dying for 2 of its turns, once per target.', 9000),
  s('Utility', 'Light Orb', 3, 'Creates a floating light source.', 200),
  s('Utility', 'Warmth', 5, 'Protects from cold for 1 day.', 500),
  s('Utility', 'Cooling', 5, 'Protects from heat for 1 day.', 500),
  s('Utility', 'Levitation', 15, 'Levitates a light to mild load, alive or not.', 3500),
  s('Utility', 'Seal', 12, 'Locks a container or door.', 1800),
  s('Utility', 'Magecraft Detection', 6, 'Detects nearby magical energy.', 2500),
  s('Utility', 'Purify Water', 5, 'Cleans water.', 400),
  s('Utility', 'Silent Step', 14, 'Grants +2 Stealth for 5 turns, or +3 outside combat.', 3500),
  s('Utility', 'Taunt', 20, 'Up to 3 enemies must target the caster on their next turn when reasonable; bosses may resist.', 4500),
  s('Utility', 'Entangle', 35, 'For 1 round, redirects half of all damage dealt to the party to the caster.', 10000),
  s('Utility', 'Pure Chaos', 0, 'The next attack becomes a random spell.', 10000, { manaLabel: '3d20 Mana' }),
  s('Utility', 'Equilibrium', 0, 'Trades Health and Mana one-for-one, up to 3 uses or 100 total gained HP and Mana per combat.', 10000)
];
