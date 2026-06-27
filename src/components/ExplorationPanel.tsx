'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Compass, Dices, Gift, PackageOpen, Route, Sparkles, Upload, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import ExplorationGuide from '@/components/ExplorationGuide';
import NumberInput from '@/components/NumberInput';
import { DEFAULT_LOOT_ENTRIES, LOOT_BIOMES, LOOT_ROOM_TYPES } from '@/lib/lootPresets';
import { rarityClass } from '@/lib/rarity';
import { createDebouncedRefresh } from '@/lib/realtime';
import { readRememberedSelection, rememberSelection } from '@/lib/selectionMemory';
import type { Character, InventoryItemType, LootEntry, LootGeneratorConfig, LootPoolSize, LootRareRule, LootRollResult, LootRoomRule, Profile } from '@/lib/types';

type ExplorationLootResult = LootRollResult & {
  roll_id: string;
  remaining: number;
};

type DistributionRecord = {
  id: string;
  itemName: string;
  characterName: string;
};

type LootImportPreview = {
  fileName: string;
  entries: LootEntry[];
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  errors: string[];
  config: LootGeneratorConfig;
};

const requiredLootColumns = ['Item', 'Category', 'Biomes', 'Min Difficulty', 'Max Difficulty', 'Rarity', 'Weight', 'Min Qty', 'Max Qty'];
const defaultLootConfig: LootGeneratorConfig = {
  id: 'default',
  biomes: LOOT_BIOMES,
  difficulties: [1, 2, 3, 4, 5],
  pool_sizes: [
    { name: 'Tiny', rolls: 2 },
    { name: 'Small', rolls: 4 },
    { name: 'Medium', rolls: 8 },
    { name: 'Large', rolls: 14 },
    { name: 'Massive', rolls: 22 },
    { name: 'Tower Floor', rolls: 15 },
    { name: 'Base', rolls: 50 }
  ],
  room_types: LOOT_ROOM_TYPES,
  room_rules: [
    { name: 'Secret Room', multiplier: 0.5, round_up: true, min_rolls: 1 },
    { name: 'Tower Boss Room', multiplier: 2 }
  ],
  rare_rules: [
    { contains: 'capital', multiplier: 5 },
    { contains: 'base', multiplier: 2 },
    { contains: 'camp', multiplier: 1.33 }
  ],
  formula_notes: {}
};

