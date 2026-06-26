'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookMarked, ChevronDown, Eye, EyeOff, Search, ShieldAlert } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_ENEMY_ASSETS } from '@/lib/enemyPresets';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { EnemyAsset, Profile } from '@/lib/types';

export default function BestiaryPanel({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const isDm = profile.role === 'dm';
  const [enemies, setEnemies] = useState<EnemyAsset[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ unlocked: 0, total: 0 });

  const discovered = enemies.filter((enemy) => enemy.is_discovered);
  const categories = Array.from(new Set(discovered.map((enemy) => enemy.category)));
  const filtered = discovered.filter((enemy) =>
    (category === 'All' || enemy.category === category)
    && (!search.trim() || `${enemy.name} ${enemy.category} ${enemy.notes}`.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const grouped = filtered.reduce<Record<string, EnemyAsset[]>>((groups, enemy) => {
    (groups[enemy.category] ??= []).push(enemy);
    return groups;
  }, {});
  const allGrouped = enemies.reduce<Record<string, EnemyAsset[]>>((groups, enemy) => {
    (groups[enemy.category] ??= []).push(enemy);
    return groups;
  }, {});

  async function loadData() {
    const [{ data, error }, progressResult] = await Promise.all([
      supabase.from('enemy_assets').select('*').order('category').order('name'),
      supabase.rpc('bestiary_progress')
    ]);
    if (!error) setEnemies((data ?? []) as EnemyAsset[]);
    if (!progressResult.error && progressResult.data?.[0]) {
      setProgress(progressResult.data[0] as { unlocked: number; total: number });
    }
  }

  useEffect(() => {
    loadData();
    const refreshBestiary = createDebouncedRefresh(loadData, 220);
    const channel = supabase
      .channel('bestiary-discovery-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enemy_assets' }, refreshBestiary)
      .subscribe();
    return () => {
      refreshBestiary.cancel();
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadDefaults() {
    setBusy(true);
    setMessage('');
    const { error } = await supabase
      .from('enemy_assets')
      .upsert(DEFAULT_ENEMY_ASSETS, { onConflict: 'enemy_key', ignoreDuplicates: true });
    setBusy(false);
    setMessage(error?.message ?? 'Bestiary loaded. Every creature remains hidden until you reveal it.');
    if (!error) await loadData();
  }

  async function setDiscovery(enemy: EnemyAsset, is_discovered: boolean) {
    await supabase.from('enemy_assets').update({ is_discovered }).eq('enemy_key', enemy.enemy_key);
    await loadData();
  }

  async function setCategoryDiscovery(categoryName: string, is_discovered: boolean) {
    await supabase.from('enemy_assets').update({ is_discovered }).eq('category', categoryName);
    await loadData();
  }

  return (
    <div className="space-y-4">
      <section className="surface overflow-hidden rounded-2xl">
        <div className="relative p-5 sm:p-7">
          <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#d1a85b0b] blur-3xl" />
          <p className="eyebrow mb-2">Field notes & known creatures</p>
          <h2 className="text-3xl font-black tracking-[-0.035em]">Bestiary</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d1a85b35] bg-[#d1a85b08] px-3 py-1.5 text-xs font-black text-[var(--brass)]">{progress.unlocked} of {progress.total} unlocked</span>
            <span className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">{categories.length} known groups</span>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-[10px] font-black uppercase tracking-wider text-[var(--muted)]"><span>Bestiary progress</span><span>{progress.total > 0 ? Math.round((progress.unlocked / progress.total) * 100) : 0}%</span></div>
            <div className="stat-bar h-2"><span className="bg-gradient-to-r from-[#9caf79] to-[#e0a64e]" style={{ width: `${progress.total > 0 ? (progress.unlocked / progress.total) * 100 : 0}%` }} /></div>
          </div>
        </div>
      </section>

      {isDm && enemies.length === 0 && (
        <section className="rounded-2xl border border-[#d1a85b45] bg-[#d1a85b0a] p-4">
          <h3 className="font-black">Prepare the Bestiary</h3>
          <button onClick={loadDefaults} disabled={busy} className="primary-button mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black disabled:opacity-50">
            <BookMarked size={17} /> {busy ? 'Loading…' : 'Load Bestiary'}
          </button>
        </section>
      )}

      {isDm && enemies.length > 0 && (
        <details className="surface rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
            <span className="rounded-xl bg-[#d1a85b12] p-2.5 text-[var(--brass)]"><Eye size={19} /></span>
            <span className="min-w-0 flex-1"><span className="block font-black">Manage party discoveries</span><span className="block text-xs text-[var(--muted)]">Choose which entries are visible to everyone.</span></span>
            <ChevronDown size={19} className="text-[var(--muted)]" />
          </summary>
          <div className="space-y-3 border-t border-white/[0.07] p-3">
            {Object.entries(allGrouped).map(([categoryName, entries]) => {
              const knownCount = entries.filter((entry) => entry.is_discovered).length;
              return (
                <details key={categoryName} className="surface-soft rounded-xl">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
                    <span><span className="block font-black">{categoryName}</span><span className="text-xs text-[var(--muted)]">{knownCount}/{entries.length} visible</span></span>
                    <span className="flex gap-1">
                      <button type="button" onClick={(event) => { event.preventDefault(); setCategoryDiscovery(categoryName, true); }} className="rounded-lg border border-[#63b5a544] p-2 text-[var(--teal)]" aria-label={`Reveal all ${categoryName}`}><Eye size={14} /></button>
                      <button type="button" onClick={(event) => { event.preventDefault(); setCategoryDiscovery(categoryName, false); }} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]" aria-label={`Hide all ${categoryName}`}><EyeOff size={14} /></button>
                    </span>
                  </summary>
                  <div className="grid gap-1 border-t border-white/[0.06] p-2 sm:grid-cols-2">
                    {entries.map((enemy) => (
                      <button key={enemy.enemy_key} onClick={() => setDiscovery(enemy, !enemy.is_discovered)} className={`flex items-center gap-3 rounded-lg border p-2.5 text-left ${enemy.is_discovered ? 'border-[#63b5a544] bg-[#63b5a50a]' : 'border-[var(--line)] bg-black/10'}`}>
                        <span className="h-8 w-8 shrink-0 rounded-full border border-white/15" style={{ backgroundColor: enemy.token_color }} />
                        <span className="min-w-0 flex-1 truncate text-sm font-black">{enemy.name}</span>
                        {enemy.is_discovered ? <Eye size={15} className="text-[var(--teal)]" /> : <EyeOff size={15} className="text-[var(--muted)]" />}
                      </button>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </details>
      )}

      {discovered.length === 0 ? (
        <section className="surface rounded-2xl p-8 text-center">
          <ShieldAlert className="mx-auto text-[var(--muted)]" size={30} />
          <h3 className="mt-4 text-xl font-black">The pages are still blank.</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            {isDm ? 'Reveal creatures from the discovery menu as the party encounters them.' : 'The party has not documented any creatures yet.'}
          </p>
        </section>
      ) : (
        <>
          <section className="surface rounded-2xl p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_13rem]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input className="field pl-12" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search known creatures…" />
              </label>
              <select className="field" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option>All</option>
                {categories.map((entry) => <option key={entry}>{entry}</option>)}
              </select>
            </div>
          </section>

          {Object.entries(grouped).map(([categoryName, entries]) => (
            <section key={categoryName}>
              <div className="rule-title mb-3"><h3 className="text-sm font-black uppercase tracking-wider">{categoryName}</h3></div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {entries.map((enemy) => (
                  <article key={enemy.enemy_key} className="surface overflow-hidden rounded-2xl">
                    <div className="h-1.5" style={{ backgroundColor: enemy.token_color }} />
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 text-lg font-black" style={{ backgroundColor: enemy.token_color }}>{enemy.name.slice(0, 1)}</span>
                        <div className="min-w-0"><h4 className="text-lg font-black leading-tight">{enemy.name}</h4><p className="mt-1 text-xs text-[var(--muted)]">{enemy.category}</p></div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] font-black uppercase text-[var(--red)]">Health</p><p className="font-black">{enemy.health}</p></div>
                        <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] font-black uppercase text-[var(--brass)]">Damage</p><p className="font-black">{enemy.damage}</p></div>
                        <div className="rounded-xl bg-black/20 p-2"><p className="text-[9px] font-black uppercase text-[var(--blue)]">Mana</p><p className="font-black">{enemy.mana}</p></div>
                      </div>
                      {enemy.notes && <p className="mt-3 text-xs leading-5 text-[var(--muted)]">{enemy.notes}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {message && <p className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
