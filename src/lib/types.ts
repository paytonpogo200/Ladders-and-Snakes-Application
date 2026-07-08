export type UserRole = 'player' | 'dm';
export type CharacterKind = 'player' | 'enemy' | 'npc';
export type BattleStatus = 'active' | 'ended';
export type InventoryItemType = 'weapon' | 'armor' | 'shield' | 'pet' | 'accessory' | 'consumable' | 'ore' | 'potion' | 'food' | 'plant' | 'fabric' | 'tool' | 'quest' | 'misc';

export type ClassAsset = {
  id?: string;
  class_key: string;
  name: string;
  type: string;
  armor: string;
  identity: string;
  inventory_slots: number;
  spell_slots: number;
  health: number;
  mana: number;
  attributes: CharacterAttributes;
  passives: string[];
  token_color: string;
  updated_at?: string;
};

export type EnemyAsset = {
  id?: string;
  enemy_key: string;
  category: string;
  name: string;
  health: number;
  mana: number;
  damage: number;
  notes: string;
  token_color: string;
  is_discovered: boolean;
  updated_at?: string;
};

export type LootEntry = {
  id?: string;
  item_key: string;
  item_name: string;
  category: string;
  biomes: string;
  min_difficulty: number;
  max_difficulty: number;
  rarity: string;
  weight: number;
  min_quantity: number;
  max_quantity: number;
  item_type: InventoryItemType;
  storage_capacity: number;
};

export type LootRollResult = {
  loot_entry_id: string;
  item_name: string;
  category: string;
  rarity: string;
  quantity: number;
};

export type LootPoolSize = {
  name: string;
  rolls: number;
};

export type LootRoomRule = {
  name: string;
  multiplier: number;
  round_up?: boolean;
  min_rolls?: number;
};

export type LootRareRule = {
  contains: string;
  multiplier: number;
};

export type LootGeneratorConfig = {
  id?: string;
  biomes: string[];
  difficulties: number[];
  pool_sizes: LootPoolSize[];
  room_types: string[];
  room_rules: LootRoomRule[];
  rare_rules: LootRareRule[];
  formula_notes?: Record<string, string>;
  updated_at?: string;
};

export const ATTRIBUTE_KEYS = [
  'strength',
  'agility',
  'vitality',
  'intelligence',
  'recovery',
  'charisma',
  'accuracy',
  'range',
  'mana_regen',
  'perception',
  'alchemy',
  'stealth'
] as const;

export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
export type CharacterAttributes = Record<AttributeKey, number>;

export const DEFAULT_ATTRIBUTES: CharacterAttributes = {
  strength: 0,
  agility: 0,
  vitality: 0,
  intelligence: 0,
  recovery: 0,
  charisma: 0,
  accuracy: 0,
  range: 0,
  mana_regen: 0,
  perception: 0,
  alchemy: 0,
  stealth: 0
};

export const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  strength: 'Strength',
  agility: 'Agility',
  vitality: 'Vitality',
  intelligence: 'Intelligence',
  recovery: 'Recovery',
  charisma: 'Charisma',
  accuracy: 'Accuracy',
  range: 'Range',
  mana_regen: 'Mana Regen',
  perception: 'Perception',
  alchemy: 'Alchemy',
  stealth: 'Stealth'
};

export type Profile = {
  id: string;
  display_name: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
};

export type CampaignLocation = {
  id: string;
  location_key: string;
  name: string;
  is_city: boolean;
  created_at?: string;
};

export type PlayerLocation = {
  user_id: string;
  location_id: string;
  previous_location_id?: string | null;
  changed_at: string;
  return_since?: string | null;
  return_summary_pending: boolean;
  location?: CampaignLocation | null;
};

export type FeedEvent = {
  id: string;
  location_id: string;
  event_type: 'announcement' | 'trade';
  title: string;
  body: string;
  speaker: string;
  created_at: string;
};

export type CampaignNotification = {
  id: string;
  user_id: string;
  kind: 'announcement' | 'trade_offer' | 'trade_update' | 'trade_complete';
  title: string;
  body: string;
  trade_offer_id?: string | null;
  event_id?: string | null;
  is_read: boolean;
  created_at: string;
};

