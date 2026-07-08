'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Compass, Landmark, LogOut, PawPrint, ScrollText, Settings2, Shield, Swords } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import NotificationHub from '@/components/NotificationHub';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Profile } from '@/lib/types';

function PanelLoading({ label }: { label: string }) {
  return (
    <section className="surface rounded-2xl p-5">
      <p className="eyebrow">{label}</p>
      <div className="mt-4 h-24 animate-pulse rounded-2xl bg-black/20" />
    </section>
  );
}

const BattleRoom = dynamic(() => import('@/components/BattleRoom'), { loading: () => <PanelLoading label="Battlefield" />, ssr: false });
const CharacterManager = dynamic(() => import('@/components/CharacterManager'), { loading: () => <PanelLoading label="Characters" />, ssr: false });
const CitiesPanel = dynamic(() => import('@/components/CitiesPanel'), { loading: () => <PanelLoading label="Discovered Cities" />, ssr: false });
const BestiaryPanel = dynamic(() => import('@/components/BestiaryPanel'), { loading: () => <PanelLoading label="Bestiary" />, ssr: false });
const ExplorationPanel = dynamic(() => import('@/components/ExplorationPanel'), { loading: () => <PanelLoading label="Exploration" />, ssr: false });
const PersonalScroll = dynamic(() => import('@/components/PersonalScroll'), { loading: () => <PanelLoading label="Personal Scroll" />, ssr: false });
const AssetsManager = dynamic(() => import('@/components/AssetsManager'), { loading: () => <PanelLoading label="Update Assets" />, ssr: false });

export default function Dashboard({ profile, userEmail }: { profile: Profile; userEmail: string }) {
  const [tab, setTab] = useState<'battle' | 'characters' | 'cities' | 'bestiary' | 'exploration' | 'scroll' | 'assets'>('battle');
  const [activeBattle, setActiveBattle] = useState(false);
  const router = useRouter();
  const isDm = profile.role === 'dm';
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    async function checkBattle() {
      const { data } = await supabase.from('battles').select('id').eq('status', 'active').limit(1).maybeSingle();
      const active = Boolean(data);
      setActiveBattle(active);
      if (active && !isDm) setTab('battle');
    }
    checkBattle();
    const refreshBattleLock = createDebouncedRefresh(checkBattle, 160);
    const channel = supabase.channel('dashboard-battle-lock').on('postgres_changes', { event: '*', schema: 'public', table: 'battles' }, refreshBattleLock).subscribe();
    return () => {
      refreshBattleLock.cancel();
      supabase.removeChannel(channel);
    };
  }, [isDm, supabase]);

  async function signOut() {
    await createClient().auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="app-shell min-h-screen text-[var(--paper)]">
      <header className="campaign-header sticky top-0 z-40 border-b px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="eyebrow">{isDm ? 'Dungeon Master' : 'Party Member'}</span>
              {isDm && <Shield size={13} className="text-[var(--brass)]" />}
            </div>
            <h1 className="truncate text-lg font-black tracking-tight">{profile.display_name}</h1>
          </div>
          <div className="flex gap-2">
            <NotificationHub profile={profile} />
            <button onClick={signOut} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-[var(--muted)] transition active:scale-95" aria-label="Log out">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <section className={`mx-auto max-w-6xl px-4 py-4 ${activeBattle && !isDm ? 'pb-8' : isDm ? 'pb-28 sm:pb-32' : 'pb-32'}`}>
        {tab === 'battle' && <BattleRoom profile={profile} />}
        {tab === 'characters' && <CharacterManager profile={profile} />}
        {tab === 'cities' && <CitiesPanel profile={profile} />}
        {tab === 'bestiary' && <BestiaryPanel profile={profile} />}
        {tab === 'exploration' && isDm && <ExplorationPanel profile={profile} />}
        {tab === 'scroll' && <PersonalScroll profile={profile} />}
        {tab === 'assets' && isDm && <AssetsManager profile={profile} />}
      </section>

      {(!activeBattle || isDm) && <nav className="campaign-nav fixed bottom-0 left-0 right-0 z-50 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pt-3">
        <div className={isDm ? 'thin-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto sm:grid sm:grid-cols-7' : 'mx-auto grid max-w-4xl grid-cols-5 gap-1'}>
          {[
            { id: 'battle' as const, label: 'Battlefield', icon: Swords },
            { id: 'characters' as const, label: 'Characters', icon: BookOpen },
            { id: 'cities' as const, label: 'Discovered Cities', icon: Landmark },
            { id: 'bestiary' as const, label: 'Bestiary', icon: PawPrint },
            ...(isDm ? [
              { id: 'exploration' as const, label: 'Exploration', icon: Compass },
              { id: 'scroll' as const, label: 'Personal Scroll', icon: ScrollText },
              { id: 'assets' as const, label: 'Update Assets', icon: Settings2 }
            ] : [
              { id: 'scroll' as const, label: 'Personal Scroll', icon: ScrollText }
            ])
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex ${isDm ? 'min-w-[4.6rem] sm:min-w-0' : 'min-w-0'} flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[9px] font-black leading-tight transition sm:flex-row sm:px-3 sm:py-3 sm:text-sm ${
                tab === id ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'
              }`}
            >
              <Icon size={17} /> {label}
            </button>
          ))}
        </div>
      </nav>}
    </main>
  );
}
