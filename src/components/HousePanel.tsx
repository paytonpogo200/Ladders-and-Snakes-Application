'use client';

import { useEffect, useMemo, useState } from 'react';
import { Home, LogIn, LogOut, PackageOpen, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NumberInput from '@/components/NumberInput';
import { rarityClass } from '@/lib/rarity';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Character, HouseInventoryItem, InventoryItem, PlayerHouse, Profile } from '@/lib/types';

export default function HousePanel({
  profile,
  ownerUserId,
  characters
}: {
  profile: Profile;
  ownerUserId: string;
  characters: Character[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [house, setHouse] = useState<PlayerHouse | null>(null);
  const [houseItems, setHouseItems] = useState<HouseInventoryItem[]>([]);
  const [carriedItems, setCarriedItems] = useState<InventoryItem[]>([]);
  const [sourceItemId, setSourceItemId] = useState('');
  const [selectedHouseItemId, setSelectedHouseItemId] = useState('');
  const [targetCharacterId, setTargetCharacterId] = useState(characters[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function loadHouse() {
    if (!ownerUserId) return;
    const { data: ensured, error: ensureError } = await supabase.rpc('ensure_player_house', {
      target_owner_user_id: ownerUserId
    });
    if (ensureError) {
      setMessage(ensureError.message);
      return;
    }
    const loadedHouse = ensured as PlayerHouse;
    setHouse(loadedHouse);

    const characterIds = characters.map((entry) => entry.id);
    const [houseResult, inventoryResult] = await Promise.all([
      supabase.from('house_inventory_items').select('*').eq('house_id', loadedHouse.id).order('slot_index'),
      characterIds.length > 0
        ? supabase.from('inventory_items').select('*').in('character_id', characterIds).order('item_name')
        : Promise.resolve({ data: [], error: null })
    ]);
    if (!houseResult.error) {
      const loaded = (houseResult.data ?? []) as HouseInventoryItem[];
      setHouseItems(loaded);
      if (selectedHouseItemId && !loaded.some((entry) => entry.id === selectedHouseItemId)) setSelectedHouseItemId('');
    }
    if (!inventoryResult.error) {
      const loaded = (inventoryResult.data ?? []) as InventoryItem[];
      setCarriedItems(loaded);
      if (!sourceItemId && loaded[0]) setSourceItemId(loaded[0].id);
    }
  }

  useEffect(() => {
    setTargetCharacterId(characters[0]?.id ?? '');
    loadHouse();
  }, [ownerUserId, characters.map((entry) => entry.id).join(',')]);

  useEffect(() => {
    if (!house) return;
    const refreshHouse = createDebouncedRefresh(loadHouse, 160);
    const channel = supabase
      .channel(`house-${house.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_inventory_items', filter: `house_id=eq.${house.id}` }, refreshHouse)
      .subscribe();
    return () => {
      refreshHouse.cancel();
      supabase.removeChannel(channel);
    };
  }, [house?.id]);

  const selectedHouseItem = houseItems.find((entry) => entry.id === selectedHouseItemId) ?? null;
  const sourceItem = carriedItems.find((entry) => entry.id === sourceItemId) ?? null;

  function sourceLabel(item: InventoryItem) {
    const owner = characters.find((entry) => entry.id === item.character_id);
    return `${owner?.name ?? 'Character'} · ${item.item_name} ×${item.quantity}`;
  }

  async function deposit() {
    if (!sourceItem) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('move_inventory_item_to_house', {
      target_source_item_id: sourceItem.id,
      move_quantity: Math.max(1, Math.min(sourceItem.quantity, Number(quantity) || 1))
    });
    setBusy(false);
    setMessage(error ? error.message : 'Item stored at home.');
    if (!error) {
      setQuantity(1);
      setSourceItemId('');
      await loadHouse();
    }
  }

  async function withdraw() {
    if (!selectedHouseItem || !targetCharacterId) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('move_house_item_to_character', {
      target_house_item_id: selectedHouseItem.id,
      target_character_id: targetCharacterId,
      move_quantity: Math.max(1, Math.min(selectedHouseItem.quantity, Number(quantity) || 1))
    });
    setBusy(false);
    setMessage(error ? error.message : 'Item packed onto the character.');
    if (!error) {
      setQuantity(1);
      await loadHouse();
    }
  }

  async function dropHouseItem() {
    if (!selectedHouseItem || !window.confirm(`Discard ${selectedHouseItem.item_name} from the house?`)) return;
    const { error } = await supabase.from('house_inventory_items').delete().eq('id', selectedHouseItem.id);
    setMessage(error ? error.message : 'Item discarded.');
    if (!error) {
      setSelectedHouseItemId('');
      await loadHouse();
    }
  }

  if (!house) return null;

  return (
    <details className="surface overflow-hidden rounded-2xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <span className="rounded-xl bg-[#e0a64e16] p-2.5 text-[var(--brass)]"><Home size={19} /></span>
        <span className="min-w-0 flex-1"><span className="block font-black">{house.name}</span><span className="block text-xs text-[var(--muted)]">One shared home for this player’s characters.</span></span>
        <span className="text-xs font-black text-[var(--muted)]">{houseItems.length}/{house.capacity}</span>
      </summary>
      <div className="border-t border-[#e0a64e22] p-3">
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {Array.from({ length: house.capacity }, (_, slot) => {
            const item = houseItems.find((entry) => entry.slot_index === slot);
            return (
              <button
                key={slot}
                onClick={() => item && setSelectedHouseItemId(item.id)}
                className={`relative flex aspect-square min-h-12 flex-col items-center justify-center rounded-lg border p-1.5 text-center ${item ? rarityClass(item.rarity) : 'border-dashed border-[var(--line)] bg-black/10'}`}
                aria-label={item ? `${item.item_name}, quantity ${item.quantity}` : `Empty house slot ${slot + 1}`}
              >
                <span className="absolute right-1 top-0.5 text-[7px] text-[var(--muted)]">{slot + 1}</span>
                {item && <><PackageOpen size={13} className="text-[var(--brass)]" /><span className="mt-1 block truncate text-[8px] font-black">{item.item_name}</span><span className="text-[8px] text-[var(--muted)]">×{item.quantity}</span></>}
              </button>
            );
          })}
        </div>

        {carriedItems.length > 0 && (
          <section className="mt-4 rounded-xl border border-[var(--line)] bg-black/15 p-3">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--brass)]"><LogIn size={14} /> Store an item</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_6rem_auto]">
              <select className="field" value={sourceItemId} onChange={(event) => { setSourceItemId(event.target.value); setQuantity(1); }}>
                {carriedItems.map((item) => <option key={item.id} value={item.id}>{sourceLabel(item)}</option>)}
              </select>
              <NumberInput className="field" min={1} max={sourceItem?.quantity ?? 1} value={quantity} onValueChange={setQuantity} aria-label="House deposit quantity" />
              <button onClick={deposit} disabled={busy || !sourceItem} className="primary-button rounded-xl px-4 py-3 font-black disabled:opacity-40">Store</button>
            </div>
          </section>
        )}

        {selectedHouseItem && (
          <section className="mt-3 rounded-xl border border-[#9caf7940] bg-[#9caf790b] p-3">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow">Selected house item</p><h4 className="mt-1 font-black">{selectedHouseItem.item_name} ×{selectedHouseItem.quantity}</h4></div>
              <button onClick={dropHouseItem} className="rounded-lg border border-[#d2735855] p-2 text-[var(--red)]"><Trash2 size={16} /></button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_6rem_auto]">
              <select className="field" value={targetCharacterId} onChange={(event) => setTargetCharacterId(event.target.value)}>
                {characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
              <NumberInput className="field" min={1} max={selectedHouseItem.quantity} value={quantity} onValueChange={setQuantity} aria-label="House withdrawal quantity" />
              <button onClick={withdraw} disabled={busy || !targetCharacterId} className="teal-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-40"><LogOut size={16} /> Pack</button>
            </div>
          </section>
        )}

        {message && <p className="mt-3 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs text-[var(--muted)]">{message}</p>}
      </div>
    </details>
  );
}
