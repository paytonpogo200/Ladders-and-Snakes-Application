'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, MoonStar, Plus, Sparkles, WandSparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Character, CharacterSpell, Spell } from '@/lib/types';

export default function SpellPanel({
  character,
  canEdit,
  onCharacterChanged,
  combatLocked = false,
  readOnly = false
}: {
  character: Character;
  canEdit: boolean;
  onCharacterChanged: () => void;
  combatLocked?: boolean;
  readOnly?: boolean;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [knownSpells, setKnownSpells] = useState<CharacterSpell[]>([]);
  const [catalog, setCatalog] = useState<Spell[]>([]);
  const [grantSpellId, setGrantSpellId] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  async function loadSpells() {
    const requests = [
      supabase.from('character_spells').select('*, spells(*)').eq('character_id', character.id).order('prepared_slot'),
      canEdit ? supabase.from('spells').select('*').order('category').order('name') : Promise.resolve({ data: [], error: null })
    ] as const;
    const [knownResult, catalogResult] = await Promise.all(requests);
    if (!knownResult.error) setKnownSpells((knownResult.data ?? []) as CharacterSpell[]);
    if (!catalogResult.error) {
      const loaded = (catalogResult.data ?? []) as Spell[];
      setCatalog(loaded);
      if (!grantSpellId && loaded[0]) setGrantSpellId(loaded[0].id);
    }
  }

  useEffect(() => {
    loadSpells();
    const refreshSpells = createDebouncedRefresh(loadSpells, 160);
    const channel = supabase
      .channel(`character-spells-${character.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_spells', filter: `character_id=eq.${character.id}` }, refreshSpells)
      .subscribe();
    return () => {
      refreshSpells.cancel();
      supabase.removeChannel(channel);
    };
  }, [character.id]);

  const prepared = Array.from({ length: character.spell_slots }, (_, slot) =>
    knownSpells.find((entry) => entry.prepared_slot === slot)
  );
  const dormant = knownSpells.filter((entry) =>
    entry.prepared_slot === null || entry.prepared_slot >= character.spell_slots
  );
  const unknownCatalog = catalog.filter((spell) => !knownSpells.some((entry) => entry.spell_id === spell.id));

  async function setPrepared(entry: CharacterSpell, desiredSlot: number | null) {
    setBusyId(entry.id);
    setMessage('');
    const { error } = await supabase.rpc('set_character_spell_prepared', {
      target_character_spell_id: entry.id,
      desired_slot: desiredSlot
    });
    setBusyId('');
    setMessage(error ? error.message : desiredSlot === null ? 'Spell moved to dormant knowledge.' : `Spell prepared in slot ${desiredSlot + 1}.`);
    if (!error) await loadSpells();
  }

  async function useSpell(entry: CharacterSpell) {
    const spell = entry.spells;
    if (!spell) return;
    let override: number | null = null;
    if (spell.mana_label === '3d20 Mana') {
      const entered = window.prompt('Enter the 3d20 Mana result (3–60):');
      if (entered === null) return;
      override = Number(entered);
    }

    setBusyId(entry.id);
    setMessage('');
    const { data, error } = await supabase.rpc('use_character_spell', {
      target_character_spell_id: entry.id,
      mana_spent_override: override
    });
    setBusyId('');
    setMessage(error ? error.message : `${spell.name} used. ${data} Mana remains.`);
    if (!error) onCharacterChanged();
  }

  async function grantSpell() {
    if (!grantSpellId) return;
    const { error } = await supabase.rpc('dm_grant_spell', {
      target_character_id: character.id,
      target_spell_id: grantSpellId
    });
    setMessage(error ? error.message : 'Spell granted.');
    if (!error) await loadSpells();
  }

  function SpellCard({ entry, slot }: { entry: CharacterSpell; slot?: number }) {
    const spell = entry.spells;
    if (!spell) return null;
    return (
      <article className="surface-soft rounded-xl p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--brass)]">{spell.category}</p>
            <h5 className="mt-1 font-black">{spell.name}</h5>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{spell.description}</p>
          </div>
          <span className="shrink-0 rounded-lg border border-[#7fa7b244] bg-[#7fa7b210] px-2 py-1 text-[10px] font-black text-[var(--blue)]">{spell.mana_label}</span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {readOnly ? (
            <span className="col-span-2 flex items-center justify-center rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--muted)]">View only</span>
          ) : combatLocked ? (
            <span className="col-span-2 flex items-center justify-center rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--muted)]">Locked in combat</span>
          ) : slot === undefined ? (
            <span className="flex items-center justify-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--muted)]"><MoonStar size={14} /> Dormant</span>
          ) : (
            <button onClick={() => useSpell(entry)} disabled={busyId === entry.id} className="primary-button flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-black disabled:opacity-45">
              <Sparkles size={14} /> Use spell
            </button>
          )}
          {!readOnly && !combatLocked && (slot === undefined ? (
            character.spell_slots > 0 ? (
              <select
                className="field py-2 text-xs"
                value=""
                onChange={(event) => event.target.value && setPrepared(entry, Number(event.target.value))}
                disabled={!!busyId}
                aria-label={`Prepare ${spell.name}`}
              >
                <option value="">Prepare…</option>
                {Array.from({ length: character.spell_slots }, (_, index) => <option key={index} value={index}>Slot {index + 1}</option>)}
              </select>
            ) : <span className="flex items-center justify-center text-xs text-[var(--muted)]">No spell slots</span>
          ) : (
            <button onClick={() => setPrepared(entry, null)} disabled={!!busyId} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--muted)]">
              Move dormant
            </button>
          ))}
        </div>
      </article>
    );
  }

  return (
    <section>
      <div className="rule-title mb-3">
        <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><WandSparkles size={16} /> Spellbook</h4>
      </div>

      <div className="mb-2 flex items-center justify-end text-xs text-[var(--muted)]">
        <span className="font-black">{knownSpells.filter((entry) => entry.prepared_slot !== null && entry.prepared_slot < character.spell_slots).length}/{character.spell_slots}</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {prepared.map((entry, slot) => entry ? (
          <SpellCard key={entry.id} entry={entry} slot={slot} />
        ) : (
          <div key={slot} className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-[var(--line)] bg-black/10 p-3 text-center">
            <span><MoonStar className="mx-auto mb-2 text-[var(--muted)]" size={19} /><span className="text-xs font-black text-[var(--muted)]">Spell slot {slot + 1}</span></span>
          </div>
        ))}
      </div>

      {dormant.length > 0 && (
        <details className="surface-soft mt-4 rounded-2xl" open>
          <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
            <BookOpen size={18} className="text-[var(--brass)]" />
            <span className="flex-1 font-black">Dormant spells</span>
            <span className="rounded-full border border-[var(--line)] px-2 py-1 text-[10px] font-black text-[var(--muted)]">{dormant.length}</span>
          </summary>
          <div className="grid gap-2 border-t border-[#e0a64e22] p-3 sm:grid-cols-2">
            {dormant.map((entry) => <SpellCard key={entry.id} entry={entry} />)}
          </div>
        </details>
      )}

      {canEdit && !combatLocked && unknownCatalog.length > 0 && (
        <div className="mt-4 rounded-xl border border-[#e0a64e33] bg-[#e0a64e09] p-3">
          <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-[var(--brass)]">DM spell grant</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <select className="field" value={grantSpellId} onChange={(event) => setGrantSpellId(event.target.value)}>
              {unknownCatalog.map((spell) => <option key={spell.id} value={spell.id}>{spell.category} · {spell.name}</option>)}
            </select>
            <button onClick={grantSpell} className="teal-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Plus size={16} /> Grant spell</button>
          </div>
        </div>
      )}

      {message && <p className="mt-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs text-[var(--muted)]">{message}</p>}
    </section>
  );
}
