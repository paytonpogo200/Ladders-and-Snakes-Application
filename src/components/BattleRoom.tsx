'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart, Plus, ShieldAlert, Sparkles, Swords, Trash2, XCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import BattleMap from '@/components/BattleMap';
import TokenColorPicker from '@/components/TokenColorPicker';
import InventoryPanel from '@/components/InventoryPanel';
import NumberInput from '@/components/NumberInput';
import SpellPanel from '@/components/SpellPanel';
import { DEFAULT_ENEMY_ASSETS, ENEMY_CATEGORIES } from '@/lib/enemyPresets';
import { percent } from '@/lib/format';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Battle, Character, Combatant, EnemyAsset, Profile, TamedBeast } from '@/lib/types';

type EnemyForm = {
  mode: 'preset' | 'custom';
  category: string;
  enemy_key: string;
  name: string;
  hp: number;
  mana: number;
  damage: number;
  notes: string;
  token_color: string;
};

const firstEnemy = DEFAULT_ENEMY_ASSETS[0];

export default function BattleRoom({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const isDm = profile.role === 'dm';
  const [characters, setCharacters] = useState<Character[]>([]);
  const [enemyAssets, setEnemyAssets] = useState<EnemyAsset[]>([]);
  const [tamedBeasts, setTamedBeasts] = useState<TamedBeast[]>([]);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedCombatantId, setSelectedCombatantId] = useState<string | null>(null);
  const [stats, setStats] = useState({ current_hp: 0, current_mana: 0, initiative: 0 });
  const [enemy, setEnemy] = useState<EnemyForm>({
    mode: 'preset',
    category: firstEnemy.category,
    enemy_key: firstEnemy.enemy_key,
    name: firstEnemy.name,
    hp: firstEnemy.health,
    mana: firstEnemy.mana,
    damage: firstEnemy.damage,
    notes: firstEnemy.notes,
    token_color: firstEnemy.token_color
  });
  const [busy, setBusy] = useState(false);

  const selectedCombatant = combatants.find((entry) => entry.id === selectedCombatantId) ?? null;
  const myCombatants = combatants.filter((entry) => entry.characters?.owner_user_id === profile.id);
  const availableEnemies = enemyAssets.length > 0 ? enemyAssets : DEFAULT_ENEMY_ASSETS;
  const categories = Array.from(new Set(availableEnemies.map((entry) => entry.category)));
  const categoryEnemies = availableEnemies.filter((entry) => entry.category === enemy.category);

  async function loadCharacters() {
    const { data, error } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
    if (!error) setCharacters((data ?? []) as Character[]);
  }

  async function loadEnemyAssets() {
    const { data, error } = await supabase.from('enemy_assets').select('*').order('category').order('name');
    if (!error) setEnemyAssets((data ?? []) as EnemyAsset[]);
  }

  async function loadTamedBeasts() {
    const { data, error } = await supabase.from('tamed_beasts').select('*').eq('is_active', true);
    if (!error) setTamedBeasts((data ?? []) as TamedBeast[]);
  }

  async function loadCombatants(battleId: string) {
    const { data, error } = await supabase
      .from('combatants')
      .select('*, characters(*)')
      .eq('battle_id', battleId)
      .order('initiative', { ascending: false, nullsFirst: false })
      .order('created_at');
    if (!error) setCombatants((data ?? []) as Combatant[]);
  }

  async function loadBattle() {
    const { data, error } = await supabase.from('battles').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return;
    setBattle((data as Battle | null) ?? null);
    if (data) await loadCombatants(data.id);
    else {
      setCombatants([]);
      setSelectedCombatantId(null);
    }
  }

  useEffect(() => {
    loadCharacters();
    loadEnemyAssets();
    loadTamedBeasts();
    loadBattle();
    const refreshCharacters = createDebouncedRefresh(loadCharacters, 180);
    const refreshBattle = createDebouncedRefresh(loadBattle, 140);
    const refreshEnemyAssets = createDebouncedRefresh(loadEnemyAssets, 240);
    const refreshTamedBeasts = createDebouncedRefresh(loadTamedBeasts, 180);
    const channel = supabase
      .channel('battle-room-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, refreshCharacters)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battles' }, refreshBattle)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'combatants' }, refreshBattle)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enemy_assets' }, refreshEnemyAssets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamed_beasts' }, refreshTamedBeasts)
      .subscribe();
    return () => {
      refreshCharacters.cancel();
      refreshBattle.cancel();
      refreshEnemyAssets.cancel();
      refreshTamedBeasts.cancel();
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!selectedCombatant) return;
    setStats({
      current_hp: selectedCombatant.current_hp,
      current_mana: selectedCombatant.current_mana,
      initiative: selectedCombatant.initiative ?? 0
    });
  }, [selectedCombatant?.id, selectedCombatant?.current_hp, selectedCombatant?.current_mana]);

  function useEnemyAsset(asset: EnemyAsset) {
    setEnemy((current) => ({
      ...current,
      mode: 'preset',
      category: asset.category,
      enemy_key: asset.enemy_key,
      name: asset.name,
      hp: asset.health,
      mana: asset.mana,
      damage: asset.damage,
      notes: asset.notes,
      token_color: asset.token_color
    }));
  }

  function switchCategory(category: string) {
    const first = availableEnemies.find((entry) => entry.category === category);
    if (first) useEnemyAsset(first);
  }

  function switchMode(mode: 'preset' | 'custom') {
    if (mode === 'custom') {
      setEnemy({
        mode,
        category: 'Custom',
        enemy_key: '',
        name: '',
        hp: 50,
        mana: 0,
        damage: 10,
        notes: '',
        token_color: '#c84f49'
      });
    } else useEnemyAsset(availableEnemies[0] ?? firstEnemy);
  }

  async function startBattle() {
    if (!isDm || selectedIds.length === 0) return;
    setBusy(true);
    const { data: created, error } = await supabase.from('battles').insert({ created_by: profile.id, grid_width: 24, grid_height: 24 }).select('*').single();
    if (!error && created) {
      const rows = characters.filter((entry) => selectedIds.includes(entry.id)).map((entry, index) => ({
        battle_id: created.id,
        character_id: entry.id,
        x: 2 + (index % 5),
        y: 2 + Math.floor(index / 5),
        current_hp: entry.current_hp,
        current_mana: entry.current_mana
      }));
      await supabase.from('combatants').insert(rows);
      setSelectedIds([]);
      await loadBattle();
    }
    setBusy(false);
  }

  async function endBattle() {
    if (!battle || !isDm || !window.confirm('End this encounter and save everyone’s current health and mana?')) return;
    setBusy(true);
    await Promise.all(combatants.map((entry) => supabase.from('characters').update({ current_hp: entry.current_hp, current_mana: entry.current_mana }).eq('id', entry.character_id)));
    await supabase.from('battles').update({ status: 'ended', ended_at: new Date().toISOString() }).eq('id', battle.id);
    setBusy(false);
    await loadBattle();
  }

  async function saveStats() {
    if (!selectedCombatant || !isDm || !battle) return;
    await supabase.from('combatants').update({
      current_hp: Math.max(0, Number(stats.current_hp) || 0),
      current_mana: Math.max(0, Number(stats.current_mana) || 0),
      initiative: Number(stats.initiative) || null
    }).eq('id', selectedCombatant.id);
    await loadCombatants(battle.id);
  }

  async function moveCombatant(id: string, x: number, y: number) {
    if (!battle || !isDm) return;
    await supabase.from('combatants').update({ x, y }).eq('id', id);
    setSelectedCombatantId(null);
    await loadCombatants(battle.id);
  }

  async function removeCombatant(id: string) {
    if (!battle || !isDm) return;
    if (selectedCombatantId === id) setSelectedCombatantId(null);
    await supabase.from('combatants').delete().eq('id', id);
    await loadCombatants(battle.id);
  }

  async function updateInitiative(id: string, initiative: number) {
    if (!battle || !isDm) return;
    await supabase
      .from('combatants')
      .update({ initiative: Math.max(1, Math.min(20, Number(initiative) || 1)) })
      .eq('id', id);
    await loadCombatants(battle.id);
  }

  async function addEnemy(event: React.FormEvent) {
    event.preventDefault();
    if (!battle || !isDm || !enemy.name.trim()) return;
    const hp = Math.max(0, Number(enemy.hp) || 0);
    const mana = Math.max(0, Number(enemy.mana) || 0);
    const quickNotes = [`Damage: ${Math.max(0, Number(enemy.damage) || 0)}`, enemy.notes].filter(Boolean).join('\n');
    const { data } = await supabase.from('characters').insert({
      name: enemy.name.trim(),
      class_key: '',
      class_name: enemy.category || 'Enemy',
      kind: 'enemy',
      owner_user_id: null,
      max_hp: hp,
      current_hp: hp,
      max_mana: mana,
      current_mana: mana,
      inventory_slots: 0,
      spell_slots: 0,
      notes: quickNotes,
      token_color: enemy.token_color
    }).select('*').single();
    if (data) {
      await supabase.from('combatants').insert({
        battle_id: battle.id,
        character_id: data.id,
        x: 8 + (combatants.length % 5),
        y: 8 + Math.floor(combatants.length / 5),
        current_hp: hp,
        current_mana: mana
      });
      await loadBattle();
    }
  }

  if (!battle) {
    const activeBeastIds = new Set(tamedBeasts.map((entry) => entry.battle_character_id));
    const party = characters.filter((entry) => entry.kind === 'player' || activeBeastIds.has(entry.id));
    return (
      <div className="space-y-4">
        <section className="surface rounded-2xl p-5">
          <p className="eyebrow mb-2">Battlefield</p>
          <h2 className="text-2xl font-black tracking-tight">The field is quiet.</h2>
        </section>

        {isDm && (
          <section className="surface rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h3 className="font-black">Assemble the party</h3><p className="text-xs text-[var(--muted)]">{selectedIds.length} selected</p></div>
              <button onClick={startBattle} disabled={busy || selectedIds.length === 0} className="primary-button flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40"><Swords size={17} /> Begin encounter</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {party.length === 0 && <p className="surface-soft rounded-xl p-4 text-sm text-[var(--muted)]">Create characters in the Character Ledger first.</p>}
              {party.map((character) => {
                const chosen = selectedIds.includes(character.id);
                return (
                  <button key={character.id} onClick={() => setSelectedIds((current) => chosen ? current.filter((id) => id !== character.id) : [...current, character.id])} className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${chosen ? 'border-[var(--brass)] bg-[#d1a85b0e]' : 'border-[var(--line)] bg-black/10'}`}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 font-black" style={{ backgroundColor: character.token_color }}>{character.name[0]}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate font-black">{character.name}</span><span className="block truncate text-xs text-[var(--muted)]">{activeBeastIds.has(character.id) ? `Tamed beast · Wild ${tamedBeasts.find((entry) => entry.battle_character_id === character.id)?.wild_score ?? '?'}` : `Level ${character.level ?? 1} ${character.class_name}`}</span></span>
                    <span className={`h-5 w-5 rounded-md border ${chosen ? 'border-[var(--brass)] bg-[var(--brass)]' : 'border-[var(--muted)]'}`} />
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BattleMap
        battle={battle}
        combatants={combatants}
        profile={profile}
        selectedId={selectedCombatantId}
        onSelect={(id) => setSelectedCombatantId((current) => current === id ? null : id)}
        onMove={moveCombatant}
      />

      {isDm && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="surface rounded-2xl p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="eyebrow">DM controls</p><h3 className="font-black">{selectedCombatant?.characters?.name ?? 'Select a token'}</h3></div>
              <button onClick={endBattle} disabled={busy} className="flex items-center gap-2 rounded-xl border border-[#d76a6255] px-3 py-2.5 text-xs font-black text-[var(--red)]"><XCircle size={16} /> End encounter</button>
            </div>
            {selectedCombatant ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--red)]">Health</span><NumberInput className="field px-3 py-2.5" min={0} value={stats.current_hp} onValueChange={(current_hp) => setStats({ ...stats, current_hp })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--blue)]">Mana</span><NumberInput className="field px-3 py-2.5" min={0} value={stats.current_mana} onValueChange={(current_mana) => setStats({ ...stats, current_mana })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Initiative</span><NumberInput className="field px-3 py-2.5" value={stats.initiative} onValueChange={(initiative) => setStats({ ...stats, initiative })} /></label>
                </div>
                {selectedCombatant.characters?.notes && <p className="mt-3 whitespace-pre-line rounded-xl bg-black/20 p-3 text-xs leading-5 text-[var(--muted)]">{selectedCombatant.characters.notes}</p>}
                <button onClick={saveStats} className="teal-button mt-3 w-full rounded-xl px-4 py-3 font-black">Apply changes</button>
              </>
            ) : (
              <p className="surface-soft rounded-xl p-3 text-sm leading-6 text-[var(--muted)]">Tap a token to edit it. Tap that token again to unselect it. Moving a token automatically releases it.</p>
            )}
          </section>

          <form onSubmit={addEnemy} className="surface rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2"><ShieldAlert size={18} className="text-[var(--red)]" /><h3 className="font-black">Add an enemy</h3></div>
              <div className="flex rounded-lg bg-black/20 p-1 text-[10px] font-black">
                <button type="button" onClick={() => switchMode('preset')} className={`rounded-md px-2.5 py-2 ${enemy.mode === 'preset' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Bestiary</button>
                <button type="button" onClick={() => switchMode('custom')} className={`rounded-md px-2.5 py-2 ${enemy.mode === 'custom' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Custom</button>
              </div>
            </div>

            {enemy.mode === 'preset' && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Category</span><select className="field" value={enemy.category} onChange={(e) => switchCategory(e.target.value)}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Enemy</span><select className="field" value={enemy.enemy_key} onChange={(e) => { const asset = availableEnemies.find((entry) => entry.enemy_key === e.target.value); if (asset) useEnemyAsset(asset); }}>{categoryEnemies.map((asset) => <option key={asset.enemy_key} value={asset.enemy_key}>{asset.name}</option>)}</select></label>
              </div>
            )}

            <div className="grid gap-2">
              <input className="field" required value={enemy.name} onChange={(e) => setEnemy({ ...enemy, name: e.target.value })} placeholder="Enemy name" />
              <div className="grid grid-cols-3 gap-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--red)]">Health</span><NumberInput className="field" min={0} value={enemy.hp} onValueChange={(hp) => setEnemy({ ...enemy, hp })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--blue)]">Mana</span><NumberInput className="field" min={0} value={enemy.mana} onValueChange={(mana) => setEnemy({ ...enemy, mana })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--brass)]">Damage</span><NumberInput className="field" min={0} value={enemy.damage} onValueChange={(damage) => setEnemy({ ...enemy, damage })} /></label>
              </div>
              {enemy.notes && <p className="rounded-xl bg-black/20 p-3 text-xs leading-5 text-[var(--muted)]">{enemy.notes}</p>}
              <details className="rounded-xl border border-[var(--line)] p-3">
                <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-[var(--muted)]">Token color</summary>
                <div className="mt-3"><TokenColorPicker compact value={enemy.token_color} onChange={(token_color) => setEnemy({ ...enemy, token_color })} /></div>
              </details>
              <button className="mt-1 flex items-center justify-center gap-2 rounded-xl border border-[#d76a6255] bg-[#d76a6210] px-4 py-3 font-black text-[var(--red)]"><Plus size={17} /> Place {enemy.name || 'enemy'}</button>
            </div>
          </form>
        </div>
      )}

      <section className="surface rounded-2xl p-4">
        <div className="mb-3"><h3 className="font-black">Encounter Roster</h3></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {combatants.map((entry) => {
            const character = entry.characters;
            return (
              <article key={entry.id} className={`rounded-xl border p-3 transition ${selectedCombatantId === entry.id ? 'border-[var(--brass)] bg-[#d1a85b0b]' : 'border-[var(--line)] bg-black/10'}`}>
                <div className="flex items-start gap-2">
                  <button type="button" onClick={() => setSelectedCombatantId((current) => current === entry.id ? null : entry.id)} className="min-w-0 flex-1 text-left">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="truncate font-black">{character?.name ?? 'Unknown'}</span>
                        <span className="shrink-0 rounded-md border border-[var(--line)] bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-[var(--muted)]">{character?.class_name ?? 'Adventurer'}</span>
                      </span>
                      {isDm ? (
                        <label className="shrink-0" onClick={(event) => event.stopPropagation()}>
                          <span className="sr-only">Initiative</span>
                          <NumberInput
                            className="w-16 rounded-md border border-[var(--line)] bg-black/30 px-2 py-1 text-center text-[10px] font-black text-[var(--brass)]"
                            min={1}
                            max={20}
                            emptyFallback={1}
                            value={entry.initiative ?? 1}
                            onValueChange={(initiative) => updateInitiative(entry.id, initiative)}
                            aria-label={`${character?.name ?? 'Token'} initiative`}
                          />
                        </label>
                      ) : (
                        <span className="rounded-md bg-black/30 px-2 py-1 text-[10px] font-black text-[var(--brass)]">INIT {entry.initiative ?? '—'}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><div className="mb-1 flex justify-between text-[10px] font-bold"><span className="flex items-center gap-1 text-[var(--red)]"><Heart size={11} /> HP</span><span>{entry.current_hp}/{character?.max_hp ?? 0}</span></div><div className="stat-bar"><span className="bg-[var(--red)]" style={{ width: `${percent(entry.current_hp, character?.max_hp ?? 1)}%` }} /></div></div>
                      <div><div className="mb-1 flex justify-between text-[10px] font-bold"><span className="flex items-center gap-1 text-[var(--blue)]"><Sparkles size={11} /> Mana</span><span>{entry.current_mana}/{character?.max_mana ?? 0}</span></div><div className="stat-bar"><span className="bg-[var(--blue)]" style={{ width: `${percent(entry.current_mana, character?.max_mana ?? 1)}%` }} /></div></div>
                    </div>
                  </button>
                  {isDm && (
                    <button type="button" onClick={() => removeCombatant(entry.id)} className="rounded-lg border border-[#d76a6255] bg-[#d76a6210] p-2 text-[var(--red)] transition active:scale-95" aria-label={`Remove ${character?.name ?? 'token'} from encounter`}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {combatants.length === 0 && <p className="text-sm text-[var(--muted)]">No one is in this encounter yet.</p>}
        </div>
      </section>

      {!isDm && selectedCombatant?.characters?.owner_user_id === profile.id && (
        <section className="surface rounded-2xl p-4">
          <div className="mb-4">
            <p className="eyebrow">Combat loadout</p>
            <h3 className="mt-1 text-2xl font-black">{selectedCombatant.characters.name}</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Use spells and manage items here. Prepared and dormant spells cannot be swapped until combat ends.</p>
          </div>
          <div className="space-y-5">
            <SpellPanel
              character={{ ...selectedCombatant.characters, current_hp: selectedCombatant.current_hp, current_mana: selectedCombatant.current_mana }}
              canEdit={false}
              combatLocked
              onCharacterChanged={loadBattle}
            />
            <InventoryPanel
              character={{ ...selectedCombatant.characters, current_hp: selectedCombatant.current_hp, current_mana: selectedCombatant.current_mana }}
              canEdit={false}
              profile={profile}
            />
          </div>
        </section>
      )}
    </div>
  );
}
