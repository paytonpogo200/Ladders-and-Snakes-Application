import { ITEM_CATALOG, type ItemCatalogEntry } from '@/lib/itemCatalog';

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

const aliases: Record<string, string> = {
  'arcane nectar': 'arcane nector',
  'jewelry': 'jewlery',
  'jewelery': 'jewlery',
  'glass flask': 'glass flasks',
  'flask': 'glass flasks',
  'lesser mana regen potion': 'lesser mana potion',
  'greater mana regen potion': 'greater mana potion',
  'greatest mana regen potion': 'greatest mana potion',
  'lesser thick skin potion': 'lesser thickskin potion',
  'greater thick skin potion': 'greater thickskin potion',
  'greatest thick skin potion': 'greatest thinkskin potion',
  'greatest thickskin potion': 'greatest thinkskin potion'
};

const catalogByNormalizedName = new Map(ITEM_CATALOG.map((entry) => [normalize(entry.name), entry]));

function editDistance(a: string, b: string) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

export function catalogMatchForItemName(name: string): ItemCatalogEntry | null {
  const normalized = normalize(name);
  const aliasTarget = aliases[normalized];
  const direct = catalogByNormalizedName.get(aliasTarget ?? normalized);
  if (direct) return direct;

  if (normalized.length < 5) return null;
  let best: { entry: ItemCatalogEntry; distance: number } | null = null;
  for (const entry of ITEM_CATALOG) {
    const candidate = normalize(entry.name);
    if (Math.abs(candidate.length - normalized.length) > 2) continue;
    const distance = editDistance(normalized, candidate);
    if (distance <= 2 && (!best || distance < best.distance)) best = { entry, distance };
  }
  return best?.entry ?? null;
}

export function isPotionItem(itemType?: string | null, itemName = '') {
  return itemType === 'potion' || /potion/i.test(itemName);
}

export function potionEffect(itemName: string): { kind: 'hp' | 'mana'; amount: number } | null {
  const lower = itemName.toLowerCase();
  const amount = lower.includes('greatest') ? 250 : lower.includes('greater') ? 75 : lower.includes('lesser') ? 25 : 0;
  if (amount <= 0) return null;
  if (lower.includes('healing')) return { kind: 'hp', amount };
  if (lower.includes('mana')) return { kind: 'mana', amount };
  return null;
}

export const GLASS_FLASK_CATALOG_ITEM = catalogMatchForItemName('Glass Flasks') ?? {
  key: 'glass-flasks',
  name: 'Glass Flasks',
  category: 'Tool',
  rarity: 'Common',
  item_type: 'tool' as const,
  min_quantity: 1,
  max_quantity: 5
};
