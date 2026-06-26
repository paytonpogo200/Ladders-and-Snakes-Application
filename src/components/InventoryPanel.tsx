'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Apple, Box, Check, ChevronDown, FlaskConical, Leaf, PackageOpen, Pickaxe, Plus, ScrollText, Send, Shield, Shirt, Sword, Trash2, Wrench, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NumberInput from '@/components/NumberInput';
import Modal from '@/components/Modal';
import { rarityClass } from '@/lib/rarity';
import { createDebouncedRefresh } from '@/lib/realtime';
import type { Character, CharacterTransferCapacity, InventoryItem, InventoryItemType, Profile, Spell } from '@/lib/types';

const itemTypes: { value: InventoryItemType; label: string; icon: typeof Box }[] = [
  { value: 'weapon', label: 'Weapon', icon: Sword },
  { value: 'armor', label: 'Armor', icon: Shield },
  { value: 'ore', label: 'Ore', icon: Pickaxe },
  { value: 'potion', label: 'Potion', icon: FlaskConical },
  { value: 'food', label: 'Food', icon: Apple },
  { value: 'plant', label: 'Plant', icon: Leaf },
  { value: 'fabric', label: 'Fabric', icon: Shirt },
  { value: 'tool', label: 'Tool', icon: Wrench },
  { value: 'quest', label: 'Quest', icon: ScrollText },
  { value: 'misc', label: 'Misc.', icon: Box }
];

const legacyItemTypes: { value: InventoryItemType; label: string; icon: typeof Box }[] = [
  { value: 'consumable', label: 'Consumable', icon: FlaskConical }
];

function imbuedSpellName(notes?: string | null) {
  return notes?.match(/Imbued spell:\s*(.+)/i)?.[1]?.trim() ?? '';
}

function imbueNotes(spellName: string) {
  return spellName ? `Imbued spell: ${spellName}` : '';
}

function ItemIcon({ type, size = 19 }: { type: InventoryItemType; size?: number }) {
  const Icon = itemTypes.find((entry) => entry.value === type)?.icon ?? legacyItemTypes.find((entry) => entry.value === type)?.icon ?? Box;
  return <Icon size={size} />;
}

