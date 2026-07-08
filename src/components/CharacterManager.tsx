'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, ChevronDown, Heart, MapPin, PackageOpen, Plus, Sparkles, Trash2, UserPlus, WandSparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import CharacterSheet from '@/components/CharacterSheet';
import Modal from '@/components/Modal';
import NumberInput from '@/components/NumberInput';
import TokenColorPicker from '@/components/TokenColorPicker';
import TradeModal from '@/components/TradeModal';
import { CLASS_PRESETS, DEFAULT_CLASS, classAssetToPreset, getClassPreset } from '@/lib/classPresets';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type CampaignLocation, type Character, type ClassAsset, type Profile } from '@/lib/types';
import { signed } from '@/lib/format';
import { createDebouncedRefresh } from '@/lib/realtime';

const DEFAULT_TOKEN_COLOR = '#4d8f83';

export default function CharacterManager({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const isDm = profile.role === 'dm';
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [classAssets, setClassAssets] = useState<ClassAsset[]>([]);
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [tradeTarget, setTradeTarget] = useState<Character | null>(null);
  const [locationTarget, setLocationTarget] = useState<Character | null>(null);
  const [creating, setCreating] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    class_key: DEFAULT_CLASS.key,
    owner_user_id: '',
    level: 1,
    personal_passives: '',
    token_color: DEFAULT_TOKEN_COLOR
  });

  const availableClasses = classAssets.length > 0 ? classAssets.map(classAssetToPreset) : CLASS_PRESETS;
  const chosenClass = availableClasses.find((entry) => entry.key === form.class_key) ?? availableClasses[0] ?? DEFAULT_CLASS;
  const partyCharacters = useMemo(() => characters.filter((character) => character.kind === 'player'), [characters]);
  const myCharacters = useMemo(() => partyCharacters.filter((character) => character.owner_user_id === profile.id), [partyCharacters, profile.id]);
  const otherCharacters = useMemo(() => partyCharacters.filter((character) => character.owner_user_id !== profile.id), [partyCharacters, profile.id]);
  const visibleCharacters = isDm ? partyCharacters : [...myCharacters, ...otherCharacters];
  const orderedLocations = useMemo(() => [...locations].sort((a, b) => locationRank(a) - locationRank(b) || a.name.localeCompare(b.name)), [locations]);

  async function loadData() {
    await supabase.rpc('ensure_character_locations');
    const [profilesResult, charactersResult, assetsResult, locationsResult] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('characters').select('*').order('created_at', { ascending: false }),
      supabase.from('class_assets').select('*').order('name'),
      supabase.from('campaign_locations').select('*').order('created_at')
    ]);
    if (!profilesResult.error) setProfiles((profilesResult.data ?? []) as Profile[]);
    if (!charactersResult.error) setCharacters((charactersResult.data ?? []) as Character[]);
    if (!assetsResult.error) {
      const loaded = (assetsResult.data ?? []) as ClassAsset[];
      setClassAssets(loaded);
      if (loaded.length > 0 && !loaded.some((entry) => entry.class_key === form.class_key)) {
        setForm((current) => ({ ...current, class_key: loaded[0].class_key }));
      }
    }
    if (!locationsResult.error) setLocations((locationsResult.data ?? []) as CampaignLocation[]);
  }

  useEffect(() => {
    loadData();
    const refreshLedger = createDebouncedRefresh(loadData, 220);
    const channel = supabase
      .channel('character-ledger-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, refreshLedger)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_locations' }, refreshLedger)
      .subscribe();
    return () => {
      refreshLedger.cancel();
      supabase.removeChannel(channel);
    };
  }, []);

  async function createCharacter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isDm || !form.name.trim()) return;
    setCreating(true);
    const preset = availableClasses.find((entry) => entry.key === form.class_key) ?? getClassPreset(form.class_key) ?? DEFAULT_CLASS;
    const defaultLocation = locations.find((entry) => entry.location_key === 'calostrynn') ?? locations[0] ?? null;
    const { data, error } = await supabase
      .from('characters')
      .insert({
        name: form.name.trim(),
        class_key: preset.key,
        class_name: preset.name,
        kind: 'player',
        owner_user_id: form.owner_user_id || null,
        level: Math.max(1, Number(form.level) || 1),
        inventory_slots: preset.inventorySlots,
        spell_slots: preset.spellSlots,
        max_hp: preset.health,
        current_hp: preset.health,
        max_mana: preset.mana,
        current_mana: preset.mana,
        notes: form.personal_passives.trim(),
        token_color: form.token_color,
        attributes: preset.attributes,
        location_id: defaultLocation?.id ?? null
      })
      .select('*')
      .single();

    setCreating(false);
    if (!error && data) {
      setForm({ name: '', class_key: DEFAULT_CLASS.key, owner_user_id: '', level: 1, personal_passives: '', token_color: DEFAULT_TOKEN_COLOR });
      setShowCreator(false);
      setOpenId(data.id);
      await loadData();
    }
  }

  async function updateOwner(characterId: string, ownerUserId: string) {
    await supabase.from('characters').update({ owner_user_id: ownerUserId || null }).eq('id', characterId);
    await loadData();
  }

  function locationFor(character?: Character | null) {
    if (!character) return null;
    return locations.find((entry) => entry.id === character.location_id)
      ?? locations.find((entry) => entry.location_key === 'calostrynn')
      ?? null;
  }

  function locationRank(location: CampaignLocation) {
    const key = location.location_key ?? location.name.toLowerCase();
    if (key === 'calostrynn') return 0;
    if (key === 'wild-party-1' || key === 'wild') return 1;
    if (key === 'wild-party-2' || key === 'wild2') return 2;
    if (key === 'wild-party-3' || key === 'wild3') return 3;
    return 10;
  }

  function locationName(location?: CampaignLocation | null) {
    if (!location) return 'No location';
    if (location.location_key === 'wild-party-1') return 'Wild';
    if (location.location_key === 'wild-party-2') return 'Wild2';
    if (location.location_key === 'wild-party-3') return 'Wild3';
    return location.name;
  }

  async function moveLocation(characterId: string, locationId: string) {
    if (!isDm || !characterId || !locationId) return false;
    setLocationMessage('');
    await supabase.rpc('ensure_character_locations');
    const { data, error } = await supabase.rpc('set_character_location', {
      target_character_id: characterId,
      target_location_id: locationId
    });
    setLocationMessage(error?.message ?? `${data}`);
    if (!error) await loadData();
    return !error;
  }

  async function createLocation(event: React.FormEvent) {
    event.preventDefault();
    if (!isDm || !newLocationName.trim()) return;
    setLocationMessage('');
    const { data, error } = await supabase.rpc('create_campaign_location', { location_name: newLocationName.trim() });
    if (error) return setLocationMessage(error.message);
    if (locationTarget?.id && data) {
      await moveLocation(locationTarget.id, data);
      setLocationTarget(null);
    }
    setNewLocationName('');
    setLocationMessage('Location added.');
    await loadData();
  }

  async function selectLocation(locationId: string) {
    if (!locationTarget?.id) return;
    const moved = await moveLocation(locationTarget.id, locationId);
    if (moved) setLocationTarget(null);
  }

  async function deleteCharacter(character: Character) {
    if (!isDm || !window.confirm(`Permanently delete ${character.name}? Their inventory will also be removed.`)) return;
    await supabase.from('characters').delete().eq('id', character.id);
    if (openId === character.id) setOpenId(null);
    await loadData();
  }

  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Party records</p>
            <h2 className="text-2xl font-black tracking-tight">Character Ledger</h2>
          </div>
          {isDm && (
            <button onClick={() => setShowCreator((value) => !value)} aria-label="New character" className="primary-button flex shrink-0 items-center gap-2 rounded-xl px-3 py-3 text-sm font-black">
              <UserPlus size={17} /> <span className="hidden sm:inline">New character</span>
            </button>
          )}
        </div>
        {false && isDm && (
          <form onSubmit={createLocation} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="hidden">
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Add party location</span>
              <input className="field py-2.5" value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="New city, camp, dungeon…" />
            </label>
            <button className="teal-button flex items-center justify-center gap-2 self-end rounded-xl px-4 py-3 text-sm font-black"><Plus size={16} /> Add location</button>
          </form>
        )}
        {false && locationMessage && <p className="mt-2 text-xs font-bold text-[var(--muted)]">{locationMessage}</p>}
      </section>

      {isDm && showCreator && (
        <form onSubmit={createCharacter} className="surface rounded-2xl p-4 sm:p-5">
          <div className="rule-title mb-4">
            <h3 className="text-base font-black">Create a character</h3>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Character name</span>
              <input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="E.g. Seraphine Vale" />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Class</span>
              <select className="field" value={form.class_key} onChange={(e) => setForm({ ...form, class_key: e.target.value })}>
                {availableClasses.map((preset) => <option key={preset.key} value={preset.key}>{preset.name}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Assigned player</span>
              <select className="field" value={form.owner_user_id} onChange={(e) => setForm({ ...form, owner_user_id: e.target.value })}>
                <option value="">Leave unassigned</option>
                {profiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.display_name}{entry.role === 'dm' ? ' (DM)' : ''}</option>)}
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Starting level</span>
              <NumberInput className="field" min={1} value={form.level} onValueChange={(level) => setForm({ ...form, level })} />
            </label>
          </div>

          <section className="mt-4 rounded-2xl border border-[#d1a85b38] bg-[#d1a85b08] p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Class foundation</p>
                <h4 className="text-xl font-black">{chosenClass.name}</h4>
                <p className="text-xs font-bold text-[var(--muted)]">{chosenClass.type} · {chosenClass.armor}</p>
              </div>
              <WandSparkles className="text-[var(--brass)]" size={22} />
            </div>
            <p className="text-sm leading-6 text-[var(--muted)]">{chosenClass.identity}</p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { icon: Heart, label: 'Health', value: chosenClass.health, color: 'var(--red)' },
                { icon: Sparkles, label: 'Mana', value: chosenClass.mana, color: 'var(--blue)' },
                { icon: PackageOpen, label: 'Inventory', value: `${chosenClass.inventorySlots} slots`, color: 'var(--brass)' },
                { icon: WandSparkles, label: 'Spells', value: `${chosenClass.spellSlots} slots`, color: 'var(--teal)' }
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="surface-soft rounded-xl p-3">
                  <Icon size={15} style={{ color }} />
                  <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{label}</p>
                  <p className="font-black">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {ATTRIBUTE_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between rounded-lg bg-black/15 px-3 py-2 text-xs">
                  <span className="text-[var(--muted)]">{ATTRIBUTE_LABELS[key]}</span>
                  <span className="font-black">{signed(chosenClass.attributes[key])}</span>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[var(--brass)]">Class passives</p>
              <ul className="space-y-2">
                {chosenClass.passives.map((passive) => <li key={passive} className="flex gap-2 text-xs leading-5 text-[var(--muted)]"><span className="text-[var(--brass)]">◆</span>{passive}</li>)}
              </ul>
            </div>
          </section>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_22rem]">
            <label>
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Personal passives / abilities</span>
              <textarea
                className="field min-h-24"
                value={form.personal_passives}
                onChange={(event) => setForm({ ...form, personal_passives: event.target.value })}
                placeholder="Optional. One passive or ability per line."
              />
            </label>
            <div className="surface-soft rounded-xl p-3">
              <span className="mb-1.5 block text-xs font-black uppercase tracking-wider text-[var(--muted)]">Token color</span>
              <TokenColorPicker value={form.token_color} onChange={(token_color) => setForm({ ...form, token_color })} />
            </div>
          </div>

          <button disabled={creating} className="primary-button mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-4 font-black disabled:opacity-60">
            <Plus size={18} /> {creating ? 'Creating character…' : `Create ${chosenClass.name}`}
          </button>
        </form>
      )}

      <div className="grid gap-3">
        {visibleCharacters.length === 0 && (
          <div className="surface rounded-2xl p-5 text-sm text-[var(--muted)]">
            {isDm ? 'The ledger is empty. Create the first member of the party.' : 'The DM has not assigned a character to you yet.'}
          </div>
        )}

        {visibleCharacters.map((character, index) => {
          const owner = profiles.find((entry) => entry.id === character.owner_user_id);
          const location = locationFor(character);
          const open = openId === character.id;
          const mine = character.owner_user_id === profile.id;
          const sectionTitle = isDm
            ? index === 0 ? 'Party Characters' : ''
            : index === 0 && myCharacters.length > 0 ? 'Your Characters'
            : index === myCharacters.length ? 'Other Characters' : '';
          return (
            <div key={character.id}>
              {sectionTitle && <div className="mb-2 mt-4 flex items-center gap-3"><h3 className="text-sm font-black uppercase tracking-wider text-[var(--brass)]">{sectionTitle}</h3><span className="h-px flex-1 bg-gradient-to-r from-[#e0a64e66] to-transparent" /></div>}
            <article className={`surface overflow-hidden rounded-2xl p-4 ${!isDm && !mine ? 'border-[#7fa7b238]' : ''}`}>
              <div className="flex w-full flex-wrap items-center gap-3">
                <button onClick={() => setOpenId(open ? null : character.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white/20 font-black" style={{ backgroundColor: character.token_color }}>
                  {character.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-black">{character.name}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">Level {character.level ?? 1} {character.class_name} · {owner?.display_name ?? 'Unassigned'}</span>
                  <span className="mt-2 flex max-w-sm gap-3 text-[11px] font-bold">
                    <span className="text-[var(--red)]">HP {character.current_hp}/{character.max_hp}</span>
                    <span className="text-[var(--blue)]">Mana {character.current_mana}/{character.max_mana}</span>
                  </span>
                </span>
                </button>
                {isDm ? (
                  <button type="button" onClick={() => { setLocationTarget(character); setLocationMessage(''); }} className="flex max-w-full items-center gap-1 rounded-full border border-[#e0a64e3a] bg-[#e0a64e13] px-3 py-2 text-[11px] font-black text-[var(--brass)]">
                    <MapPin size={12} /><span className="truncate">{location ? locationName(location) : owner ? 'Calostrynn' : 'No location'}</span>
                  </button>
                ) : (
                  <span className="flex max-w-full items-center gap-1 rounded-full border border-[#e0a64e28] bg-black/15 px-3 py-2 text-[11px] font-black text-[var(--brass)]">
                    <MapPin size={12} /><span className="truncate">{location ? locationName(location) : owner ? 'Calostrynn' : 'No location'}</span>
                  </span>
                )}
                <button onClick={() => setOpenId(open ? null : character.id)} className="shrink-0 rounded-full p-2 text-[var(--muted)]" aria-label={`${open ? 'Close' : 'Open'} ${character.name}`}>
                  <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} size={20} />
                </button>
              </div>

              {open && (
                <>
                  {isDm && (
                    <div className="mt-4 grid gap-2 rounded-xl bg-black/20 p-3 sm:grid-cols-[1fr_auto]">
                      <label>
                        <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Assigned account</span>
                        <select className="field py-2.5" value={character.owner_user_id ?? ''} onChange={(e) => updateOwner(character.id, e.target.value)}>
                          <option value="">Unassigned</option>
                          {profiles.map((entry) => <option key={entry.id} value={entry.id}>{entry.display_name}{entry.role === 'dm' ? ' (DM)' : ''}</option>)}
                        </select>
                      </label>
                      <button onClick={() => deleteCharacter(character)} className="self-end rounded-xl border border-[#d76a6245] p-3 text-[var(--red)]" aria-label={`Delete ${character.name}`}><Trash2 size={17} /></button>
                    </div>
                  )}
                  {!mine && myCharacters.length > 0 && (
                    <button onClick={() => setTradeTarget(character)} className="teal-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><ArrowRightLeft size={17} /> Propose trade</button>
                  )}
                  <CharacterSheet character={character} canEdit={isDm} readOnly={!isDm && !mine} profile={profile} onSaved={loadData} />
                </>
              )}
            </article>
            </div>
          );
        })}
      </div>
      {locationTarget && (
        <Modal onClose={() => setLocationTarget(null)}>
          <div className="surface max-h-[88vh] w-[min(92vw,30rem)] overflow-y-auto rounded-2xl p-4 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Character location</p>
                <h3 className="text-xl font-black">{locationTarget.name}</h3>
                <p className="mt-1 text-xs font-bold text-[var(--muted)]">Move this character without moving anyone else.</p>
              </div>
              <button onClick={() => setLocationTarget(null)} className="rounded-full border border-white/10 p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>

            <div className="grid gap-2">
              {orderedLocations.map((entry) => {
                const active = locationFor(locationTarget)?.id === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => selectLocation(entry.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-black transition disabled:opacity-50 ${active ? 'border-[var(--brass)] bg-[#e0a64e24] text-[var(--paper)]' : 'border-[#e0a64e26] bg-black/15 text-[var(--muted)] hover:border-[#e0a64e55]'}`}
                  >
                    <span className="flex items-center gap-2"><MapPin size={15} className="text-[var(--brass)]" /> {locationName(entry)}</span>
                    {active && <span className="text-[10px] uppercase tracking-wider text-[var(--brass)]">Current</span>}
                  </button>
                );
              })}
            </div>

            <form onSubmit={createLocation} className="mt-4 rounded-xl border border-[#e0a64e2e] bg-black/15 p-3">
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Custom location</span>
                <input className="field py-2.5" value={newLocationName} onChange={(event) => setNewLocationName(event.target.value)} placeholder="New city, camp, dungeonâ€¦" />
              </label>
              <button className="teal-button mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black"><Plus size={16} /> Add and move here</button>
            </form>
            {locationMessage && <p className="mt-3 text-xs font-bold text-[var(--muted)]">{locationMessage}</p>}
          </div>
        </Modal>
      )}
      {tradeTarget && <TradeModal profile={profile} targetCharacter={tradeTarget} onClose={() => setTradeTarget(null)} />}
    </div>
  );
}
