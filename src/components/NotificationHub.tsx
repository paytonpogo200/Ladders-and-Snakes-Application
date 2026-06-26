'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Check, Megaphone, MessageSquare, RefreshCw, Send, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/Modal';
import TradeModal from '@/components/TradeModal';
import type {
  CampaignLocation,
  CampaignNotification,
  Character,
  FeedEvent,
  ItemTransferRequest,
  PlayerLocation,
  Profile,
  TradeOffer,
  TradeOfferItem
} from '@/lib/types';

export default function NotificationHub({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<CampaignNotification[]>([]);
  const [trades, setTrades] = useState<TradeOffer[]>([]);
  const [tradeItems, setTradeItems] = useState<TradeOfferItem[]>([]);
  const [itemTransfers, setItemTransfers] = useState<ItemTransferRequest[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [locations, setLocations] = useState<CampaignLocation[]>([]);
  const [myLocation, setMyLocation] = useState<PlayerLocation | null>(null);
  const [awayEvents, setAwayEvents] = useState<FeedEvent[]>([]);
  const [showHub, setShowHub] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [counterOffer, setCounterOffer] = useState<TradeOffer | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState({ location_id: '', mode: 'dm', speaker: '', title: '', body: '' });

  async function load() {
    await supabase.rpc('ensure_player_locations');
    const [notificationResult, tradeResult, tradeItemResult, transferResult, characterResult, locationResult, playerLocationResult] = await Promise.all([
      supabase.from('campaign_notifications').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(80),
      supabase.from('trade_offers').select('*').or(`sender_user_id.eq.${profile.id},recipient_user_id.eq.${profile.id}`).order('created_at', { ascending: false }).limit(40),
      supabase.from('trade_offer_items').select('*'),
      supabase.from('item_transfer_requests').select('*').eq('status', 'pending').order('created_at'),
      supabase.from('characters').select('*').eq('kind', 'player'),
      supabase.from('campaign_locations').select('*').order('created_at'),
      supabase.from('player_locations').select('*').eq('user_id', profile.id).maybeSingle()
    ]);
    if (!notificationResult.error) setNotifications((notificationResult.data ?? []) as CampaignNotification[]);
    if (!tradeResult.error) setTrades((tradeResult.data ?? []) as TradeOffer[]);
    if (!tradeItemResult.error) setTradeItems((tradeItemResult.data ?? []) as TradeOfferItem[]);
    if (!transferResult.error) setItemTransfers((transferResult.data ?? []) as ItemTransferRequest[]);
    if (!characterResult.error) setCharacters((characterResult.data ?? []) as Character[]);
    if (!locationResult.error) {
      const loaded = (locationResult.data ?? []) as CampaignLocation[];
      setLocations(loaded);
      if (!announcement.location_id && loaded[0]) setAnnouncement((current) => ({ ...current, location_id: loaded[0].id }));
    }
    if (!playerLocationResult.error && playerLocationResult.data) {
      const row = playerLocationResult.data as PlayerLocation;
      setMyLocation(row);
      if (row.return_summary_pending && row.return_since) {
        const { data } = await supabase.from('feed_events').select('*').eq('location_id', row.location_id).gt('created_at', row.return_since).order('created_at');
        const events = (data ?? []) as FeedEvent[];
        setAwayEvents(events);
        if (events.length === 0) await supabase.rpc('mark_return_summary_seen');
      }
    }
  }

  useEffect(() => {
    load();
    const channel = supabase.channel(`notification-hub-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaign_notifications' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_offers' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_transfer_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'player_locations' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile.id]);

  function characterName(id: string) {
    return characters.find((entry) => entry.id === id)?.name ?? 'Unknown character';
  }

  function tradeSummary(trade: TradeOffer) {
    const lines = tradeItems.filter((entry) => entry.offer_id === trade.id);
    const offered = lines.filter((entry) => entry.side === 'offered').map((entry) => `${entry.quantity}× ${entry.item_name}`);
    const requested = lines.filter((entry) => entry.side === 'requested').map((entry) => `${entry.quantity}× ${entry.item_name}`);
    if (trade.offered_currency_base > 0) offered.push(`${trade.offered_currency_base} base currency`);
    if (trade.requested_currency_base > 0) requested.push(`${trade.requested_currency_base} base currency`);
    return { offered: offered.join(', ') || 'Nothing', requested: requested.join(', ') || 'Nothing' };
  }

  async function openHub() {
    setShowHub(true);
    const unreadIds = notifications.filter((entry) => !entry.is_read).map((entry) => entry.id);
    if (unreadIds.length > 0) {
      await supabase.from('campaign_notifications').update({ is_read: true }).in('id', unreadIds);
      setNotifications((current) => current.map((entry) => ({ ...entry, is_read: true })));
    }
  }

  async function resolveTrade(id: string, resolution: 'accepted' | 'declined' | 'cancelled') {
    setBusy(true);
    const { data, error } = await supabase.rpc('resolve_trade_offer', { target_offer_id: id, resolution });
    setBusy(false);
    setMessage(error?.message ?? String(data));
    if (!error) await load();
  }

  async function resolveTransfer(id: string, resolution: 'accepted' | 'declined' | 'cancelled') {
    setBusy(true);
    const { data, error } = await supabase.rpc('resolve_item_transfer', { target_request_id: id, resolution });
    setBusy(false);
    setMessage(error?.message ?? String(data));
    if (!error) await load();
  }

  async function publishAnnouncement() {
    setBusy(true);
    const { error } = await supabase.rpc('dm_publish_announcement', {
      target_location_id: announcement.location_id,
      announcement_title: announcement.title.trim(),
      announcement_body: announcement.body.trim(),
      announcement_mode: announcement.mode === 'npc' ? 'in_game' : 'dm',
      npc_speaker: announcement.speaker.trim() || null
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setAnnouncement((current) => ({ ...current, speaker: '', title: '', body: '' }));
    setShowAnnouncement(false);
    setMessage('Announcement sent.');
    await load();
  }

  async function closeAwaySummary() {
    await supabase.rpc('mark_return_summary_seen');
    setAwayEvents([]);
    setMyLocation((current) => current ? { ...current, return_summary_pending: false } : current);
  }

  const pendingIncoming = trades.filter((entry) => entry.recipient_user_id === profile.id && entry.status === 'pending');
  const pendingOutgoing = trades.filter((entry) => entry.sender_user_id === profile.id && entry.status === 'pending');
  const transferIncoming = itemTransfers.filter((entry) => entry.recipient_user_id === profile.id);
  const transferOutgoing = itemTransfers.filter((entry) => entry.sender_user_id === profile.id);
  const unread = notifications.filter((entry) => !entry.is_read).length + pendingIncoming.length + transferIncoming.length;
  const counterTarget = counterOffer ? characters.find((entry) => entry.id === counterOffer.sender_character_id) ?? null : null;

  return (
    <>
      {profile.role === 'dm' && <button onClick={() => setShowAnnouncement(true)} className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-[var(--brass)] transition active:scale-95" aria-label="Draft announcement"><Megaphone size={18} /></button>}
      <button onClick={openHub} className="relative rounded-xl border border-[var(--line)] bg-black/20 p-3 text-[var(--muted)] transition active:scale-95" aria-label="Open notifications">
        <Bell size={18} />
        {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brass)] px-1 text-[10px] font-black text-[#211006]">{unread}</span>}
      </button>

      {showHub && (
        <Modal onClose={() => setShowHub(false)}>
          <section className="surface w-full max-w-2xl rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">Campaign activity</p><h3 className="mt-1 text-2xl font-black">Notifications</h3></div>
              <div className="flex gap-2">
                {profile.role === 'dm' && <button onClick={() => setShowAnnouncement(true)} className="teal-button rounded-lg p-2" aria-label="Draft announcement"><Megaphone size={17} /></button>}
                <button onClick={() => setShowHub(false)} className="rounded-lg border border-[var(--line)] p-2"><X size={17} /></button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {pendingIncoming.map((trade) => {
                const summary = tradeSummary(trade);
                return (
                  <article key={trade.id} className="rounded-xl border border-[#e0a64e55] bg-[#e0a64e0b] p-3">
                    <p className="text-xs font-black uppercase text-[var(--brass)]">Trade request</p>
                    <h4 className="mt-1 font-black">{characterName(trade.sender_character_id)} → {characterName(trade.recipient_character_id)}</h4>
                    <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><p><span className="font-black">They offer:</span> {summary.offered}</p><p><span className="font-black">They request:</span> {summary.requested}</p></div>
                    {trade.message && <p className="mt-2 flex gap-2 text-xs text-[var(--muted)]"><MessageSquare size={14} /> {trade.message}</p>}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button onClick={() => resolveTrade(trade.id, 'declined')} disabled={busy} className="rounded-lg border border-[#d2735855] py-2 text-xs font-black text-[var(--red)]">Decline</button>
                      <button onClick={() => setCounterOffer(trade)} disabled={busy} className="rounded-lg border border-[var(--line)] py-2 text-xs font-black"><RefreshCw className="mr-1 inline" size={13} /> Counter</button>
                      <button onClick={() => resolveTrade(trade.id, 'accepted')} disabled={busy} className="teal-button rounded-lg py-2 text-xs font-black">Accept</button>
                    </div>
                  </article>
                );
              })}

              {transferIncoming.map((request) => (
                <article key={request.id} className="rounded-xl border border-[var(--line)] bg-black/15 p-3">
                  <p className="text-xs font-black uppercase text-[var(--teal)]">Item offered</p>
                  <p className="mt-1 font-black">{request.quantity}× {request.item_name}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">{characterName(request.source_character_id)} <ArrowRight size={13} /> {characterName(request.target_character_id)}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2"><button onClick={() => resolveTransfer(request.id, 'declined')} className="rounded-lg border border-[#d2735855] py-2 text-xs font-black text-[var(--red)]">Decline</button><button onClick={() => resolveTransfer(request.id, 'accepted')} className="teal-button rounded-lg py-2 text-xs font-black">Accept</button></div>
                </article>
              ))}

              {(pendingOutgoing.length > 0 || transferOutgoing.length > 0) && (
                <details className="surface-soft rounded-xl"><summary className="cursor-pointer p-3 font-black">Waiting for replies ({pendingOutgoing.length + transferOutgoing.length})</summary><div className="space-y-2 border-t border-[var(--line)] p-3">
                  {pendingOutgoing.map((trade) => <article key={trade.id} className="rounded-lg bg-black/20 p-3 text-xs"><p className="font-black">Trade with {characterName(trade.recipient_character_id)}</p><button onClick={() => resolveTrade(trade.id, 'cancelled')} className="mt-2 text-[var(--red)]">Cancel</button></article>)}
                  {transferOutgoing.map((request) => <article key={request.id} className="rounded-lg bg-black/20 p-3 text-xs"><p className="font-black">{request.quantity}× {request.item_name}</p><button onClick={() => resolveTransfer(request.id, 'cancelled')} className="mt-2 text-[var(--red)]">Cancel</button></article>)}
                </div></details>
              )}

              <section>
                <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--muted)]">Recent</h4>
                <div className="space-y-2">
                  {notifications.map((entry) => <article key={entry.id} className="rounded-xl border border-[var(--line)] bg-black/15 p-3"><p className="font-black">{entry.title}</p>{entry.body && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{entry.body}</p>}</article>)}
                  {notifications.length === 0 && pendingIncoming.length === 0 && transferIncoming.length === 0 && <p className="rounded-xl bg-black/15 p-4 text-sm text-[var(--muted)]">Nothing new.</p>}
                </div>
              </section>
            </div>
            {message && <p className="mt-3 rounded-xl border border-[var(--line)] p-3 text-xs text-[var(--muted)]">{message}</p>}
          </section>
        </Modal>
      )}

      {profile.role === 'dm' && showAnnouncement && (
        <Modal onClose={() => setShowAnnouncement(false)}>
          <section className="surface w-full max-w-lg rounded-2xl p-4">
            <div className="flex items-center justify-between"><h3 className="text-2xl font-black">New Announcement</h3><button onClick={() => setShowAnnouncement(false)} className="rounded-lg border border-[var(--line)] p-2"><X size={17} /></button></div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-black/20 p-1 text-xs font-black"><button onClick={() => setAnnouncement({ ...announcement, mode: 'dm' })} className={`rounded-md py-2 ${announcement.mode === 'dm' ? 'bg-[var(--paper)] text-[#201006]' : ''}`}>DM</button><button onClick={() => setAnnouncement({ ...announcement, mode: 'npc' })} className={`rounded-md py-2 ${announcement.mode === 'npc' ? 'bg-[var(--paper)] text-[#201006]' : ''}`}>In-game NPC</button></div>
            {announcement.mode === 'npc' && <input className="field mt-3" value={announcement.speaker} onChange={(event) => setAnnouncement({ ...announcement, speaker: event.target.value })} placeholder="NPC name" />}
            <select className="field mt-3" value={announcement.location_id} onChange={(event) => setAnnouncement({ ...announcement, location_id: event.target.value })}>{locations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select>
            <input className="field mt-3" value={announcement.title} onChange={(event) => setAnnouncement({ ...announcement, title: event.target.value })} placeholder="Header" />
            <textarea className="field mt-3 min-h-28" value={announcement.body} onChange={(event) => setAnnouncement({ ...announcement, body: event.target.value })} placeholder="Announcement" />
            <button onClick={publishAnnouncement} disabled={busy || !announcement.title.trim()} className="primary-button mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-45"><Send size={17} /> Send</button>
          </section>
        </Modal>
      )}

      {counterOffer && counterTarget && (
        <TradeModal
          profile={profile}
          targetCharacter={counterTarget}
          preferredSenderCharacterId={counterOffer.recipient_character_id}
          counterTo={counterOffer.id}
          onClose={() => setCounterOffer(null)}
          onSent={load}
        />
      )}

      {myLocation?.return_summary_pending && awayEvents.length > 0 && (
        <Modal onClose={closeAwaySummary}>
          <section className="surface w-full max-w-lg rounded-2xl p-4">
            <p className="eyebrow">Welcome back</p>
            <h3 className="mt-1 text-3xl font-black">While You Were Away</h3>
            <div className="mt-4 space-y-2">{awayEvents.map((event) => <article key={event.id} className="rounded-xl border border-[var(--line)] bg-black/15 p-3"><p className="text-[10px] font-black uppercase text-[var(--brass)]">{event.speaker}</p><h4 className="mt-1 font-black">{event.title}</h4>{event.body && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{event.body}</p>}</article>)}</div>
            <button onClick={closeAwaySummary} className="primary-button mt-4 w-full rounded-xl px-4 py-3 font-black">Continue</button>
          </section>
        </Modal>
      )}
    </>
  );
}
