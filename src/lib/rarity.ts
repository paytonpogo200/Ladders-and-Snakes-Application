export function rarityClass(rarity?: string) {
  return `rarity-card rarity-${(rarity || 'Common').toLowerCase()}`;
}
