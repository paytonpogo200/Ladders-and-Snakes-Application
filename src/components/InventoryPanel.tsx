'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type DragEvent } from 'react';
import { AlertTriangle, Apple, Box, Check, ChevronDown, FlaskConical, Home, Leaf, PackageOpen, PawPrint, Pickaxe, Plus, ScrollText, Send, Shield, Shirt, Sparkles, Sword, Trash2, Wrench, X, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NumberInput from '@/components/NumberInput';
import Modal from '@/components/Modal';
import { rarityClass } from '@/lib/rarity';
import { createDebouncedRefresh } from '@/lib/realtime';
import { ITEM_CATALOG, type ItemCatalogEntry } from '@/lib/itemCatalog';
import { storageCapacityForItem } from '@/lib/itemTyping';
import { GLASS_FLASK_CATALOG_ITEM, isPotionItem, potionEffect } from '@/lib/itemCatalogTools';
import { ATTRIBUTE_KEYS, ATTRIBUTE_LABELS, type Character, type CharacterAttributes, type CharacterTransferCapacity, type InventoryItem, type InventoryItemType, type Profile, type Spell } from '@/lib/types';

const itemTypes: { value: InventoryItemType; label: string; icon: LucideIcon }[] = [
  { value: 'weapon', label: 'Weapon', icon: Sword },
  { value: 'armor', label: 'Armor', icon: Shield },
  { value: 'shield' as InventoryItemType, label: 'Shield', icon: Shield },
  { value: 'pet' as InventoryItemType, label: 'Pet', icon: PawPrint },
  { value: 'accessory', label: 'Accessory', icon: Sparkles },
  { value: 'storage', label: 'Storage', icon: PackageOpen },
  { value: 'ore', label: 'Ore', icon: Pickaxe },
  { value: 'potion', label: 'Potion', icon: FlaskConical },
  { value: 'food', label: 'Food', icon: Apple },
  { value: 'plant', label: 'Plant', icon: Leaf },
  { value: 'fabric', label: 'Fabric', icon: Shirt },
  { value: 'tool', label: 'Tool', icon: Wrench },
  { value: 'quest', label: 'Quest', icon: ScrollText },
  { value: 'misc', label: 'Misc.', icon: Box }
];

const legacyItemTypes: { value: InventoryItemType; label: string; icon: LucideIcon }[] = [
  { value: 'consumable', label: 'Consumable', icon: FlaskConical }
];

type AttributeModifierMap = Partial<Record<keyof CharacterAttributes, number>>;
type ModifierFormState = Record<keyof CharacterAttributes, string>;
type InventoryItemWithLock = InventoryItem & { is_trade_locked?: boolean | null; modifiers?: AttributeModifierMap | null; legendary_display_text?: string | null };
const rarityOptions = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythical'];

function emptyModifierForm(): ModifierFormState {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, ''])) as ModifierFormState;
}

function modifierNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function modifierFormFromItem(modifiers?: AttributeModifierMap | null): ModifierFormState {
  const form = emptyModifierForm();
  ATTRIBUTE_KEYS.forEach((key) => {
    const value = modifierNumber(modifiers?.[key]);
    if (value !== 0) form[key] = String(value);
  });
  return form;
}

function hasModifierValues(modifiers?: AttributeModifierMap | null) {
  return ATTRIBUTE_KEYS.some((key) => modifierNumber(modifiers?.[key]) !== 0);
}

function cleanModifierInput(input: ModifierFormState): AttributeModifierMap {
  return ATTRIBUTE_KEYS.reduce((modifiers, key) => {
    const raw = input[key];
    const value = Number(raw);
    if (raw !== '' && Number.isFinite(value) && value !== 0) modifiers[key] = value;
    return modifiers;
  }, {} as AttributeModifierMap);
}

