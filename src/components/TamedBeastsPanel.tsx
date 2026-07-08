'use client';

import { useEffect, useMemo, useState } from 'react';
import { PawPrint, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NumberInput from '@/components/NumberInput';
import TokenColorPicker from '@/components/TokenColorPicker';
import Modal from '@/components/Modal';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Character, Profile, TamedBeast } from '@/lib/types';

export default function TamedBeastsPanel({ character, profile, readOnly = false }: { character: Character; profile: Profile; readOnly?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [beasts, setBeasts] = useState<TamedBeast[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', wild: 1, hp: 10, mana: 0, color: '#7aa36b' });
  const isDm = profile.role === 'dm';

  async function load() {
    const [beastResult, characterResult] = await Promise.all([
      supabase.from('tamed_beasts').select('*').eq('beastmaster_character_id', character.id).order('created_at'),
      supabase.from('characters').select('*')
    ]);
    if (beastResult.error) return setMessage(beastResult.error.message);
    const companions = new Map(((characterResult.data ?? []) as Character[]).map((entry) => [entry.id, entry]));
    setBeasts(((beastResult.data ?? []) as TamedBeast[]).map((entry) => ({ ...entry, battle_character: companions.get(entry.battle_character_id) ?? null })));
  }

  useEffect(() => {
    load();
    const refreshBeasts = createDebouncedRefresh(load, 180);
    const channel = supabase.channel(`tamed-beasts-${character.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tamed_beasts', filter: `beastmaster_character_id=eq.${character.id}` }, refreshBeasts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, refreshBeasts)
      .subscribe();
    return () => {
      refreshBeasts.cancel();
      supabase.removeChannel(channel);
    };
  }, [character.id]);

  async function toggle(beast: TamedBeast) {
    const { data, error } = await supabase.rpc('set_tamed_beast_active', { target_beast_id: beast.id, desired_active: !beast.is_active });
    setMessage(error?.message ?? String(data));
    if (!error) await load();
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase.rpc('create_tamed_beast', {
      target_beastmaster_id: character.id,
      beast_name: form.name.trim(),
      beast_wild_score: Math.max(1, Math.min(20, form.wild || 1)),
      beast_hp: Math.max(0, form.hp || 0),
      beast_mana: Math.max(0, form.mana || 0),
      beast_token_color: form.color
    });
    if (error) return setMessage(error.message);
    setShowAdd(false);
    setForm({ name: '', wild: 1, hp: 10, mana: 0, color: '#7aa36b' });
    await load();
  }

  async function remove(beast: TamedBeast) {
    if (!window.confirm(`Remove ${beast.name}?`)) return;
    const { error } = await supabase.rpc('delete_tamed_beast', { target_beast_id: beast.id });
    setMessage(error?.message ?? 'Tamed beast removed.');
    if (!error) await load();
  }

  const active = beasts.filter((entry) => entry.is_active);
  const inactive = beasts.filter((entry) => !entry.is_active);
  const wildTotal = active.reduce((sum, entry) => sum + entry.wild_score, 0);

  function BeastCard({ beast }: { beast: TamedBeast }) {
    return (
      <article className={`rounded-xl border p-3 ${beast.is_active ? 'border-[var(--teal)] bg-[#9caf7910]' : 'border-[var(--line)] bg-black/15'}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 font-black" style={{ backgroundColor: beast.battle_character?.token_color ?? '#7aa36b' }}>{beast.name[0]}</span>
          <div className="min-w-0 flex-1"><h5 className="truncate font-black">{beast.name}</h5><p className="text-xs text-[var(--muted)]">Wild {beast.wild_score} · {beast.battle_character?.current_hp ?? 0} HP</p></div>
          {isDm && <button onClick={() => remove(beast)} className="p-2 text-[var(--red)]"><Trash2 size={15} /></button>}
        </div>
        {!readOnly && <button onClick={() => toggle(beast)} className={`mt-3 w-full rounded-lg border px-3 py-2 text-xs font-black ${beast.is_active ? 'border-[var(--teal)] text-[var(--teal)]' : 'border-[var(--line)] text-[var(--muted)]'}`}>
          {beast.is_active ? 'Move inactive' : 'Make active'}
        </button>}
      </article>
    );
  }

  return (
    <section>
      <div className="rule-title mb-3"><h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><PawPrint size={16} /> Tamed Beasts</h4></div>
      <div className="mb-3 flex items-center justify-between rounded-xl border border-[var(--line)] bg-black/20 p-3">
        <span><span className="block text-xs font-black uppercase text-[var(--muted)]">Active Wild score</span><span className="text-xl font-black">{wildTotal} / 20</span></span>
        {isDm && <button onClick={() => setShowAdd(true)} className="teal-button flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-black"><Plus size={16} /> Add beast</button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">{active.map((beast) => <BeastCard key={beast.id} beast={beast} />)}</div>
      {inactive.length > 0 && <details className="surface-soft mt-3 rounded-xl" open><summary className="cursor-pointer p-3 font-black">Inactive beasts ({inactive.length})</summary><div className="grid gap-2 border-t border-[var(--line)] p-3 sm:grid-cols-2">{inactive.map((beast) => <BeastCard key={beast.id} beast={beast} />)}</div></details>}
      {beasts.length === 0 && <p className="surface-soft rounded-xl p-4 text-sm text-[var(--muted)]">No tamed beasts have joined this Beastmaster yet.</p>}
      {message && <p className="mt-2 rounded-xl border border-[var(--line)] p-3 text-xs text-[var(--muted)]">{message}</p>}

      {showAdd && (
        <Modal onClose={() => setShowAdd(false)}>
          <form onSubmit={add} className="surface w-full max-w-lg rounded-2xl p-4">
            <div className="flex items-center justify-between"><h3 className="text-xl font-black">Add tamed beast</h3><button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-[var(--line)] p-2"><X size={16} /></button></div>
            <input className="field mt-3" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Beast name" />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label><span className="text-[10px] font-black uppercase text-[var(--muted)]">Wild</span><NumberInput className="field mt-1" min={1} max={20} value={form.wild} onValueChange={(wild) => setForm({ ...form, wild })} /></label>
              <label><span className="text-[10px] font-black uppercase text-[var(--muted)]">Health</span><NumberInput className="field mt-1" min={0} value={form.hp} onValueChange={(hp) => setForm({ ...form, hp })} /></label>
              <label><span className="text-[10px] font-black uppercase text-[var(--muted)]">Mana</span><NumberInput className="field mt-1" min={0} value={form.mana} onValueChange={(mana) => setForm({ ...form, mana })} /></label>
            </div>
            <div className="mt-3"><TokenColorPicker compact value={form.color} onChange={(color) => setForm({ ...form, color })} /></div>
            <button className="primary-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><ShieldCheck size={17} /> Add companion</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