export default function InventoryPanel({ character, canEdit, profile }: { character: Character; canEdit: boolean; profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<{ slot: number; parentId: string | null } | null>(null);
  const [action, setAction] = useState<'inspect' | 'drop' | 'give'>('inspect');
  const [message, setMessage] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [capacities, setCapacities] = useState<CharacterTransferCapacity[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [actionQuantity, setActionQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [openStorageIds, setOpenStorageIds] = useState<Set<string>>(() => new Set());
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCandidate = useRef<{ item: InventoryItem; x: number; y: number } | null>(null);
  const draggingItem = useRef<InventoryItem | null>(null);
  const dragTarget = useRef<{ slot: number; parentId: string | null } | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDirection = useRef(0);
  const suppressClick = useRef(false);
  const [form, setForm] = useState({
    item_name: '',
    quantity: 1,
    item_type: 'misc' as InventoryItemType,
    imbued_spell_id: '',
    equipped: false,
    storage_capacity: 0
  });

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const slotCount = Math.max(0, Math.min(100, character.inventory_slots ?? 20));
  const mainItems = items.filter((item) => item.parent_item_id === null && !item.is_storage);
  const storageItems = items.filter((item) => item.is_storage);
  const mayManage = profile.role === 'dm' || character.owner_user_id === profile.id;
  const targetCapacity = capacities.find((entry) => entry.character_id === transferTargetId)?.free_slots ?? 0;

  function slotKey(slot: number, parentId: string | null) {
    return `${parentId ?? 'main'}:${slot}`;
  }

  function setStorageOpen(storageId: string, open: boolean) {
    setOpenStorageIds((current) => {
      const next = new Set(current);
      if (open) next.add(storageId);
      else next.delete(storageId);
      return next;
    });
  }

  function stopAutoScroll() {
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    autoScrollTimer.current = null;
    autoScrollDirection.current = 0;
  }

  function setAutoScroll(direction: number) {
    if (direction === autoScrollDirection.current) return;
    stopAutoScroll();
    if (!direction) return;
    autoScrollDirection.current = direction;
    autoScrollTimer.current = setInterval(() => window.scrollBy({ top: direction * 4, behavior: 'auto' }), 32);
  }

  function resetDrag() {
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragTimer.current = null;
    dragCandidate.current = null;
    draggingItem.current = null;
    dragTarget.current = null;
    setDraggingItemId(null);
    setDragTargetKey(null);
    stopAutoScroll();
    document.body.classList.remove('inventory-drag-active');
  }

  async function loadItems() {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('character_id', character.id).order('created_at');
    if (!error) setItems((data ?? []) as InventoryItem[]);
  }

  async function loadTransferOptions() {
    const [characterResult, capacityResult, spellResult] = await Promise.all([
      supabase.from('characters').select('*').eq('kind', 'player').order('name'),
      supabase.rpc('get_character_transfer_capacity'),
      supabase.from('spells').select('*').order('category').order('name')
    ]);
    if (!characterResult.error) {
      const loaded = ((characterResult.data ?? []) as Character[]).filter((entry) => entry.id !== character.id && entry.owner_user_id);
      setCharacters(loaded);
      if (!transferTargetId && loaded[0]) setTransferTargetId(loaded[0].id);
    }
    if (!capacityResult.error) setCapacities((capacityResult.data ?? []) as CharacterTransferCapacity[]);
    if (!spellResult.error) setSpells((spellResult.data ?? []) as Spell[]);
  }

  useEffect(() => {
    loadItems();
    loadTransferOptions();
    const refreshItems = createDebouncedRefresh(loadItems, 120);
    const channel = supabase
      .channel(`inventory-${character.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `character_id=eq.${character.id}` }, refreshItems)
      .subscribe();
    return () => {
      refreshItems.cancel();
      supabase.removeChannel(channel);
    };
  }, [character.id]);

  useEffect(() => {
    function pointerMove(event: PointerEvent) {
      const candidate = dragCandidate.current;
      if (candidate && !draggingItem.current && Math.hypot(event.clientX - candidate.x, event.clientY - candidate.y) > 9) {
        if (dragTimer.current) clearTimeout(dragTimer.current);
        dragTimer.current = null;
        dragCandidate.current = null;
      }
      if (!draggingItem.current) return;
      event.preventDefault();
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-inventory-slot]');
      if (element) {
        const slot = Number(element.dataset.slotIndex);
        const parentId = element.dataset.parentId === 'main' ? null : element.dataset.parentId ?? null;
        dragTarget.current = Number.isFinite(slot) ? { slot, parentId } : null;
        setDragTargetKey(Number.isFinite(slot) ? slotKey(slot, parentId) : null);
      } else {
        dragTarget.current = null;
        setDragTargetKey(null);
      }
      const edge = 92;
      setAutoScroll(event.clientY < edge ? -1 : event.clientY > window.innerHeight - edge ? 1 : 0);
    }

    function pointerUp() {
      if (dragTimer.current) clearTimeout(dragTimer.current);
      dragTimer.current = null;
      const item = draggingItem.current;
      const target = dragTarget.current;
      if (item) {
        suppressClick.current = true;
        window.setTimeout(() => { suppressClick.current = false; }, 80);
        if (target && (item.slot_index !== target.slot || item.parent_item_id !== target.parentId)) {
          void moveItem(item, target.slot, target.parentId);
        }
      }
      resetDrag();
    }

    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    return () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      resetDrag();
    };
  }, [character.id]);

  function beginLongPress(item: InventoryItem, event: React.PointerEvent<HTMLButtonElement>) {
    if (!mayManage || item.is_storage || event.button !== 0) return;
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragCandidate.current = { item, x: event.clientX, y: event.clientY };
    dragTimer.current = setTimeout(() => {
      draggingItem.current = item;
      setDraggingItemId(item.id);
      document.body.classList.add('inventory-drag-active');
      if (navigator.vibrate) navigator.vibrate(18);
    }, 380);
  }

  async function moveItem(item: InventoryItem, slot: number, parentId: string | null) {
    setMessage('');
    const { error } = await supabase.rpc('move_inventory_item_slot', {
      target_item_id: item.id,
      target_parent_item_id: parentId,
      target_slot_index: slot
    });
    if (error) setMessage(error.message);
    await loadItems();
  }

  function openItem(item: InventoryItem) {
    setSelectedItemId(item.id);
    setEmptyTarget(null);
    setAction('inspect');
    setActionQuantity(1);
    setMessage('');
    setForm({
      item_name: item.item_name,
      quantity: item.quantity,
      item_type: item.item_type,
      imbued_spell_id: spells.find((spell) => spell.name === imbuedSpellName(item.notes))?.id ?? '',
      equipped: item.equipped,
      storage_capacity: item.storage_capacity ?? 0
    });
  }

  function openEmpty(slot: number, parentId: string | null) {
    if (!canEdit) return;
    setSelectedItemId(null);
    setEmptyTarget({ slot, parentId });
    setAction('inspect');
    setMessage('');
    setForm({ item_name: '', quantity: 1, item_type: 'misc', imbued_spell_id: '', equipped: false, storage_capacity: 0 });
  }

  function closeEditor() {
    setSelectedItemId(null);
    setEmptyTarget(null);
    setAction('inspect');
    setMessage('');
  }

  async function saveItem(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit || !form.item_name.trim()) return;
    setBusy(true);
    const payload = {
      item_name: form.item_name.trim(),
      quantity: Math.max(1, Number(form.quantity) || 1),
      item_type: form.item_type,
      notes: form.item_type === 'weapon' ? imbueNotes(spells.find((spell) => spell.id === form.imbued_spell_id)?.name ?? '') : '',
      equipped: form.equipped
    };
    const result = selectedItem
      ? await supabase.from('inventory_items').update({
          ...payload,
          storage_capacity: selectedItem.is_storage ? Math.max(1, Number(form.storage_capacity) || 1) : 0
        }).eq('id', selectedItem.id)
      : await supabase.from('inventory_items').insert({
          ...payload,
          character_id: character.id,
          slot_index: emptyTarget?.slot ?? 0,
          parent_item_id: emptyTarget?.parentId ?? null,
          is_storage: false,
          storage_capacity: 0
        });
    setBusy(false);
    if (result.error) return setMessage(result.error.message);
    closeEditor();
    await loadItems();
  }

  async function dropItem() {
    if (!selectedItem) return;
    setBusy(true);
    const { error } = await supabase.rpc('drop_inventory_item', {
      target_item_id: selectedItem.id,
      drop_quantity: Math.max(1, Math.min(selectedItem.quantity, actionQuantity || 1))
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    closeEditor();
    await loadItems();
  }

  async function requestTransfer() {
    if (!selectedItem || !transferTargetId) return;
    setBusy(true);
    const { error } = await supabase.rpc('request_item_transfer', {
      target_source_item_id: selectedItem.id,
      target_character_id: transferTargetId,
      transfer_quantity: Math.max(1, Math.min(selectedItem.quantity, actionQuantity || 1))
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessage('Transfer request sent. It will remain available until accepted, declined, or cancelled.');
    setAction('inspect');
    await loadTransferOptions();
  }

  function renderSlot(item: InventoryItem | undefined, slot: number, parentId: string | null) {
    const key = slotKey(slot, parentId);
    return (
      <button
        key={slot}
        type="button"
        data-inventory-slot
        data-parent-id={parentId ?? 'main'}
        data-slot-index={slot}
        onPointerDown={(event) => item && beginLongPress(item, event)}
        onClick={() => {
          if (suppressClick.current) return;
          item ? openItem(item) : openEmpty(slot, parentId);
        }}
        className={`inventory-slot relative flex aspect-square min-h-20 flex-col items-center justify-center rounded-xl border p-1.5 text-center transition active:scale-95 sm:min-h-16 sm:p-2 ${
          item ? rarityClass(item.rarity) : 'border-dashed border-[var(--line)] bg-black/10'
        } ${!item && !canEdit ? 'cursor-default' : ''} ${draggingItemId === item?.id ? 'inventory-slot-dragging' : ''} ${dragTargetKey === key ? 'inventory-slot-target' : ''}`}
      >
        <span className="absolute right-2 top-1.5 text-[9px] font-bold text-[var(--muted)]">{slot + 1}</span>
        {item ? (
          <>
            <span className="inventory-slot-icon text-[var(--brass)]"><ItemIcon type={item.item_type} /></span>
            <span className="inventory-item-name mt-1 w-full text-[10px] font-black leading-[1.08] sm:text-[11px]">{item.item_name}</span>
            <span className="mt-0.5 text-[10px] font-black text-[var(--muted)]">×{item.quantity}</span>
            {item.equipped && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--teal)] p-0.5 text-[#07110e]"><Check size={9} /></span>}
          </>
        ) : canEdit ? <Plus size={18} className="text-[var(--muted)]" /> : null}
      </button>
    );
  }

  return (
    <section>
      <div className="rule-title mb-3">
        <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><PackageOpen size={16} /> Inventory</h4>
      </div>
      <div className="mb-2 flex items-center justify-end text-xs text-[var(--muted)]">
        <span className="font-black">{mainItems.filter((item) => item.slot_index < slotCount).length}/{slotCount}</span>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {Array.from({ length: slotCount }, (_, index) => renderSlot(mainItems.find((entry) => entry.slot_index === index), index, null))}
      </div>

      {storageItems.map((storage) => {
        const contents = items.filter((item) => item.parent_item_id === storage.id);
        const isBagOfHolding = storage.item_name.trim().toLowerCase() === 'bag of holding';
        const highestUsedSlot = contents.reduce((highest, item) => Math.max(highest, item.slot_index), -1);
        const capacity = isBagOfHolding
          ? Math.max(contents.length + 1, highestUsedSlot + 2, 1)
          : Math.max(1, storage.storage_capacity);
        return (
          <details
            key={storage.id}
            className={`mt-4 rounded-2xl border border-[#63b5a538] bg-[#63b5a508] p-3 ${isBagOfHolding ? 'rarity-card rarity-mythical' : ''}`}
            open={openStorageIds.has(storage.id)}
            onToggle={(event) => setStorageOpen(storage.id, event.currentTarget.open)}
          >
            <summary className="mb-3 flex cursor-pointer list-none items-center gap-3 text-left">
              <span className="rounded-xl bg-[#63b5a518] p-2 text-[var(--teal)]"><PackageOpen size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-black">{storage.item_name}</span><span className="text-xs text-[var(--muted)]">{isBagOfHolding ? `∞ storage · ${contents.length} items` : `${contents.length}/${capacity} storage slots`}</span></span>
              <ChevronDown size={17} className={`shrink-0 text-[var(--muted)] transition ${openStorageIds.has(storage.id) ? 'rotate-180' : ''}`} />
            </summary>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {Array.from({ length: capacity }, (_, index) => renderSlot(contents.find((entry) => entry.slot_index === index), index, storage.id))}
            </div>
          </details>
        );
      })}

      {(selectedItem || emptyTarget) && (
        <Modal onClose={closeEditor}>
          <form onSubmit={saveItem} className="surface w-full max-w-xl rounded-2xl p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{selectedItem?.rarity ?? (selectedItem ? 'Inventory item' : 'Empty slot')}</p>
                <h5 className="mt-1 text-xl font-black">{selectedItem?.item_name ?? 'Add an item'}</h5>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>

            {action === 'inspect' && canEdit && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Item name</span><input className="field" required value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Type</span><select className="field" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as InventoryItemType })}>{itemTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Quantity</span><NumberInput className="field" min={1} value={form.quantity} onValueChange={(quantity) => setForm({ ...form, quantity })} /></label>
                {form.item_type === 'weapon' && spells.length > 0 && (
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Imbued spell</span>
                    <select className="field" value={form.imbued_spell_id} onChange={(event) => setForm({ ...form, imbued_spell_id: event.target.value })}>
                      <option value="">No imbued spell</option>
                      {spells.map((spell) => <option key={spell.id} value={spell.id}>{spell.category} · {spell.name}</option>)}
                    </select>
                  </label>
                )}
                {selectedItem?.is_storage && <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Storage slots</span><NumberInput className="field" min={1} max={500} value={form.storage_capacity} onValueChange={(storage_capacity) => setForm({ ...form, storage_capacity })} /></label>}
                {!selectedItem?.is_storage && <button type="button" onClick={() => setForm({ ...form, equipped: !form.equipped })} className={`sm:col-span-2 flex items-center justify-between rounded-xl border p-3 text-sm font-bold ${form.equipped ? 'border-[var(--teal)] bg-[#63b5a510]' : 'border-[var(--line)]'}`}>Mark as equipped {form.equipped && <Check size={18} />}</button>}
              </div>
            )}

            {action === 'inspect' && selectedItem && !canEdit && (
              <div className="rounded-xl border border-[var(--line)] bg-black/20 p-4 text-center">
                <ItemIcon type={selectedItem.item_type} size={26} />
                <p className="mt-2 font-black">{selectedItem.item_type}</p>
                {selectedItem.item_type === 'weapon' && imbuedSpellName(selectedItem.notes) && <p className="mt-1 text-sm font-bold text-[var(--brass)]">Imbued: {imbuedSpellName(selectedItem.notes)}</p>}
                <p className="text-sm text-[var(--muted)]">Quantity: {selectedItem.quantity}{selectedItem.is_storage ? ` · ${selectedItem.storage_capacity} storage slots` : ''}</p>
              </div>
            )}

            {selectedItem && action !== 'inspect' && (
              <section className="rounded-xl border border-[var(--line)] bg-black/20 p-3">
                <div className="mb-3 flex items-center justify-between"><h6 className="font-black">{action === 'drop' ? 'Drop item' : 'Give item'}</h6><button type="button" onClick={() => setAction('inspect')} className="rounded-lg border border-[var(--line)] p-1.5"><X size={15} /></button></div>
                {action === 'give' && (
                  <label className="mb-2 block">
                    <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Send to</span>
                    <select className="field" value={transferTargetId} onChange={(event) => setTransferTargetId(event.target.value)}>
                      {characters.map((entry) => {
                        const free = capacities.find((capacity) => capacity.character_id === entry.id)?.free_slots ?? 0;
                        return <option key={entry.id} value={entry.id} disabled={free <= 0 && !selectedItem.is_storage}>{entry.name} · {free > 0 || selectedItem.is_storage ? `${free} spaces` : 'FULL'}</option>;
                      })}
                    </select>
                  </label>
                )}
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Amount</span><NumberInput className="field" min={1} max={selectedItem.quantity} value={actionQuantity} onValueChange={setActionQuantity} /></label>
                {action === 'give' && !selectedItem.is_storage && targetCapacity <= 0 && <p className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--red)]"><AlertTriangle size={14} /> That character’s inventory is full.</p>}
                <button type="button" onClick={action === 'drop' ? dropItem : requestTransfer} disabled={busy || (action === 'give' && !selectedItem.is_storage && targetCapacity <= 0)} className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-40 ${action === 'drop' ? 'border border-[#d76a6255] text-[var(--red)]' : 'teal-button'}`}>
                  {action === 'drop' ? <Trash2 size={17} /> : <Send size={17} />} {busy ? 'Working…' : action === 'drop' ? `Drop ${Math.max(1, actionQuantity)}` : `Send ${Math.max(1, actionQuantity)}`}
                </button>
              </section>
            )}

            {message && <p className="mt-3 rounded-xl border border-[var(--line)] p-3 text-xs text-[var(--red)]">{message}</p>}
            {action === 'inspect' && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedItem && mayManage && <button type="button" onClick={() => { setAction('drop'); setActionQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#d76a6255] px-4 py-3 text-sm font-black text-[var(--red)]"><Trash2 size={17} /> Drop</button>}
                {selectedItem && mayManage && characters.length > 0 && <button type="button" onClick={() => { setAction('give'); setActionQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#9caf7955] px-4 py-3 text-sm font-black text-[var(--teal)]"><Send size={17} /> Give</button>}
                {canEdit && <button disabled={busy} className="primary-button min-w-32 flex-1 rounded-xl px-4 py-3 font-black">{selectedItem ? 'Save item' : 'Add item'}</button>}
              </div>
            )}
          </form>
        </Modal>
      )}
    </section>
  );
}