function imbuedSpellName(notes?: string | null) {
  return notes?.match(/Imbued spell:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
}

function legendaryDescription(notes?: string | null) {
  return notes?.match(/Legendary Weapon:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
}

function legendaryDisplayText(item?: InventoryItemWithLock | null) {
  return (item?.legendary_display_text ?? '').trim();
}

function imbueNotes(spellName: string) {
  return spellName ? `Imbued spell: ${spellName}` : '';
}

function legendaryNotes(description: string, spellName: string) {
  const chunks: string[] = [];
  if (description.trim()) chunks.push(`Legendary Weapon: ${description.trim()}`);
  if (spellName.trim()) chunks.push(imbueNotes(spellName.trim()));
  return chunks.join('\n');
}

function itemTypeValue(item: InventoryItem | { item_type: InventoryItemType } | null | undefined) {
  return String(item?.item_type ?? '');
}

function normalizeStackName(value?: string | null) {
  return String(value ?? '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeStackRarity(value?: string | null) {
  return String(value || 'Common').toLowerCase().trim();
}

function stableSpecialSignature(item: InventoryItemWithLock) {
  return JSON.stringify({
    notes: String(item.notes ?? '').trim(),
    modifiers: item.modifiers ?? null,
    legendary_display_text: String(item.legendary_display_text ?? '').trim(),
    storage_capacity: Number(item.storage_capacity ?? 0)
  });
}

function canStackItems(source: InventoryItemWithLock, target: InventoryItemWithLock) {
  if (source.id === target.id) return false;
  if (source.is_storage || target.is_storage) return false;
  return normalizeStackName(source.item_name) === normalizeStackName(target.item_name)
    && normalizeStackRarity(source.rarity) === normalizeStackRarity(target.rarity)
    && stableSpecialSignature(source) === stableSpecialSignature(target);
}

function ItemIcon({ type, size = 19 }: { type: InventoryItemType; size?: number }) {
  const Icon = itemTypes.find((entry) => String(entry.value) === String(type))?.icon ?? legacyItemTypes.find((entry) => entry.value === type)?.icon ?? Box;
  return <Icon size={size} />;
}

export default function InventoryPanel({ character, canEdit, profile, refreshSignal = 0, externalDragTargetKey = null, onCharacterChanged }: { character: Character; canEdit: boolean; profile: Profile; refreshSignal?: number; externalDragTargetKey?: string | null; onCharacterChanged?: () => void }) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<InventoryItemWithLock[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<{ slot: number; parentId: string | null } | null>(null);
  const [action, setAction] = useState<'inspect' | 'drop' | 'give' | 'house'>('inspect');
  const [message, setMessage] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [capacities, setCapacities] = useState<CharacterTransferCapacity[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [transferTargetId, setTransferTargetId] = useState('');
  const [actionQuantity, setActionQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragTargetKey, setDragTargetKey] = useState<string | null>(null);
  const [dragGhost, setDragGhost] = useState<{ item: InventoryItemWithLock; x: number; y: number } | null>(null);
  const [openStorageIds, setOpenStorageIds] = useState<Set<string>>(() => new Set());
  const [addMode, setAddMode] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const dragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragCandidate = useRef<{ item: InventoryItemWithLock; x: number; y: number } | null>(null);
  const draggingItem = useRef<InventoryItemWithLock | null>(null);
  const dragTarget = useRef<{ slot: number; parentId: string | null } | null>(null);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDirection = useRef(0);
  const suppressClick = useRef(false);
  const [form, setForm] = useState({
    item_name: '',
    quantity: 1,
    item_type: 'misc' as InventoryItemType,
    rarity: 'Common',
    imbued_spell_id: '',
    equipped: false,
    storage_capacity: 0,
    legendary_weapon: false,
    legendary_description: '',
    legendary_display_text: '',
    modifiers_enabled: false,
    modifiers: emptyModifierForm()
  });

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const slotCount = Math.max(0, Math.min(100, character.inventory_slots ?? 20));
  const mainItems = items.filter((item) => item.parent_item_id === null && !item.is_storage && !item.equipped);
  const storageItems = items.filter((item) => item.is_storage);
  const mayManage = profile.role === 'dm' || character.owner_user_id === profile.id;
  const targetCapacity = capacities.find((entry) => entry.character_id === transferTargetId)?.free_slots ?? 0;
  const catalogMatches = useMemo(() => {
    const query = catalogSearch.trim().toLowerCase();
    return ITEM_CATALOG
      .filter((entry) => {
        if (!query) return true;
        return `${entry.name} ${entry.category} ${entry.rarity} ${entry.item_type}`.toLowerCase().includes(query);
      })
      .slice(0, 90);
  }, [catalogSearch]);

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
    autoScrollTimer.current = setInterval(() => window.scrollBy({ top: direction * 9, behavior: 'auto' }), 24);
  }

  function resetDrag() {
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragTimer.current = null;
    dragCandidate.current = null;
    draggingItem.current = null;
    dragTarget.current = null;
    setDraggingItemId(null);
    setDragTargetKey(null);
    setDragGhost(null);
    stopAutoScroll();
    document.body.classList.remove('inventory-drag-active');
  }

  async function loadItems() {
    const { data, error } = await supabase.from('inventory_items').select('*').eq('character_id', character.id).order('created_at');
    if (!error) setItems((data ?? []) as InventoryItemWithLock[]);
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
  }, [refreshSignal]);

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
    function pointerMove(event: globalThis.PointerEvent) {
      const candidate = dragCandidate.current;
      if (candidate && !draggingItem.current) {
        event.preventDefault();
        setAutoScroll(event.clientY < 92 ? -1 : event.clientY > window.innerHeight - 92 ? 1 : 0);
      }
      if (!draggingItem.current) return;
      event.preventDefault();
      setDragGhost({ item: draggingItem.current, x: event.clientX, y: event.clientY });
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-inventory-slot]') as HTMLElement | null;
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
        window.setTimeout(() => {
          suppressClick.current = false;
        }, 80);
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

  function beginLongPress(item: InventoryItemWithLock, event: PointerEvent<HTMLButtonElement>) {
    if (!mayManage || item.is_storage || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (dragTimer.current) clearTimeout(dragTimer.current);
    dragCandidate.current = { item, x: event.clientX, y: event.clientY };
    dragTimer.current = setTimeout(() => {
      draggingItem.current = item;
      setDraggingItemId(item.id);
      setDragGhost({ item, x: event.clientX, y: event.clientY });
      document.body.classList.add('inventory-drag-active');
      if (navigator.vibrate) navigator.vibrate(18);
    }, 380);
  }

  function beginNativeDrag(item: InventoryItemWithLock, event: DragEvent<HTMLButtonElement>) {
    if (!mayManage || item.is_storage) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/x-inventory-item-id', item.id);
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingItemId(item.id);
  }

  async function moveItem(item: InventoryItemWithLock, slot: number, parentId: string | null) {
    setMessage('');
    const stacked = await stackItemIntoSlot(item, slot, parentId);
    if (stacked) return;
    const { error } = await supabase.rpc('move_inventory_item_slot', {
      target_item_id: item.id,
      target_parent_item_id: parentId,
      target_slot_index: slot
    });
    if (error) setMessage(error.message);
    await loadItems();
  }

  async function stackItemIntoSlot(item: InventoryItemWithLock, slot: number, parentId: string | null) {
    const target = items.find((entry) => (
      entry.slot_index === slot
      && entry.parent_item_id === parentId
      && !entry.equipped
      && !entry.is_storage
    ));
    if (!target || !canStackItems(item, target)) return false;

    const targetQuantity = Math.max(1, Number(target.quantity) || 1);
    const itemQuantity = Math.max(1, Number(item.quantity) || 1);
    const patch: Partial<InventoryItemWithLock> = { quantity: targetQuantity + itemQuantity };
    if (target.item_type === 'misc' && item.item_type !== 'misc') patch.item_type = item.item_type;

    const { error: updateError } = await supabase.from('inventory_items').update(patch).eq('id', target.id);
    if (updateError) {
      setMessage(updateError.message);
      await loadItems();
      return true;
    }

    const { error: deleteError } = await supabase.from('inventory_items').delete().eq('id', item.id);
    if (deleteError) setMessage(deleteError.message);
    else setMessage(`${target.item_name} stacked to ×${targetQuantity + itemQuantity}.`);
    await loadItems();
    return true;
  }

  async function unequipItem(itemId: string) {
    const { error } = await supabase.rpc('unequip_inventory_item', { target_item_id: itemId });
    if (error) setMessage(error.message);
    await loadItems();
  }

  async function dropNativeDraggedItem(event: DragEvent<HTMLButtonElement>, slot: number, parentId: string | null) {
    const itemId = event.dataTransfer.getData('application/x-inventory-item-id') || event.dataTransfer.getData('text/plain');
    if (!itemId) return;
    const fromLoadout = event.dataTransfer.getData('application/x-loadout-source') === 'true';
    if (fromLoadout) {
      event.preventDefault();
      const dragged = items.find((entry) => entry.id === itemId);
      if (dragged) {
        const stacked = await stackItemIntoSlot(dragged, slot, parentId);
        if (stacked) {
          setDragTargetKey(null);
          return;
        }
      }
      const { error: moveError } = await supabase.rpc('move_inventory_item_slot', {
        target_item_id: itemId,
        target_parent_item_id: parentId,
        target_slot_index: slot
      });
      if (moveError) {
        setMessage(moveError.message);
        return;
      }
      await unequipItem(itemId);
      setDragTargetKey(null);
      await loadItems();
      return;
    }
    const dragged = items.find((entry) => entry.id === itemId);
    if (!dragged || dragged.is_storage) return;

    event.preventDefault();
    if (dragged.slot_index !== slot || dragged.parent_item_id !== parentId) {
      await moveItem(dragged, slot, parentId);
    }
  }

  function openItem(item: InventoryItemWithLock) {
    const matchedSpell = spells.find((spell) => spell.name === imbuedSpellName(item.notes));
    setSelectedItemId(item.id);
    setEmptyTarget(null);
    setAction('inspect');
    setActionQuantity(1);
    setMessage('');
    setForm({
      item_name: item.item_name,
      quantity: item.quantity,
      item_type: item.item_type,
      rarity: item.rarity ?? 'Common',
      imbued_spell_id: matchedSpell?.id ?? '',
      equipped: item.equipped,
      storage_capacity: item.storage_capacity ?? 0,
      legendary_weapon: itemTypeValue(item) === 'weapon' && Boolean(legendaryDescription(item.notes) || legendaryDisplayText(item)),
      legendary_description: legendaryDescription(item.notes),
      legendary_display_text: legendaryDisplayText(item),
      modifiers_enabled: hasModifierValues(item.modifiers),
      modifiers: modifierFormFromItem(item.modifiers)
    });
  }

  function openEmpty(slot: number, parentId: string | null) {
    if (!canEdit) return;
    setSelectedItemId(null);
    setEmptyTarget({ slot, parentId });
    setAction('inspect');
    setMessage('');
    setAddMode('catalog');
    setCatalogSearch('');
    setForm({ item_name: '', quantity: 1, item_type: 'misc', rarity: 'Common', imbued_spell_id: '', equipped: false, storage_capacity: 0, legendary_weapon: false, legendary_description: '', legendary_display_text: '', modifiers_enabled: false, modifiers: emptyModifierForm() });
  }

  function chooseCatalogItem(entry: ItemCatalogEntry) {
    const storageCapacity = storageCapacityForItem(entry.name);
    setForm((current) => ({
      ...current,
      item_name: entry.name,
      quantity: Math.max(1, entry.min_quantity || 1),
      item_type: entry.item_type,
      rarity: entry.rarity || 'Common',
      storage_capacity: entry.item_type === 'storage' ? Math.max(1, storageCapacity || current.storage_capacity || 1) : storageCapacity,
      legendary_weapon: false
    }));
  }

  function closeEditor() {
    setSelectedItemId(null);
    setEmptyTarget(null);
    setAction('inspect');
    setMessage('');
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || !form.item_name.trim()) return;
    setBusy(true);
    const spellName = spells.find((spell) => spell.id === form.imbued_spell_id)?.name ?? '';
    const isLegendaryWeapon = itemTypeValue(form) === 'weapon' && form.legendary_weapon;
    const isStorageType = itemTypeValue(form) === 'storage' || Number(form.storage_capacity) > 0;
    const payload = {
      item_name: form.item_name.trim(),
      quantity: Math.max(1, Number(form.quantity) || 1),
      item_type: form.item_type,
      notes: itemTypeValue(form) === 'weapon'
        ? isLegendaryWeapon
          ? legendaryNotes(form.legendary_description, spellName)
          : imbueNotes(spellName)
        : '',
      rarity: isLegendaryWeapon ? 'Legendary' : (form.rarity || 'Common'),
      legendary_display_text: isLegendaryWeapon ? form.legendary_display_text.trim() : '',
      equipped: form.equipped,
      modifiers: form.modifiers_enabled ? cleanModifierInput(form.modifiers) : {}
    };

    const result = selectedItem
      ? await supabase.from('inventory_items').update({ ...payload, is_storage: isStorageType, storage_capacity: isStorageType ? Math.max(1, Number(form.storage_capacity) || 1) : 0 }).eq('id', selectedItem.id)
      : await supabase.from('inventory_items').insert({ ...payload, character_id: character.id, slot_index: emptyTarget?.slot ?? 0, parent_item_id: emptyTarget?.parentId ?? null, is_storage: isStorageType, storage_capacity: isStorageType ? Math.max(1, Number(form.storage_capacity) || 1) : 0 });

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
    setMessage('Transfer request sent.\nIt will remain available until accepted, declined, or cancelled.');
    setAction('inspect');
    await loadTransferOptions();
  }

  async function sendToHouse() {
    if (!selectedItem) return;
    setBusy(true);
    setMessage('');
    const { error } = await supabase.rpc('move_inventory_item_to_house', {
      target_source_item_id: selectedItem.id,
      move_quantity: Math.max(1, Math.min(selectedItem.quantity, actionQuantity || 1))
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    closeEditor();
    await loadItems();
  }

  async function addGlassFlaskAfterUse(consumedItem: InventoryItemWithLock) {
    const existingFlasks = items.find((item) =>
      item.id !== consumedItem.id
      && item.parent_item_id === null
      && !item.equipped
      && !item.is_storage
      && item.item_name.trim().toLowerCase() === GLASS_FLASK_CATALOG_ITEM.name.toLowerCase()
    );
    if (existingFlasks) {
      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: existingFlasks.quantity + 1, rarity: GLASS_FLASK_CATALOG_ITEM.rarity, item_type: GLASS_FLASK_CATALOG_ITEM.item_type })
        .eq('id', existingFlasks.id);
      return error;
    }

    const occupied = new Set(
      items
        .filter((item) => item.parent_item_id === null && !item.equipped && !item.is_storage && (item.id !== consumedItem.id || consumedItem.quantity > 1))
        .map((item) => item.slot_index)
    );
    const freeSlot = Array.from({ length: slotCount }, (_, index) => index).find((slot) => !occupied.has(slot));
    if (freeSlot === undefined) {
      const proceed = window.confirm('No room for the empty glass flask. It will be dropped if you consume this potion. Proceed?');
      return proceed ? null : new Error('Potion use cancelled.');
    }

    const { error } = await supabase.from('inventory_items').insert({
      character_id: character.id,
      item_name: GLASS_FLASK_CATALOG_ITEM.name,
      quantity: 1,
      notes: '',
      item_type: GLASS_FLASK_CATALOG_ITEM.item_type,
      rarity: GLASS_FLASK_CATALOG_ITEM.rarity,
      slot_index: freeSlot,
      parent_item_id: null,
      is_storage: false,
      storage_capacity: 0,
      equipped: false
    });
    return error;
  }

  async function consumePotion() {
    if (!selectedItem || !mayManage || !isPotionItem(selectedItem.item_type, selectedItem.item_name)) return;
    setBusy(true);
    setMessage('');

    const effect = potionEffect(selectedItem.item_name);
    if (effect?.kind === 'hp' && character.current_hp >= character.max_hp) {
      setBusy(false);
      setMessage(`${character.name}'s Health is already full.`);
      return;
    }
    if (effect?.kind === 'mana' && character.current_mana >= character.max_mana) {
      setBusy(false);
      setMessage(`${character.name}'s Mana is already full.`);
      return;
    }

    const flaskError = await addGlassFlaskAfterUse(selectedItem);
    if (flaskError) {
      setBusy(false);
      setMessage(flaskError.message);
      return;
    }

    if (effect) {
      const nextStats = effect.kind === 'hp'
        ? { current_hp: Math.min(character.max_hp, character.current_hp + effect.amount) }
        : { current_mana: Math.min(character.max_mana, character.current_mana + effect.amount) };
      const { error: characterError } = await supabase.from('characters').update(nextStats).eq('id', character.id);
      if (characterError) {
        setBusy(false);
        setMessage(characterError.message);
        return;
      }
      await supabase.from('combatants').update(nextStats).eq('character_id', character.id);
    }

    const itemResult = selectedItem.quantity > 1
      ? await supabase.from('inventory_items').update({ quantity: selectedItem.quantity - 1 }).eq('id', selectedItem.id)
      : await supabase.from('inventory_items').delete().eq('id', selectedItem.id);

    setBusy(false);
    if (itemResult.error) return setMessage(itemResult.error.message);
    const restoreAmountText = effect && Number.isFinite(effect.amount) ? `by ${effect.amount}` : 'to full';
    const restoreText = effect ? ` ${effect.kind === 'hp' ? 'Restored Health' : 'Restored Mana'} ${restoreAmountText}.` : '';
    setMessage(`${selectedItem.item_name} consumed.${restoreText} Empty glass flask recovered.`);
    closeEditor();
    await loadItems();
    onCharacterChanged?.();
  }

  function renderSlot(item: InventoryItemWithLock | undefined, slot: number, parentId: string | null) {
    const key = slotKey(slot, parentId);
    const spellName = item ? imbuedSpellName(item.notes) : '';
    const enchantedClass = item && spellName ? 'inventory-enchanted-outline' : '';
    return (
      <button
        key={key}
        type="button"
        data-inventory-slot
        data-slot-index={slot}
        data-parent-id={parentId ?? 'main'}
        draggable={!!item && mayManage && !item.is_storage}
        onDragStart={(event) => item && beginNativeDrag(item, event)}
        onDragEnd={() => setDraggingItemId(null)}
        onDragOver={(event) => {
          if (Array.from(event.dataTransfer.types).includes('application/x-inventory-item-id')) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            setDragTargetKey(key);
          }
        }}
        onDragLeave={() => setDragTargetKey((current) => (current === key ? null : current))}
        onDrop={(event) => dropNativeDraggedItem(event, slot, parentId)}
        onPointerDown={(event) => item && beginLongPress(item, event)}
        onClick={() => {
          if (suppressClick.current) return;
          item ? openItem(item) : openEmpty(slot, parentId);
        }}
        className={`inventory-slot relative flex aspect-square min-h-24 flex-col items-center justify-center rounded-xl border p-2 text-center transition active:scale-95 sm:min-h-16 sm:p-2 ${
          item ? rarityClass(item.rarity) : 'border-dashed border-[var(--line)] bg-black/10'
        } ${enchantedClass} ${!item && !canEdit ? 'cursor-default' : ''} ${draggingItemId === item?.id ? 'inventory-slot-dragging' : ''} ${dragTargetKey === key || externalDragTargetKey === key ? 'inventory-slot-target' : ''}`}
      >
        <span className="pointer-events-none absolute left-2 top-1.5 text-[9px] font-black text-[var(--muted)]">{slot + 1}</span>
        {item ? (
          <>
            <span className="mb-1 text-[var(--brass)]"><ItemIcon type={item.item_type} /></span>
            <span className="inventory-item-name line-clamp-2 text-xs font-black leading-4">{item.item_name}</span>
            {item.quantity > 1 && <span className="mt-1 rounded-full bg-black/40 px-1.5 text-[10px] font-black">×{item.quantity}</span>}
            {item.equipped && <Check className="absolute right-1.5 top-1.5 text-[var(--teal)]" size={13} />}
            {item.is_trade_locked && <span className="absolute bottom-1 right-1 rounded-full border border-[#d1a85b66] bg-black/40 px-1 text-[8px] font-black text-[var(--brass)]">UNIQUE</span>}
          </>
        ) : canEdit ? <Plus className="text-[var(--muted)]" size={16} /> : null}
      </button>
    );
  }

  return (
    <section className="surface rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Inventory</p>
          <h3 className="text-xl font-black">Carried Items</h3>
        </div>
        <div className="rounded-full border border-[var(--line)] bg-black/20 px-3 py-1 text-xs font-black text-[var(--muted)]">
          {mainItems.filter((item) => item.slot_index < slotCount).length}/{slotCount}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: slotCount }, (_, index) => renderSlot(mainItems.find((entry) => entry.slot_index === index), index, null))}
      </div>

      {storageItems.length > 0 && (
        <div className="mt-4 space-y-3">
          {storageItems.map((storage) => {
            const contents = items.filter((item) => item.parent_item_id === storage.id);
            const isBagOfHolding = storage.item_name.trim().toLowerCase() === 'bag of holding';
            const highestUsedSlot = contents.reduce((highest, item) => Math.max(highest, item.slot_index), -1);
            const capacity = isBagOfHolding ? Math.max(contents.length + 1, highestUsedSlot + 2, 1) : Math.max(1, storage.storage_capacity);
            const open = openStorageIds.has(storage.id);
            return (
              <details key={storage.id} open={open} onToggle={(event) => setStorageOpen(storage.id, event.currentTarget.open)} className="rounded-2xl border border-[#d1a85b2f] bg-black/15">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-3">
                  <span className="flex items-center gap-2 font-black"><PackageOpen size={17} /> {storage.item_name}</span>
                  <span className="flex items-center gap-2 text-xs font-black text-[var(--muted)]">
                    {isBagOfHolding ? `∞ storage · ${contents.length} items` : `${contents.length}/${capacity} storage slots`}
                    <ChevronDown size={14} />
                  </span>
                </summary>
                <div className="grid grid-cols-4 gap-2 border-t border-[#d1a85b1f] p-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
                  {Array.from({ length: capacity }, (_, index) => renderSlot(contents.find((entry) => entry.slot_index === index), index, storage.id))}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {(selectedItem || emptyTarget) && (
        <Modal onClose={closeEditor}>
          <form onSubmit={saveItem} className="surface max-h-[90vh] w-[min(94vw,38rem)] overflow-y-auto rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">{selectedItem?.rarity ?? (selectedItem ? 'Inventory item' : 'Empty slot')}</p>
                <h3 className="text-2xl font-black">{selectedItem?.item_name ?? 'Add an item'}</h3>
              </div>
              <button type="button" onClick={closeEditor} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>

            {action === 'inspect' && canEdit && (
              <div className="grid gap-3 sm:grid-cols-2">
                {!selectedItem && (
                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1 text-xs font-black">
                      <button type="button" onClick={() => setAddMode('catalog')} className={`rounded-md py-2 ${addMode === 'catalog' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Item list</button>
                      <button type="button" onClick={() => setAddMode('custom')} className={`rounded-md py-2 ${addMode === 'custom' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Custom item</button>
                    </div>
                    {addMode === 'catalog' && (
                      <div className="mt-2 rounded-2xl border border-[#d1a85b30] bg-black/15 p-2">
                        <input
                          className="field mb-2"
                          value={catalogSearch}
                          onChange={(event) => setCatalogSearch(event.target.value)}
                          placeholder="Search item list"
                        />
                        <div className="grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          {catalogMatches.map((entry) => (
                            <button
                              key={entry.key}
                              type="button"
                              onClick={() => chooseCatalogItem(entry)}
                              className={`rounded-xl border p-3 text-left text-xs transition hover:-translate-y-0.5 ${rarityClass(entry.rarity)} ${form.item_name === entry.name ? 'ring-2 ring-[var(--paper)]' : ''}`}
                            >
                              <span className="block font-black text-[var(--paper)]">{entry.name}</span>
                              <span className="mt-1 block text-[10px] font-black uppercase tracking-wider">{entry.rarity} · {entry.item_type} · {entry.category}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Item name</span>
                  <input className="field" value={form.item_name} onChange={(event) => setForm({ ...form, item_name: event.target.value })} />
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Type</span>
                  <select className="field" value={String(form.item_type)} onChange={(event) => setForm({ ...form, item_type: event.target.value as InventoryItemType, legendary_weapon: event.target.value === 'weapon' ? form.legendary_weapon : false })}>
                    {itemTypes.map((type) => <option key={String(type.value)} value={String(type.value)}>{type.label}</option>)}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Quantity</span>
                  <NumberInput className="field" min={1} value={form.quantity} onValueChange={(quantity) => setForm({ ...form, quantity })} />
                </label>
                <label>
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Rarity</span>
                  <select className="field" value={form.rarity} onChange={(event) => setForm({ ...form, rarity: event.target.value })}>
                    {rarityOptions.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}
                  </select>
                </label>
                {itemTypeValue(form) === 'weapon' && spells.length > 0 && (
                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Imbued spell</span>
                    <select className="field" value={form.imbued_spell_id} onChange={(event) => setForm({ ...form, imbued_spell_id: event.target.value })}>
                      <option value="">No imbued spell</option>
                      {spells.map((spell) => <option key={spell.id} value={spell.id}>{spell.category} · {spell.name}</option>)}
                    </select>
                  </label>
                )}
                {(selectedItem?.is_storage || itemTypeValue(form) === 'storage') && (
                  <label>
                    <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Storage slots</span>
                    <NumberInput className="field" min={1} max={500} value={form.storage_capacity} onValueChange={(storage_capacity) => setForm({ ...form, storage_capacity })} />
                  </label>
                )}
                {itemTypeValue(form) === 'weapon' && (
                  <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                    <input type="checkbox" className="mt-1" checked={form.legendary_weapon} onChange={(event) => setForm({ ...form, legendary_weapon: event.target.checked })} />
                    <span className="grid flex-1 gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Legendary weapon</span>
                      <span className="text-xs leading-5 text-[var(--muted)]">Gives the item the smoother Legendary gold/brass effect and stores its unique ability.</span>
                      {form.legendary_weapon && (
                        <>
                          <textarea className="field min-h-20" value={form.legendary_description} onChange={(event) => setForm({ ...form, legendary_description: event.target.value })} placeholder="What does this legendary weapon do?" />
                          <input className="field" value={form.legendary_display_text} onChange={(event) => setForm({ ...form, legendary_display_text: event.target.value })} placeholder="Brief active loadout display text, ex: Reroll once per combat" />
                        </>
                      )}
                    </span>
                  </label>
                )}
                {itemTypeValue(form) !== 'storage' && (
                  <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                    <input type="checkbox" className="mt-1" checked={form.modifiers_enabled} onChange={(event) => setForm({ ...form, modifiers_enabled: event.target.checked })} />
                    <span className="grid flex-1 gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Item modifiers</span>
                      <span className="text-xs leading-5 text-[var(--muted)]">Only applies while this item is in an active loadout slot.</span>
                      {form.modifiers_enabled && (
                        <div className="modifier-input-grid">
                          {ATTRIBUTE_KEYS.map((key) => (
                            <label key={key}>
                              <span>{ATTRIBUTE_LABELS[key]}</span>
                              <input
                                className="field px-2 py-2 text-center"
                                type="number"
                                step="1"
                                value={form.modifiers[key]}
                                onChange={(event) => setForm({ ...form, modifiers: { ...form.modifiers, [key]: event.target.value } })}
                                placeholder="0"
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </span>
                  </label>
                )}
                {itemTypeValue(form) !== 'storage' && (
                  <button type="button" onClick={() => setForm({ ...form, equipped: !form.equipped })} className={`sm:col-span-2 flex items-center justify-between rounded-xl border p-3 text-sm font-bold ${form.equipped ? 'border-[var(--teal)] bg-[#63b5a510]' : 'border-[var(--line)]'}`}>
                    Mark as equipped {form.equipped && <Check size={16} />}
                  </button>
                )}
              </div>
            )}

            {action === 'inspect' && selectedItem && !canEdit && (
              <div className="rounded-xl border border-[var(--line)] bg-black/15 p-3 text-sm leading-6 text-[var(--muted)]">
                <p className="font-black text-[var(--paper)]">{selectedItem.item_type}</p>
                {itemTypeValue(selectedItem) === 'weapon' && imbuedSpellName(selectedItem.notes) && <p>Imbued: {imbuedSpellName(selectedItem.notes)}</p>}
                {itemTypeValue(selectedItem) === 'weapon' && legendaryDescription(selectedItem.notes) && <p>Legendary ability: {legendaryDescription(selectedItem.notes)}</p>}
                {itemTypeValue(selectedItem) === 'weapon' && legendaryDisplayText(selectedItem) && <p>Active display: {legendaryDisplayText(selectedItem)}</p>}
                <p>Quantity: {selectedItem.quantity}{selectedItem.is_storage ? ` · ${selectedItem.storage_capacity} storage slots` : ''}</p>
                {selectedItem.is_trade_locked && <p className="text-[var(--brass)]">Unique item · cannot be traded.</p>}
              </div>
            )}

            {selectedItem && action !== 'inspect' && (
              <div className="rounded-xl border border-[var(--line)] bg-black/15 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="font-black">{action === 'drop' ? 'Drop item' : action === 'give' ? 'Give item' : 'Send to house'}</h4>
                  <button type="button" onClick={() => setAction('inspect')} className="rounded-lg border border-[var(--line)] p-1.5"><X size={14} /></button>
                </div>
                {action === 'give' && (
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Send to</span>
                    <select className="field" value={transferTargetId} onChange={(event) => setTransferTargetId(event.target.value)}>
                      {characters.map((entry) => {
                        const free = capacities.find((capacity) => capacity.character_id === entry.id)?.free_slots ?? 0;
                        return <option key={entry.id} value={entry.id}>{entry.name} · {free > 0 || selectedItem.is_storage ? `${free} spaces` : 'FULL'}</option>;
                      })}
                    </select>
                  </label>
                )}
                <label className="mt-3 block">
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Amount</span>
                  <NumberInput className="field" min={1} max={selectedItem.quantity} value={actionQuantity} onValueChange={setActionQuantity} disabled={selectedItem.is_storage} />
                </label>
                {action === 'give' && !selectedItem.is_storage && targetCapacity <= 0 && <p className="mt-2 flex items-center gap-2 text-xs text-[var(--red)]"><AlertTriangle size={14} /> That character’s inventory is full.</p>}
                <button
                  type="button"
                  onClick={action === 'drop' ? dropItem : action === 'give' ? requestTransfer : sendToHouse}
                  disabled={busy || (action === 'give' && !selectedItem.is_storage && targetCapacity <= 0)}
                  className="primary-button mt-3 w-full rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40"
                >
                  {busy ? 'Working...' : action === 'drop' ? `Drop ${Math.max(1, actionQuantity)}` : action === 'give' ? `Send ${Math.max(1, actionQuantity)}` : `Store ${Math.max(1, actionQuantity)}`}
                </button>
              </div>
            )}

            {message && <p className="mt-3 whitespace-pre-line rounded-xl border border-[#d1a85b38] bg-[#d1a85b08] p-3 text-xs leading-5 text-[var(--muted)]">{message}</p>}

            {action === 'inspect' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedItem && mayManage && <button type="button" onClick={() => { setAction('drop'); setActionQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#d76a6255] px-4 py-3 text-sm font-black text-[var(--red)]"><Trash2 size={16} /> Drop</button>}
                {selectedItem && mayManage && isPotionItem(selectedItem.item_type, selectedItem.item_name) && <button type="button" onClick={consumePotion} disabled={busy} className="flex items-center gap-2 rounded-xl border border-[#63b5a555] px-4 py-3 text-sm font-black text-[var(--teal)] disabled:opacity-40"><FlaskConical size={16} /> Consume</button>}
                {selectedItem && mayManage && characters.length > 0 && !selectedItem.is_trade_locked && <button type="button" onClick={() => { setAction('give'); setActionQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#9caf7955] px-4 py-3 text-sm font-black text-[var(--teal)]"><Send size={16} /> Give</button>}
                {selectedItem && mayManage && selectedItem.is_trade_locked && <span className="flex items-center gap-2 rounded-xl border border-[#d1a85b55] px-4 py-3 text-sm font-black text-[var(--brass)]">Unique · cannot trade</span>}
                {selectedItem && mayManage && <button type="button" onClick={() => { setAction('house'); setActionQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#e0a64e55] px-4 py-3 text-sm font-black text-[var(--brass)]"><Home size={16} /> House</button>}
                {canEdit && <button type="submit" disabled={busy || !form.item_name.trim()} className="primary-button ml-auto rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40">{selectedItem ? 'Save item' : 'Add item'}</button>}
              </div>
            )}
          </form>
        </Modal>
      )}

      {dragGhost && (
        <div className={`inventory-drag-ghost pointer-events-none fixed z-[100] rounded-xl border px-3 py-2 text-xs font-black shadow-2xl ${rarityClass(dragGhost.item.rarity)} ${imbuedSpellName(dragGhost.item.notes) ? 'inventory-enchanted-outline' : ''}`} style={{ left: dragGhost.x + 12, top: dragGhost.y + 12 }}>
          {dragGhost.item.item_name} ×{dragGhost.item.quantity}
        </div>
      )}
    </section>
  );
}