function poolRollCount(pool: string, room: string, config: LootGeneratorConfig) {
  const base = config.pool_sizes.find((entry) => entry.name === pool)?.rolls ?? config.pool_sizes[0]?.rolls ?? 4;
  const rule = config.room_rules.find((entry) => entry.name === room);
  if (!rule) return base;
  const raw = base * (Number(rule.multiplier) || 1);
  const rounded = rule.round_up ? Math.ceil(raw) : Math.round(raw);
  return Math.max(rule.min_rolls ?? 0, rounded);
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function itemType(category: string): InventoryItemType {
  if (category === 'Weapon') return 'weapon';
  if (category === 'Clothing') return 'armor';
  if (['Potion', 'Alchemy', 'Food'].includes(category)) return 'consumable';
  if (['Tool', 'Storage', 'Gear'].includes(category)) return 'tool';
  if (['Scroll', 'Tome', 'Lore', 'Upgrade'].includes(category)) return 'quest';
  return 'misc';
}

function storageCapacity(name: string) {
  const capacities: Record<string, number> = {
    'Waist Pouch': 1,
    'Back Bag': 3,
    'Light Duffle': 6,
    'Heavy Duffle': 10,
    'Bag of Holding': 100
  };
  return capacities[name] ?? 0;
}

function textCell(row: Record<string, unknown>, key: string) {
  return String(row[key] ?? '').trim();
}

function numberCell(row: Record<string, unknown>, key: string) {
  const value = row[key];
  const number = typeof value === 'number' ? value : Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : NaN;
}

function sameLootEntry(a: LootEntry, b: LootEntry) {
  return a.item_name === b.item_name
    && a.category === b.category
    && a.biomes === b.biomes
    && Number(a.min_difficulty) === Number(b.min_difficulty)
    && Number(a.max_difficulty) === Number(b.max_difficulty)
    && a.rarity === b.rarity
    && Number(a.weight) === Number(b.weight)
    && Number(a.min_quantity) === Number(b.min_quantity)
    && Number(a.max_quantity) === Number(b.max_quantity)
    && a.item_type === b.item_type
    && Number(a.storage_capacity) === Number(b.storage_capacity);
}

function uniqueText(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map((value) => String(value ?? '').trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

function worksheetMatrix(XLSX: typeof import('xlsx'), sheet: import('xlsx').WorkSheet | undefined) {
  if (!sheet) return [] as unknown[][];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' });
}

function cellFormula(sheet: import('xlsx').WorkSheet | undefined, address: string) {
  const cell = sheet?.[address] as { f?: string } | undefined;
  return cell?.f ?? '';
}

function parseSwitchPoolSizes(formula: string) {
  const pairs = [...formula.matchAll(/"([^"]+)"\s*,\s*([0-9]+(?:\.[0-9]+)?)/g)];
  const seen = new Map<string, number>();
  pairs.forEach((match) => {
    const name = match[1].trim();
    const rolls = Number(match[2]);
    if (name && Number.isFinite(rolls) && !seen.has(name)) seen.set(name, Math.round(rolls));
  });
  return [...seen.entries()].map(([name, rolls]) => ({ name, rolls }));
}

function parseRoomRules(formula: string, roomTypes: string[]): LootRoomRule[] {
  return roomTypes
    .filter((name) => !['normal', 'default'].includes(name.toLowerCase()))
    .map((name) => {
      const start = formula.indexOf(`"${name}"`);
      if (start < 0) return null;
      const nextRoomStart = roomTypes
        .filter((entry) => entry !== name)
        .map((entry) => formula.indexOf(`"${entry}"`, start + name.length + 2))
        .filter((index) => index > start)
        .sort((a, b) => a - b)[0] ?? formula.length;
      const chunk = formula.slice(start, nextRoomStart).toLowerCase();
      if (chunk.includes('/2') || chunk.includes('*0.5')) return { name, multiplier: 0.5, round_up: chunk.includes('roundup') || chunk.includes('ceiling'), min_rolls: chunk.includes('max(1') ? 1 : undefined };
      const multiply = chunk.match(/\*\s*([0-9]+(?:\.[0-9]+)?)/);
      if (multiply) return { name, multiplier: Number(multiply[1]) };
      return { name, multiplier: 1 };
    })
    .filter(Boolean) as LootRoomRule[];
}

function parseRareRules(formula: string) {
  const rules: LootRareRule[] = [];
  const matches = formula.matchAll(/SEARCH\("([^"]+)"[\s\S]{0,90}?\)\)\s*,\s*([0-9]+(?:\.[0-9]+)?)/gi);
  for (const match of matches) {
    rules.push({ contains: match[1].toLowerCase(), multiplier: Number(match[2]) });
  }
  return rules.length > 0 ? rules : defaultLootConfig.rare_rules;
}

function findLabeledFormula(XLSX: typeof import('xlsx'), sheet: import('xlsx').WorkSheet | undefined, label: string) {
  if (!sheet) return '';
  const matrix = worksheetMatrix(XLSX, sheet);
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = 0; col < matrix[row].length; col += 1) {
      if (String(matrix[row][col] ?? '').trim().toLowerCase() !== label.toLowerCase()) continue;
      for (let offset = 1; offset <= 4; offset += 1) {
        const address = XLSX.utils.encode_cell({ r: row, c: col + offset });
        const formula = cellFormula(sheet, address);
        if (formula) return formula;
      }
    }
  }
  return '';
}

function collectWorkbookFormulas(workbook: import('xlsx').WorkBook) {
  const formulas: Record<string, string> = {};
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    Object.keys(sheet ?? {}).forEach((address) => {
      if (address.startsWith('!')) return;
      const formula = (sheet?.[address] as { f?: string } | undefined)?.f;
      if (formula) formulas[`${sheetName}!${address}`] = formula;
    });
  });
  return formulas;
}

