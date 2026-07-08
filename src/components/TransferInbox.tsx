'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, Inbox, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Character, ItemTransferRequest, Profile } from '@/lib/types';

export default function TransferInbox({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [requests, setRequests] = useState<ItemTransferRequest[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [showCenter, setShowCenter] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadTransfers() {
    const [requestResult, characterResult] = await Promise.all([
      supabase.from('item_transfer_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('characters').select('*').eq('kind', 'player')
    ]);
    if (!requestResult.error) setRequests((requestResult.data ?? []) as ItemTransferRequest[]);
    if (!characterResult.error) setCharacters((characterResult.data ?? []) as Character[]);
  }

  useEffect(() => {
    loadTransfers();
    const refreshTransfers = createDebouncedRefresh(loadTransfers, 180);
    const channel = supabase
      .channel(`transfer-inbox-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_transfer_requests' }, refreshTransfers)
      .subscribe();
    return () => {
      refreshTransfers.cancel();
      supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const incoming = requests.filter((request) => request.recipient_user_id === profile.id);
  const outgoing = requests.filter((request) => request.sender_user_id === profile.id);
  const relevantCount = incoming.length + outgoing.length;
  const activeIncoming = incoming[0] ?? null;

  function characterName(id: string) {
    return characters.find((entry) => entry.id === id)?.name ?? 'Unknown character';
  }

  async function resolve(id: string, resolution: 'accepted' | 'declined' | 'cancelled') {
    setBusy(true);
    setMessage('');
    const { data, error } = await supabase.rpc('resolve_item_transfer', {
      target_request_id: id,
      resolution
    });
    setBusy(false);
    setMessage(error ? error.message : String(data));
    if (!error) await loadTransfers();
  }

  return (
    <>
      <button onClick={() => setShowCenter(true)} className="relative rounded-xl border border-[var(--line)] bg-black/20 p-3 text-[var(--muted)] transition active:scale-95" aria-label="Open item transfers">
        <Inbox size={18} />
        {relevantCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brass)] px-1 text-[10px] font-black text-[#211006]">{relevantCount}</span>}
      </button>

      {activeIncoming && (
        <div className="modal-backdrop">
          <section className="surface w-full max-w-md rounded-2xl p-5">
            <p className="eyebrow">Item offered</p>
            <h3 className="mt-2 text-2xl font-black">{activeIncoming.quantity}× {activeIncoming.item_name}</h3>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-black/20 p-3 text-sm">
              <span className="font-black">{characterName(activeIncoming.source_character_id)}</span>
              <ArrowRight size={16} className="text-[var(--brass)]" />
              <span className="font-black">{characterName(activeIncoming.target_character_id)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Accepting places the item into the receiving character’s next open inventory or storage slot.</p>
            {message && <p className="mt-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs text-[var(--muted)]">{message}</p>}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => resolve(activeIncoming.id, 'declined')} disabled={busy} className="flex items-center justify-center gap-2 rounded-xl border border-[#d2735855] px-4 py-3 font-black text-[var(--red)]"><X size={17} /> Decline</button>
              <button onClick={() => resolve(activeIncoming.id, 'accepted')} disabled={busy} className="teal-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Check size={17} /> Accept</button>
            </div>
          </section>
        </div>
      )}

      {showCenter && !activeIncoming && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowCenter(false)}>
          <section className="surface w-full max-w-lg rounded-2xl p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">Persistent handoffs</p><h3 className="mt-1 text-2xl font-black">Item Transfers</h3></div>
              <button onClick={() => setShowCenter(false)} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>

            <div className="mt-4">
              <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[var(--brass)]"><Send size={15} /> Waiting for another player</p>
              {outgoing.length === 0 ? <p className="rounded-xl bg-black/20 p-3 text-sm text-[var(--muted)]">No outgoing requests.</p> : (
                <div className="space-y-2">
                  {outgoing.map((request) => (
                    <article key={request.id} className="rounded-xl border border-[var(--line)] bg-black/15 p-3">
                      <p className="font-black">{request.quantity}× {request.item_name}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">{characterName(request.source_character_id)} → {characterName(request.target_character_id)}</p>
                      <button onClick={() => resolve(request.id, 'cancelled')} disabled={busy} className="mt-3 rounded-lg border border-[#d2735855] px-3 py-2 text-xs font-black text-[var(--red)]">Cancel request</button>
                    </article>
                  ))}
                </div>
              )}
            </div>
            {message && <p className="mt-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs text-[var(--muted)]">{message}</p>}
          </section>
        </div>
      )}
    </>
  );
}
