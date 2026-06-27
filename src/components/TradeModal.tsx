'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Coins, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/Modal';
import NumberInput from '@/components/NumberInput';
import { rarityClass } from '@/lib/rarity';
import { readRememberedSelection, rememberSelection } from '@/lib/selectionMemory';
import type { Character, CurrencyDenomination, CurrencySystem, InventoryItem, Profile } from '@/lib/types';

export default function TradeModal({
  profile,
  targetCharacter,
  preferredSenderCharacterId,
  counterTo,
  onClose,
  onSent
}: {
  profile: Profile;
  targetCharacter: Character;
  preferredSenderCharacterId?: string;
  counterTo?: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [systems, setSystems] = useState<CurrencySystem[]>([]);
  const [denominations, setDenominations] = useState<CurrencyDenomination[]>([]);
  const [senderId, setSenderId] = useState(preferredSenderCharacterId ?? '');
  const [offered, setOffered] = useState<Record<string, number>>({});
  const [requested, setRequested] = useState<Record<string, number>>({});
  const [offeredMoney, setOfferedMoney] = useState(0);
  const [requestedMoney, setRequestedMoney] = useState(0);
  const [offeredDenomination, setOfferedDenomination] = useState('');
  const [requestedDenomination, setRequestedDenomination] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('characters').select('*').eq('kind', 'player').order('name'),
      supabase.from('inventory_items').select('*').is('parent_item_id', null).order('item_name'),
      supabase.from('currency_systems').select('*'),
      supabase.from('currency_denominations').select('*').order('sort_order')
    ]).then(([characterResult, itemResult, systemResult, denominationResult]) => {
      const mine = ((characterResult.data ?? []) as Character[]).filter((entry) => entry.owner_user_id === profile.id);
      setCharacters(mine);
      if (!senderId && mine[0]) {
        const remembered = readRememberedSelection(profile.id, 'trade-sender-character');
        setSenderId(mine.some((entry) => entry.id === remembered) ? remembered : mine[0].id);
      }
      setItems((itemResult.data ?? []) as InventoryItem[]);
      setSystems((systemResult.data ?? []) as CurrencySystem[]);
      const loadedDenominations = (denominationResult.data ?? []) as CurrencyDenomination[];
      setDenominations(loadedDenominations);
      if (loadedDenominations[0]) {
        setOfferedDenomination(loadedDenominations[0].id);
        setRequestedDenomination(loadedDenominations[0].id);
      }
    });
  }, []);

  const sender = characters.find((entry) => entry.id === senderId) ?? characters[0];
  const senderItems = items.filter((entry) => entry.character_id === sender?.id);
  const targetItems = items.filter((entry) => entry.character_id === targetCharacter.id);
  const system = systems[0] ?? null;
  const systemDenominations = denominations.filter((entry) => entry.currency_system_id === system?.id);

  function toggleItem(side: 'offered' | 'requested', item: InventoryItem) {
    const setter = side === 'offered' ? setOffered : setRequested;
    setter((current) => {
      const next = { ...current };
      if (next[item.id]) delete next[item.id];
      else next[item.id] = 1;
      return next;
    });
  }

  async function submit() {
    if (!sender) return;
    const offeredUnit = denominations.find((entry) => entry.id === offeredDenomination)?.base_value ?? 1;
    const requestedUnit = denominations.find((entry) => entry.id === requestedDenomination)?.base_value ?? 1;
    const offeredLines = Object.entries(offered).map(([item_id, quantity]) => ({ item_id, quantity }));
    const requestedLines = Object.entries(requested).map(([item_id, quantity]) => ({ item_id, quantity }));
    if (offeredLines.length === 0 && requestedLines.length === 0 && offeredMoney <= 0 && requestedMoney <= 0) {
      setStatus('Add at least one item or currency amount.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('create_trade_offer', {
      sender_character: sender.id,
      recipient_character: targetCharacter.id,
      offered_items: offeredLines,
      requested_items: requestedLines,
      currency_system: system?.id ?? null,
      offered_currency: Math.max(0, offeredMoney) * offeredUnit,
      requested_currency: Math.max(0, requestedMoney) * requestedUnit,
      offer_message: message.trim(),
      counter_to: counterTo ?? null
    });
    setBusy(false);
    if (error) return setStatus(error.message);
    onSent?.();
    onClose();
  }

  function ItemChooser({ title, entries, selected, side }: { title: string; entries: InventoryItem[]; selected: Record<string, number>; side: 'offered' | 'requested' }) {
    return (
      <section>
        <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-[var(--brass)]">{title}</h4>
        <div className="grid max-h-52 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {entries.map((item) => {
            const chosen = selected[item.id] !== undefined;
            return (
              <div key={item.id} className={`rounded-xl border p-2 ${chosen ? rarityClass(item.rarity) : 'border-[var(--line)] bg-black/15'}`}>
                <button type="button" onClick={() => toggleItem(side, item)} className="flex w-full items-center gap-2 text-left">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${chosen ? 'border-[var(--teal)] bg-[var(--teal)] text-[#15200d]' : 'border-[var(--line)]'}`}>{chosen && <Check size={14} />}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-black">{item.item_name}</span>
                  <span className="text-[10px] text-[var(--muted)]">×{item.quantity}</span>
                </button>
                {chosen && <NumberInput className="field mt-2 py-2 text-xs" min={1} max={item.quantity} value={selected[item.id]} onValueChange={(quantity) => (side === 'offered' ? setOffered : setRequested)((current) => ({ ...current, [item.id]: quantity }))} />}
              </div>
            );
          })}
          {entries.length === 0 && <p className="text-xs text-[var(--muted)]">No items available.</p>}
        </div>
      </section>
    );
  }

  return (
    <Modal onClose={onClose}>
      <section className="surface w-full max-w-3xl rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="eyebrow">{counterTo ? 'Counteroffer' : 'Trade proposal'}</p><h3 className="mt-1 text-2xl font-black">{targetCharacter.name}</h3></div>
          <button onClick={onClose} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
        </div>

        <label className="mt-4 block"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Trading as</span><select className="field" value={sender?.id ?? ''} onChange={(event) => chooseSender(event.target.value)}>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ItemChooser title={`${sender?.name ?? 'You'} offers`} entries={senderItems} selected={offered} side="offered" />
          <ItemChooser title={`Request from ${targetCharacter.name}`} entries={targetItems} selected={requested} side="requested" />
        </div>

        {system && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { title: 'Currency offered', value: offeredMoney, setValue: setOfferedMoney, denomination: offeredDenomination, setDenomination: setOfferedDenomination },
              { title: 'Currency requested', value: requestedMoney, setValue: setRequestedMoney, denomination: requestedDenomination, setDenomination: setRequestedDenomination }
            ].map((field) => (
              <label key={field.title}><span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-[var(--muted)]"><Coins size={12} /> {field.title}</span><div className="grid grid-cols-[1fr_1fr] gap-2"><NumberInput className="field" min={0} value={field.value} onValueChange={field.setValue} /><select className="field" value={field.denomination} onChange={(event) => field.setDenomination(event.target.value)}>{systemDenominations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></div></label>
            ))}
          </div>
        )}

        <label className="mt-4 block"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Message (optional)</span><textarea className="field min-h-20" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        {status && <p className="mt-3 rounded-xl border border-[var(--line)] p-3 text-xs text-[var(--red)]">{status}</p>}
        <button onClick={submit} disabled={busy || !sender} className="primary-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-45"><ArrowRightLeft size={17} /> {busy ? 'Sending…' : counterTo ? 'Send counteroffer' : 'Send trade offer'}</button>
      </section>
    </Modal>
  );
}
  function chooseSender(characterId: string) {
    setSenderId(characterId);
    setOffered({});
    rememberSelection(profile.id, 'trade-sender-character', characterId);
  }