function parseWorkbookConfig(XLSX: typeof import('xlsx'), workbook: import('xlsx').WorkBook, sourceName: string): LootGeneratorConfig {
  const settings = workbook.Sheets.Settings;
  const generator = workbook.Sheets.Generator;
  const settingsRows = worksheetMatrix(XLSX, settings);
  const columns = (index: number) => uniqueText(settingsRows.slice(1).map((row) => row[index]));
  const biomes = columns(0);
  const difficulties = settingsRows.slice(1).map((row) => Number(row[1])).filter((value) => Number.isFinite(value));
  const roomTypes = columns(3);
  const lootRollFormula = findLabeledFormula(XLSX, generator, 'Loot Rolls');
  const rareFormula = findLabeledFormula(XLSX, generator, 'Rare+ Multiplier');
  const formulaPoolSizes = lootRollFormula ? parseSwitchPoolSizes(lootRollFormula) : [];
  const settingPools = columns(2);
  const poolSizes: LootPoolSize[] = formulaPoolSizes.length > 0
    ? formulaPoolSizes
    : settingPools.map((name) => ({
        name,
        rolls: defaultLootConfig.pool_sizes.find((entry) => entry.name === name)?.rolls ?? 4
      }));
  const finalRoomTypes = roomTypes.length > 0 ? roomTypes : defaultLootConfig.room_types;
  return {
    id: 'default',
    biomes: biomes.length > 0 ? biomes : defaultLootConfig.biomes,
    difficulties: difficulties.length > 0 ? difficulties.map((value) => Math.trunc(value)) : defaultLootConfig.difficulties,
    pool_sizes: poolSizes.length > 0 ? poolSizes : defaultLootConfig.pool_sizes,
    room_types: finalRoomTypes,
    room_rules: lootRollFormula ? parseRoomRules(lootRollFormula, finalRoomTypes) : defaultLootConfig.room_rules,
    rare_rules: rareFormula ? parseRareRules(rareFormula) : defaultLootConfig.rare_rules,
    formula_notes: {
      source: sourceName,
      loot_rolls: lootRollFormula,
      rare_multiplier: rareFormula,
      ...collectWorkbookFormulas(workbook)
    }
  };
}

