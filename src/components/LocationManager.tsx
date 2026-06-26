'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/Modal';
import type { CampaignLocation, PlayerLocation, Profile } from '@/lib/types';

export default function LocationManager({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [playerLocations, setPlayerLocations] = useState<PlayerLocation[]>([]);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState('');
  const isDm = profile.role === 'dm';

  async function load() {
    await supabase.rpc('ensure_player_locations');
    const [profileResult, locationResult, playerResult] = await Promise.all([
      supabase.from('profiles').select('*').order('display_name'),
      supabase.from('campaign_locations').select('*').order('created_at'),
      supabase.from('player_locations').select('*')
    ]);
    if (!profileResult.error) setProfiles((profileResult.data ?? []) as Profile[]);
    if (!locationResult.error) setLocations((locationResult.data ?? []) as CampaignLocation[]);
    if (!playerResult.error) setPlayerLocations((playerResult.data ?? []) as PlayerLocation[]);
  }

  useEffect(() => {
    load();
    const channel = supabase.channel('campaign-location-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_locations' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_locations' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function locationFor(userId: string) {
    const row = playerLocations.find((entry) => entry.user_id === userId);
    return locations.find((entry) => entry.id === row?.location_id) ?? null;
  }

  async function move(userId: string, locationId: string) {
    const { data, error } = await supabase.rpc('set_player_location', { target_user_id: userId, target_location_id: locationId });
    setMessage(error?.message ?? `${data}`);
    if (!error) await load();
  }

  async function createLocation() {
    if (!newName.trim()) return;
    const { data, error } = await supabase.rpc('create_campaign_location', { location_name: newName.trim() });
    if (error) return setMessage(error.message);
    setNewName('');
    setMessage('Location added.');
    await load();
    return data;
  }

  const ownLocation = locationFor(profile.id);

  return (
    <>
      <button onClick={() => isDm && setOpen(true)} className={`flex items-center gap-2 rounded-full border border-[#e0a64e35] bg-black/20 px-3 py-1.5 text-xs font-black ${isDm ? 'cursor-pointer' : 'cursor-default'}`}>
        <MapPin size={13} className="text-[var(--brass)]" /> {ownLocation?.name ?? 'Calostrynn'}
      </button>

      {isDm && open && (
        <Modal onClose={() => setOpen(false)}>
          <section className="surface w-full max-w-xl rounded-2xl p-4">
            <div className="flex items-center justify-between"><div><p className="eyebrow">Party positions</p><h3 className="mt-1 text-2xl font-black">Locations</h3></div><button onClick={() => setOpen(false)} className="rounded-lg border border-[var(--line)] p-2"><X size={17} /></button></div>
            <div className="mt-4 space-y-2">
              {profiles.filter((entry) => entry.role !== 'dm').map((entry) => (
                <label key={entry.id} className="grid gap-1 rounded-xl border border-[var(--line)] bg-black/15 p-3 sm:grid-cols-[1fr_13rem] sm:items-center">
                  <span className="font-black">{entry.display_name}</span>
                  <select className="field py-2" value={locationFor(entry.id)?.id ?? ''} onChange={(event) => move(entry.id, event.target.value)}>
                    {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><input className="field" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Create new location" /><button onClick={createLocation} className="teal-button flex items-center gap-2 rounded-xl px-4 font-black"><Plus size={16} /> Add</button></div>
            {message && <p className="mt-3 text-xs text-[var(--muted)]">{message}</p>}
          </section>
        </Modal>
      )}
    </>
  );
}