export type Character = {
  id: string;
  name: string;
  class_name: string;
  kind: CharacterKind;
  owner_user_id: string | null;
  max_hp: number;
  current_hp: number;
  max_mana: number;
  current_mana: number;
  level: number;
  class_key: string;
  inventory_slots: number;
  spell_slots: number;
  attributes: CharacterAttributes;
  notes: string;
  token_color: string;
  location_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type InventoryItem = {
  id: string;
  character_id: string;
  item_name: string;
  quantity: number;
  notes: string;
  slot_index: number;
  item_type: InventoryItemType;
  equipped: boolean;
  loadout_slot?: string | null;
  parent_item_id: string | null;
  is_storage: boolean;
  storage_capacity: number;
  rarity: string;
  source_product_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CurrencySystem = {
  id: string;
  system_key: string;
  name: string;
  base_unit_name: string;
};

export type CurrencyDenomination = {
  id: string;
  currency_system_id: string;
  denomination_key: string;
  name: string;
  base_value: number;
  sort_order: number;
};

export type CharacterWallet = {
  character_id: string;
  currency_system_id: string;
  balance_base: number;
};

export type City = {
  id: string;
  city_key: string;
  name: string;
  description: string;
  currency_system_id: string;
  is_discovered: boolean;
  is_open: boolean;
};

export type CityFacility = {
  id: string;
  city_id: string;
  facility_key: string;
  name: string;
  description: string;
  sort_order: number;
};

export type CityVendor = {
  id: string;
  facility_id: string;
  vendor_key: string;
  name: string;
  role: string;
  description: string;
  sort_order: number;
};

export type MarketProduct = {
  id: string;
  product_key: string;
  name: string;
  description: string;
  item_type: InventoryItemType;
  price_base: number;
  stock_quantity: number | null;
  storage_capacity: number;
  is_available: boolean;
  spell_key?: string | null;
};

export type MarketListing = {
  id: string;
  vendor_id: string;
  product_id: string;
  sort_order: number;
  products?: MarketProduct | null;
};

export type Battle = {
  id: string;
  status: BattleStatus;
  grid_width: number;
  grid_height: number;
  created_by: string | null;
  created_at?: string;
  ended_at?: string | null;
};

export type Combatant = {
  id: string;
  battle_id: string;
  character_id: string;
  x: number;
  y: number;
  current_hp: number;
  current_mana: number;
  initiative: number | null;
  is_hidden: boolean;
  characters?: Character | null;
};

export type Spell = {
  id: string;
  spell_key: string;
  name: string;
  category: string;
  mana_cost: number;
  mana_label: string;
  description: string;
};

export type CharacterSpell = {
  id: string;
  character_id: string;
  spell_id: string;
  prepared_slot: number | null;
  spells?: Spell | null;
};

export type PlayerHouse = {
  id: string;
  owner_user_id: string;
  city_id: string;
  name: string;
  capacity: number;
};

export type HouseInventoryItem = {
  id: string;
  house_id: string;
  item_name: string;
  quantity: number;
  notes: string;
  item_type: InventoryItemType;
  slot_index: number;
  is_storage: boolean;
  storage_capacity: number;
  rarity: string;
  source_product_id?: string | null;
};

export type CharacterProperty = {
  id: string;
  character_id: string;
  property_key: string;
  property_name: string;
  custom_name: string;
  property_type: 'wagon' | 'animal' | 'property';
  notes: string;
  source_product_id?: string | null;
  is_at_house?: boolean;
  house_slot_index?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type CharacterTransferCapacity = {
  character_id: string;
  free_slots: number;
};

export type ItemTransferRequest = {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  source_character_id: string;
  target_character_id: string;
  source_item_id: string | null;
  item_name: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  created_at: string;
  resolved_at?: string | null;
  source_character?: Pick<Character, 'id' | 'name'> | null;
  target_character?: Pick<Character, 'id' | 'name'> | null;
};

export type TamedBeast = {
  id: string;
  beastmaster_character_id: string;
  battle_character_id: string;
  name: string;
  wild_score: number;
  is_active: boolean;
  created_at?: string;
  battle_character?: Character | null;
};

export type TradeOffer = {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  sender_character_id: string;
  recipient_character_id: string;
  location_id: string;
  currency_system_id?: string | null;
  offered_currency_base: number;
  requested_currency_base: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'countered';
  parent_offer_id?: string | null;
  created_at: string;
  resolved_at?: string | null;
};

export type TradeOfferItem = {
  id: string;
  offer_id: string;
  side: 'offered' | 'requested';
  source_item_id: string | null;
  item_name: string;
  quantity: number;
  rarity: string;
};