export default function ExplorationPanel({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [lootLoaded, setLootLoaded] = useState(false);
  const [rollForm, setRollForm] = useState({ biome: 'Caves', difficulty: 1, pool: 'Small', room: 'Normal' });
  const [results, setResults] = useState<ExplorationLootResult[]>([]);
  const [recipientByLoot, setRecipientByLoot] = useState<Record<string, string>>({});
  const [quantityByLoot, setQuantityByLoot] = useState<Record<string, number>>({});
  const [distributionHistory, setDistributionHistory] = useState<DistributionRecord[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [awardingId, setAwardingId] = useState('');
  const [lootImport, setLootImport] = useState<LootImportPreview | null>(null);
  const [importingLoot, setImportingLoot] = useState(false);
  const [lootConfig, setLootConfig] = useState<LootGeneratorConfig>(defaultLootConfig);

  async function loadData() {
    const [characterResult, lootResult, configResult] = await Promise.all([
      supabase.from('characters').select('*').eq('kind', 'player').order('name'),
      supabase.from('loot_entries').select('*', { count: 'exact', head: true }),
      supabase.from('loot_generator_config').select('*').eq('id', 'default').maybeSingle()
    ]);
    if (!characterResult.error) setCharacters((characterResult.data ?? []) as Character[]);
    if (!lootResult.error) setLootLoaded((lootResult.count ?? 0) > 0);
    if (!configResult.error && configResult.data) {
      const config = configResult.data as LootGeneratorConfig;
      setLootConfig(config);
      setRollForm((current) => ({
        biome: config.biomes.includes(current.biome) ? current.biome : config.biomes[0] ?? current.biome,
        difficulty: config.difficulties.includes(current.difficulty) ? current.difficulty : config.difficulties[0] ?? current.difficulty,
        pool: config.pool_sizes.some((entry) => entry.name === current.pool) ? current.pool : config.pool_sizes[0]?.name ?? current.pool,
        room: config.room_types.includes(current.room) ? current.room : config.room_types[0] ?? current.room
      }));
    }
  }

  useEffect(() => {
    if (profile.role !== 'dm') return;
    loadData();
    const refreshExploration = createDebouncedRefresh(loadData, 220);
    const channel = supabase
      .channel('exploration-character-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, refreshExploration)
      .subscribe();
    return () => {
      refreshExploration.cancel();
      supabase.removeChannel(channel);
    };
  }, []);

  if (profile.role !== 'dm') return null;

  async function loadLootTable() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase
      .from('loot_entries')
      .upsert(DEFAULT_LOOT_ENTRIES, { onConflict: 'item_key' });
    setBusy(false);
    setMessage(error?.message ?? 'Expedition loot table refreshed and ready to roll.');
    if (!error) await loadData();
  }

  async function previewLootSheet(file: File | null) {
    if (!file) return;
    setImportingLoot(true);
    setMessage('');
    setLootImport(null);

    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets['Loot Table'] ?? workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('No worksheet found.');
      const config = parseWorkbookConfig(XLSX, workbook, file.name);

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const headers = new Set(Object.keys(rows[0] ?? {}));
      const missing = requiredLootColumns.filter((column) => !headers.has(column));
      if (missing.length > 0) throw new Error(`Missing columns: ${missing.join(', ')}`);

      const errors: string[] = [];
      const entries: LootEntry[] = [];
      const seen = new Set<string>();

      rows.forEach((row, index) => {
        const item_name = textCell(row, 'Item');
        if (!item_name) return;

        const category = textCell(row, 'Category');
        const biomes = textCell(row, 'Biomes') || 'Any';
        const rarity = textCell(row, 'Rarity') || 'Common';
        const min_difficulty = numberCell(row, 'Min Difficulty');
        const max_difficulty = numberCell(row, 'Max Difficulty');
        const weight = numberCell(row, 'Weight');
        const min_quantity = numberCell(row, 'Min Qty');
        const max_quantity = numberCell(row, 'Max Qty');
        const rowLabel = `Row ${index + 2}`;

        if (!category) errors.push(`${rowLabel}: missing Category.`);
        if (!Number.isFinite(min_difficulty) || min_difficulty < 1 || min_difficulty > 5) errors.push(`${rowLabel}: Min Difficulty must be 1-5.`);
        if (!Number.isFinite(max_difficulty) || max_difficulty < 1 || max_difficulty > 5) errors.push(`${rowLabel}: Max Difficulty must be 1-5.`);
        if (Number.isFinite(min_difficulty) && Number.isFinite(max_difficulty) && min_difficulty > max_difficulty) errors.push(`${rowLabel}: Min Difficulty is higher than Max Difficulty.`);
        if (!Number.isFinite(weight) || weight <= 0) errors.push(`${rowLabel}: Weight must be above 0.`);
        if (!Number.isFinite(min_quantity) || min_quantity < 1) errors.push(`${rowLabel}: Min Qty must be at least 1.`);
        if (!Number.isFinite(max_quantity) || max_quantity < 1) errors.push(`${rowLabel}: Max Qty must be at least 1.`);
        if (Number.isFinite(min_quantity) && Number.isFinite(max_quantity) && min_quantity > max_quantity) errors.push(`${rowLabel}: Min Qty is higher than Max Qty.`);

        const item_key = slug(item_name);
        if (seen.has(item_key)) errors.push(`${rowLabel}: duplicate item "${item_name}".`);
        seen.add(item_key);

        entries.push({
          item_key,
          item_name,
          category,
          biomes,
          min_difficulty: Math.trunc(min_difficulty),
          max_difficulty: Math.trunc(max_difficulty),
          rarity,
          weight,
          min_quantity: Math.trunc(min_quantity),
          max_quantity: Math.trunc(max_quantity),
          item_type: itemType(category),
          storage_capacity: storageCapacity(item_name)
        });
      });

      if (entries.length === 0) errors.push('No loot rows found.');

      const { data: currentData, error } = await supabase
        .from('loot_entries')
        .select('item_key,item_name,category,biomes,min_difficulty,max_difficulty,rarity,weight,min_quantity,max_quantity,item_type,storage_capacity');
      if (error) throw error;

      const current = new Map(((currentData ?? []) as LootEntry[]).map((entry) => [entry.item_key, entry]));
      let newCount = 0;
      let changedCount = 0;
      let unchangedCount = 0;

      entries.forEach((entry) => {
        const existing = current.get(entry.item_key);
        if (!existing) newCount += 1;
        else if (sameLootEntry(entry, existing)) unchangedCount += 1;
        else changedCount += 1;
      });

      setLootImport({ fileName: file.name, entries, newCount, changedCount, unchangedCount, errors, config });
      setMessage(errors.length > 0 ? 'Fix the sheet errors before importing.' : 'Loot sheet ready to import.');
    } catch (error) {
      setLootImport({
        fileName: file.name,
        entries: [],
        newCount: 0,
        changedCount: 0,
        unchangedCount: 0,
        errors: [error instanceof Error ? error.message : 'Could not read that loot sheet.'],
        config: defaultLootConfig
      });
      setMessage('Could not prepare that loot sheet.');
    } finally {
      setImportingLoot(false);
    }
  }

  async function importLootSheet() {
    if (!lootImport || lootImport.errors.length > 0 || lootImport.entries.length === 0) return;
    setImportingLoot(true);
    setMessage('');
    const [lootResult, configResult] = await Promise.all([
      supabase.from('loot_entries').upsert(lootImport.entries, { onConflict: 'item_key' }),
      supabase.from('loot_generator_config').upsert(lootImport.config, { onConflict: 'id' })
    ]);
    setImportingLoot(false);
    const error = lootResult.error ?? configResult.error;
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage(`${lootImport.entries.length} loot entries imported and generator settings updated.`);
    setLootImport(null);
    await loadData();
  }

  async function rollLoot() {
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.rpc('dm_roll_loot', {
      loot_biome: rollForm.biome,
      loot_difficulty: rollForm.difficulty,
      loot_pool_size: rollForm.pool,
      loot_room_type: rollForm.room
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }

    const stamp = Date.now();
    const rolled = ((data ?? []) as LootRollResult[]).map((result, index) => ({
      ...result,
      roll_id: `${stamp}-${index}-${result.loot_entry_id}`,
      remaining: result.quantity
    }));
    const rememberedRecipient = readRememberedSelection(profile.id, 'loot-recipient-character');
    const firstCharacterId = characters.some((entry) => entry.id === rememberedRecipient) ? rememberedRecipient : characters[0]?.id ?? '';
    setResults(rolled);
    setRecipientByLoot(Object.fromEntries(rolled.map((result) => [result.roll_id, firstCharacterId])));
    setQuantityByLoot(Object.fromEntries(rolled.map((result) => [result.roll_id, 1])));
    setDistributionHistory([]);
    setMessage(rolled.length > 0 ? 'Loot rolled. The cache remains here while the party divides it.' : 'No matching loot was found for this expedition.');
  }

  async function giveLoot(result: ExplorationLootResult) {
    const characterId = recipientByLoot[result.roll_id];
    const character = characters.find((entry) => entry.id === characterId);
    if (!characterId || !character || result.remaining <= 0) return;
    const amount = Math.max(1, Math.min(result.remaining, Number(quantityByLoot[result.roll_id]) || 1));

    setAwardingId(result.roll_id);
    setMessage('');
    const { error } = await supabase.rpc('dm_award_loot', {
      target_character_id: characterId,
      target_loot_entry_id: result.loot_entry_id,
      award_quantity: amount
    });
    setAwardingId('');

    if (error) {
      setMessage(error.message);
      return;
    }

    const remaining = Math.max(0, result.remaining - amount);
    setResults((current) => current.map((entry) =>
      entry.roll_id === result.roll_id ? { ...entry, remaining } : entry
    ));
    setDistributionHistory((current) => [
      { id: `${Date.now()}-${result.loot_entry_id}`, itemName: `${amount}× ${result.item_name}`, characterName: character.name },
      ...current
    ].slice(0, 8));
    setQuantityByLoot((current) => ({ ...current, [result.roll_id]: Math.min(current[result.roll_id] ?? 1, Math.max(1, remaining)) }));
    setMessage(`${amount}× ${result.item_name} given to ${character.name}.${remaining > 0 ? ` ${remaining} still in the party cache.` : ' That stack is fully distributed.'}`);
  }

  function chooseLootRecipient(rollId: string, characterId: string) {
    setRecipientByLoot((current) => ({ ...current, [rollId]: characterId }));
    rememberSelection(profile.id, 'loot-recipient-character', characterId);
  }

  const remainingItems = results.reduce((total, result) => total + result.remaining, 0);
  const completedCount = results.filter((result) => result.remaining === 0).length;

  return (
    <div className="space-y-4">
      <section className="surface overflow-hidden rounded-2xl">
        <div className="relative p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[#63b5a510] blur-3xl" />
          <div className="relative">
            <p className="eyebrow mb-2">Dungeon Master workspace</p>
            <div className="flex items-start gap-3">
              <span className="rounded-2xl border border-[#63b5a533] bg-[#63b5a510] p-3 text-[var(--teal)]"><Compass size={25} /></span>
              <div>
                <h2 className="text-3xl font-black tracking-[-0.035em]">Exploration</h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      {!lootLoaded ? (
        <section className="rounded-2xl border border-[#d1a85b45] bg-[#d1a85b0a] p-4">
          <h3 className="font-black">Prepare the expedition loot table</h3>
          <button onClick={loadLootTable} disabled={busy} className="primary-button mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50">
            <Sparkles size={17} /> {busy ? 'Loading…' : 'Load Expedition Loot Table'}
          </button>
        </section>
      ) : (
        <section className="surface rounded-2xl">
          <div className="flex items-center gap-3 border-b border-white/[0.07] p-4">
            <span className="rounded-xl bg-[#9b70c718] p-2.5 text-[#b994dd]"><Dices size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block font-black">Expedition loot generator</span><span className="block text-xs text-[var(--muted)]">Roll a cache, then divide it one item at a time.</span></span>
            <button onClick={loadLootTable} disabled={busy} className="rounded-xl border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--brass)] disabled:opacity-50">
              Refresh table
            </button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Biome</span><select className="field" value={rollForm.biome} onChange={(event) => setRollForm({ ...rollForm, biome: event.target.value })}>{lootConfig.biomes.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Difficulty</span><select className="field" value={rollForm.difficulty} onChange={(event) => setRollForm({ ...rollForm, difficulty: Number(event.target.value) })}>{lootConfig.difficulties.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Loot pool</span><select className="field" value={rollForm.pool} onChange={(event) => setRollForm({ ...rollForm, pool: event.target.value })}>{lootConfig.pool_sizes.map((entry) => <option key={entry.name}>{entry.name}</option>)}</select></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Room type</span><select className="field" value={rollForm.room} onChange={(event) => setRollForm({ ...rollForm, room: event.target.value })}>{lootConfig.room_types.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
            </div>
            <button onClick={rollLoot} disabled={busy} className="primary-button mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-50">
              <Dices size={18} /> {busy ? 'Rolling…' : `Roll ${poolRollCount(rollForm.pool, rollForm.room, lootConfig)} drops`}
            </button>
          </div>
        </section>
      )}

      <section className="surface rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-[#d1a85b12] p-2.5 text-[var(--brass)]"><Upload size={18} /></span>
            <h3 className="font-black">Upload loot sheet</h3>
          </div>
          <label className="primary-button cursor-pointer rounded-xl px-4 py-3 text-sm font-black">
            {importingLoot ? 'Reading…' : 'Choose file'}
            <input
              className="hidden"
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                void previewLootSheet(event.target.files?.[0] ?? null);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </div>

        {lootImport && (
          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-black/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-black">{lootImport.fileName}</span>
              <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">{lootImport.entries.length} rows</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-black">
              <span className="rounded-xl bg-[#63b5a510] p-2 text-[var(--teal)]">{lootImport.newCount} new</span>
              <span className="rounded-xl bg-[#d1a85b12] p-2 text-[var(--brass)]">{lootImport.changedCount} changed</span>
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{lootImport.unchangedCount} same</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black sm:grid-cols-5">
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{lootImport.config.biomes.length} biomes</span>
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{lootImport.config.pool_sizes.length} pools</span>
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{lootImport.config.room_types.length} rooms</span>
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{lootImport.config.rare_rules.length} rarity rules</span>
              <span className="rounded-xl bg-black/20 p-2 text-[var(--muted)]">{Object.keys(lootImport.config.formula_notes ?? {}).length} formulas</span>
            </div>
            {lootImport.errors.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#d76a6255] bg-[#d76a6210] p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--red)]"><AlertTriangle size={15} /> Sheet errors</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto text-xs leading-5 text-[#ef9b91]">
                  {lootImport.errors.slice(0, 12).map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => setLootImport(null)} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-black text-[var(--muted)]">Cancel</button>
              <button onClick={importLootSheet} disabled={importingLoot || lootImport.errors.length > 0 || lootImport.entries.length === 0} className="teal-button flex-1 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-45">
                {importingLoot ? 'Importing…' : 'Import loot table'}
              </button>
            </div>
          </div>
        )}
      </section>

      {results.length > 0 && (
        <section className="space-y-3">
          <div className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <p className="eyebrow">Party loot cache</p>
              <h3 className="mt-1 text-xl font-black">{remainingItems} item{remainingItems === 1 ? '' : 's'} left to divide</h3>
            </div>
            <div className="flex gap-2 text-xs font-black">
              <span className="rounded-full border border-[var(--line)] px-3 py-2 text-[var(--muted)]">{results.length} stacks</span>
              <span className="rounded-full border border-[#63b5a544] bg-[#63b5a50a] px-3 py-2 text-[var(--teal)]">{completedCount} finished</span>
            </div>
          </div>

          {characters.length === 0 && (
            <div className="rounded-xl border border-[#d76a6244] bg-[#d76a620c] p-3 text-sm text-[#ef8d85]">
              Create a player character before distributing loot.
            </div>
          )}

          <div className="grid gap-2">
            {results.map((result) => {
              const complete = result.remaining === 0;
              const isAwarding = awardingId === result.roll_id;
              return (
                <article key={result.roll_id} className={`rounded-2xl p-4 ${rarityClass(result.rarity)} ${complete ? 'opacity-65' : ''}`}>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem_7rem_auto] lg:items-end">
                    <div>
                      <div className="flex items-start gap-3">
                        <span className="flex h-10 min-w-10 items-center justify-center rounded-xl bg-black/20 px-2 text-sm font-black">{result.remaining}×</span>
                        <div>
                          <p className="font-black text-[var(--paper)]">{result.item_name}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-wider">{result.rarity} · {result.category}</p>
                          <p className="mt-2 text-xs text-[var(--muted)]">Rolled {result.quantity} · {complete ? 'Fully distributed' : `${result.remaining} remaining`}</p>
                        </div>
                      </div>
                    </div>
                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Give the next one to</span>
                      <select
                        className="field"
                        value={recipientByLoot[result.roll_id] ?? ''}
                        onChange={(event) => chooseLootRecipient(result.roll_id, event.target.value)}
                        disabled={complete || characters.length === 0}
                      >
                        {characters.length === 0 && <option value="">No player characters</option>}
                        {characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Amount</span>
                      <NumberInput
                        className="field"
                        min={1}
                        max={result.remaining}
                        value={quantityByLoot[result.roll_id] ?? 1}
                        onValueChange={(value) => setQuantityByLoot((current) => ({ ...current, [result.roll_id]: value }))}
                        disabled={complete}
                      />
                    </label>
                    <button
                      onClick={() => giveLoot(result)}
                      disabled={complete || !!awardingId || !recipientByLoot[result.roll_id]}
                      className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-45 ${complete ? 'border border-[#63b5a544] bg-[#63b5a510] text-[var(--teal)]' : 'teal-button'}`}
                    >
                      {complete ? <><Check size={17} /> Done</> : <><Gift size={17} /> {isAwarding ? 'Giving…' : `Give ${Math.max(1, Math.min(result.remaining, quantityByLoot[result.roll_id] ?? 1))}`}</>}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {distributionHistory.length > 0 && (
        <section className="surface rounded-2xl p-4">
          <div className="mb-3 flex items-center gap-2"><Users size={17} className="text-[var(--teal)]" /><h3 className="font-black">Recent handoffs</h3></div>
          <div className="grid gap-2 sm:grid-cols-2">
            {distributionHistory.map((record) => (
              <div key={record.id} className="flex items-center gap-3 rounded-xl bg-black/20 p-3 text-sm">
                <PackageOpen size={16} className="shrink-0 text-[var(--brass)]" />
                <span className="min-w-0"><span className="font-black">{record.itemName}</span><span className="text-[var(--muted)]"> → {record.characterName}</span></span>
              </div>
            ))}
          </div>
        </section>
      )}

      <ExplorationGuide />

      <section className="surface-soft flex items-start gap-3 rounded-2xl border border-dashed border-white/10 p-4">
        <Route size={19} className="mt-0.5 shrink-0 text-[var(--muted)]" />
        <div><p className="font-black">Built to grow</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">Future travel, discovery, encounter, and environment tools can be added here without cluttering the Bestiary or Battlefield.</p></div>
      </section>

      {message && <p className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
