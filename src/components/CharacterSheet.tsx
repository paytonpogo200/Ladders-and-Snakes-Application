'use client';

import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent, type PointerEvent } from 'react';
import { Coins, Gift, Heart, PackageOpen, PawPrint, Plus, Save, Shield, Sparkles, Sword, Trash2, UserRound, WandSparkles, X, type LucideIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import InventoryPanel from '@/components/InventoryPanel';
import SpellPanel from '@/components/SpellPanel';
import NumberInput from '@/components/NumberInput';
import Modal from '@/components/Modal';
import TamedBeastsPanel from '@/components/TamedBeastsPanel';
import PropertyPanel from '@/components/PropertyPanel';
import { classAssetToPreset, getClassPreset, type ClassPreset } from '@/lib/classPresets';
import { formatCurrency, signed } from '@/lib/format';
import { rarityClass } from '@/lib/rarity';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  DEFAULT_ATTRIBUTES,
  type Character,
  type CharacterAttributes,
  type CharacterWallet,
  type ClassAsset,
  type CurrencyDenomination,
  type CurrencySystem,
  type InventoryItemType,
  type InventoryItem,
  type CharacterProperty,
  type MarketProduct,
  type Profile,
  type Spell
} from '@/lib/types';

const grantItemTypes: { value: InventoryItemType; label: string }[] = [
  { value: 'weapon', label: 'Weapon' },
  { value: 'armor', label: 'Armor' },
  { value: 'shield' as InventoryItemType, label: 'Shield' },
  { value: 'pet' as InventoryItemType, label: 'Pet' },
  { value: 'ore', label: 'Ore' },
  { value: 'potion', label: 'Potion' },
  { value: 'food', label: 'Food' },
  { value: 'plant', label: 'Plant' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'tool', label: 'Tool' },
  { value: 'quest', label: 'Quest' },
  { value: 'misc', label: 'Misc.' }
];

type LoadoutSlotKey = 'weapon' | 'armor' | 'shield' | 'pet';
type AttributeModifierMap = Partial<Record<keyof CharacterAttributes, number>>;
type ModifierFormState = Record<keyof CharacterAttributes, string>;
type InventoryItemWithModifiers = InventoryItem & { modifiers?: AttributeModifierMap | null; legendary_display_text?: string | null };

function emptyModifierForm(): ModifierFormState {
  return Object.fromEntries(ATTRIBUTE_KEYS.map((key) => [key, ''])) as ModifierFormState;
}

function cleanModifierInput(input: ModifierFormState): AttributeModifierMap {
  return ATTRIBUTE_KEYS.reduce((modifiers, key) => {
    const raw = input[key];
    const value = Number(raw);
    if (raw !== '' && Number.isFinite(value) && value !== 0) modifiers[key] = value;
    return modifiers;
  }, {} as AttributeModifierMap);
}

function modifierNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function modifierLines(item?: InventoryItemWithModifiers | null) {
  const modifiers = item?.modifiers ?? {};
  return ATTRIBUTE_KEYS.map((key) => ({ key, label: ATTRIBUTE_LABELS[key], value: modifierNumber(modifiers[key]) }))
    .filter((entry) => entry.value !== 0);
}

function formatModifier(value: number) {
  return `${value > 0 ? '+' : ''}${value}`;
}

function applyActiveModifiers(base: CharacterAttributes, modifiers: AttributeModifierMap): CharacterAttributes {
  const result = { ...base };
  ATTRIBUTE_KEYS.forEach((key) => {
    result[key] = (result[key] ?? 0) + modifierNumber(modifiers[key]);
  });
  return result;
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

function imbuedSpellName(notes?: string | null) {
  return notes?.match(/Imbued spell:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
}

function legendaryDescription(notes?: string | null) {
  return notes?.match(/Legendary Weapon:\s*([^\n]+)/i)?.[1]?.trim() ?? '';
}

function legendaryDisplayText(item?: InventoryItemWithModifiers | null) {
  return (item?.legendary_display_text ?? '').trim();
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

function typeOfItem(item?: InventoryItem | null) {
  return String(item?.item_type ?? '');
}

export default function CharacterSheet({
  character,
  canEdit,
  readOnly = false,
  profile,
  onSaved
}: {
  character: Character;
  canEdit: boolean;
  readOnly?: boolean;
  profile: Profile;
  onSaved: () => void;
}) {
  const attributes = useMemo(() => ({ ...DEFAULT_ATTRIBUTES, ...(character.attributes ?? {}) }), [character.attributes]);
  const [classPreset, setClassPreset] = useState<ClassPreset | null>(() => getClassPreset(character.class_key || character.class_name));
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: character.name,
    class_name: character.class_name,
    level: character.level ?? 1,
    max_hp: character.max_hp,
    current_hp: character.current_hp,
    max_mana: character.max_mana,
    current_mana: character.current_mana,
    inventory_slots: character.inventory_slots ?? 20,
    spell_slots: character.spell_slots ?? 0,
    personal_passives: character.notes ?? '',
    attributes
  });
  const [saving, setSaving] = useState(false);
  const [currencySystems, setCurrencySystems] = useState<CurrencySystem[]>([]);
  const [denominations, setDenominations] = useState<CurrencyDenomination[]>([]);
  const [wallets, setWallets] = useState<CharacterWallet[]>([]);
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [spells, setSpells] = useState<Spell[]>([]);
  const [equipmentItems, setEquipmentItems] = useState<InventoryItemWithModifiers[]>([]);
  const [properties, setProperties] = useState<CharacterProperty[]>([]);
  const [currencyForm, setCurrencyForm] = useState({ denomination_id: '', amount: 1 });
  const [grantMode, setGrantMode] = useState<'catalog' | 'custom'>('catalog');
  const [grantProductId, setGrantProductId] = useState('');
  const [grantCatalogQuantity, setGrantCatalogQuantity] = useState(1);
  const [grantForm, setGrantForm] = useState({
    name: '',
    quantity: 1,
    item_type: 'misc' as InventoryItemType,
    imbued_spell_id: '',
    storage_capacity: 0,
    legendary_weapon: false,
    legendary_description: '',
    legendary_display_text: '',
    modifiers_enabled: false,
    modifiers: emptyModifierForm()
  });
  const [toolMessage, setToolMessage] = useState('');
  const [hoveredLoadoutSlot, setHoveredLoadoutSlot] = useState<LoadoutSlotKey | null>(null);
  const [selectedLoadoutItem, setSelectedLoadoutItem] = useState<InventoryItemWithModifiers | null>(null);
  const [loadoutAction, setLoadoutAction] = useState<'inspect' | 'drop'>('inspect');
  const [loadoutQuantity, setLoadoutQuantity] = useState(1);
  const [loadoutBusy, setLoadoutBusy] = useState(false);
  const [loadoutDragGhost, setLoadoutDragGhost] = useState<{ item: InventoryItemWithModifiers; x: number; y: number } | null>(null);
  const [loadoutDraggingItemId, setLoadoutDraggingItemId] = useState<string | null>(null);
  const [loadoutForm, setLoadoutForm] = useState({
    item_name: '',
    quantity: 1,
    item_type: 'misc' as InventoryItemType,
    imbued_spell_id: '',
    equipped: true,
    storage_capacity: 0,
    legendary_weapon: false,
    legendary_description: '',
    legendary_display_text: '',
    modifiers_enabled: false,
    modifiers: emptyModifierForm()
  });
  const loadoutDragTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadoutDraggingItem = useRef<InventoryItemWithModifiers | null>(null);
  const loadoutDragTarget = useRef<{ kind: 'loadout'; slot: LoadoutSlotKey } | { kind: 'inventory'; slot: number; parentId: string | null } | null>(null);
  const suppressLoadoutClick = useRef(false);
  const mayManage = profile.role === 'dm' || character.owner_user_id === profile.id;

  function resetGrantForm() {
    setGrantForm({
      name: '',
      quantity: 1,
      item_type: 'misc',
      imbued_spell_id: '',
      storage_capacity: 0,
      legendary_weapon: false,
      legendary_description: '',
      legendary_display_text: '',
      modifiers_enabled: false,
      modifiers: emptyModifierForm()
    });
  }

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('class_assets').select('*').eq('class_key', character.class_key).maybeSingle(),
      supabase.from('currency_systems').select('*'),
      supabase.from('currency_denominations').select('*').order('sort_order'),
      supabase.from('character_wallets').select('*').eq('character_id', character.id),
      supabase.from('market_products').select('*').order('name'),
      supabase.from('spells').select('*').order('category').order('name')
    ]).then(([classResult, systemsResult, denominationsResult, walletsResult, productsResult, spellResult]) => {
      if (classResult.data) setClassPreset(classAssetToPreset(classResult.data as ClassAsset));
      setCurrencySystems((systemsResult.data ?? []) as CurrencySystem[]);
      const loadedDenominations = (denominationsResult.data ?? []) as CurrencyDenomination[];
      setDenominations(loadedDenominations);
      if (!currencyForm.denomination_id && loadedDenominations[0]) {
        setCurrencyForm((current) => ({ ...current, denomination_id: loadedDenominations[0].id }));
      }
      setWallets((walletsResult.data ?? []) as CharacterWallet[]);
      const loadedProducts = (productsResult.data ?? []) as MarketProduct[];
      setProducts(loadedProducts);
      if (!grantProductId && loadedProducts[0]) setGrantProductId(loadedProducts[0].id);
      setSpells((spellResult.data ?? []) as Spell[]);
    });
  }, [character.class_key]);

  async function loadLoadoutStrip() {
    const supabase = createClient();
    const [itemResult, propertyResult] = await Promise.all([
      supabase.from('inventory_items').select('*').eq('character_id', character.id).eq('equipped', true).order('updated_at', { ascending: false }),
      supabase.from('character_properties').select('*').eq('character_id', character.id).order('created_at')
    ]);
    if (!itemResult.error) setEquipmentItems((itemResult.data ?? []) as InventoryItemWithModifiers[]);
    if (!propertyResult.error) setProperties((propertyResult.data ?? []) as CharacterProperty[]);
  }

  useEffect(() => {
    loadLoadoutStrip();
    const supabase = createClient();
    const channel = supabase
      .channel(`character-loadout-${character.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items', filter: `character_id=eq.${character.id}` }, loadLoadoutStrip)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_properties', filter: `character_id=eq.${character.id}` }, loadLoadoutStrip)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [character.id]);

  async function reloadWallets() {
    const { data } = await createClient().from('character_wallets').select('*').eq('character_id', character.id);
    setWallets((data ?? []) as CharacterWallet[]);
  }

  async function adjustCurrency() {
    if (!currencyForm.denomination_id || !currencyForm.amount) return;
    const { error } = await createClient().rpc('dm_adjust_currency', {
      target_character_id: character.id,
      target_denomination_id: currencyForm.denomination_id,
      denomination_amount: Number(currencyForm.amount)
    });
    setToolMessage(error ? error.message : 'Currency updated.');
    if (!error) await reloadWallets();
  }

  async function grantItem() {
    const supabase = createClient();
    const selectedSpell = spells.find((spell) => spell.id === grantForm.imbued_spell_id);
    const itemType = String(grantForm.item_type);
    const isLegendaryWeapon = itemType === 'weapon' && grantForm.legendary_weapon;
    const itemModifiers = grantForm.modifiers_enabled ? cleanModifierInput(grantForm.modifiers) : {};

    const result = grantMode === 'catalog'
      ? await supabase.rpc('dm_grant_market_item', {
          target_character_id: character.id,
          target_product_id: grantProductId,
          quantity_input: Math.max(1, grantCatalogQuantity || 1)
        })
      : await supabase.rpc('dm_grant_custom_item', {
          target_character_id: character.id,
          item_name_input: grantForm.name.trim(),
          quantity_input: Number(grantForm.quantity) || 1,
          notes_input: itemType === 'weapon'
            ? isLegendaryWeapon
              ? legendaryNotes(grantForm.legendary_description, selectedSpell?.name ?? '')
              : imbueNotes(selectedSpell?.name ?? '')
            : '',
          item_type_input: grantForm.item_type,
          storage_capacity_input: Math.max(0, Number(grantForm.storage_capacity) || 0),
          rarity_input: isLegendaryWeapon ? 'Legendary' : 'Common',
          trade_locked_input: false,
          modifiers_input: itemModifiers,
          legendary_display_text_input: isLegendaryWeapon ? grantForm.legendary_display_text.trim() : ''
        });

    setToolMessage(result.error ? result.error.message : 'Item added to the character.');
    if (!result.error) {
      resetGrantForm();
      await loadLoadoutStrip();
      onSaved();
    }
  }

  async function equipItemToSlot(itemId: string, slot: LoadoutSlotKey) {
    const { error } = await createClient().rpc('equip_inventory_item', {
      target_item_id: itemId,
      target_slot: slot
    });

    if (error) {
      setToolMessage(error.message);
      return false;
    }

    setToolMessage(`${slot === 'pet' ? 'Pet' : slot.charAt(0).toUpperCase() + slot.slice(1)} equipped.`);
    await loadLoadoutStrip();
    onSaved();
    return true;
  }

  async function equipDroppedItem(slot: LoadoutSlotKey, event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setHoveredLoadoutSlot(null);

    const itemId = event.dataTransfer.getData('application/x-inventory-item-id') || event.dataTransfer.getData('text/plain');
    if (!itemId) return;

    await equipItemToSlot(itemId, slot);
  }

  async function moveLoadoutItemToInventorySlot(item: InventoryItemWithModifiers, slot: number, parentId: string | null) {
    const supabase = createClient();
    const moveResult = await supabase.rpc('move_inventory_item_slot', {
      target_item_id: item.id,
      target_parent_item_id: parentId,
      target_slot_index: slot
    });

    if (moveResult.error) {
      setToolMessage(moveResult.error.message);
      return false;
    }

    const unequipResult = await supabase.rpc('unequip_inventory_item', { target_item_id: item.id });
    if (unequipResult.error) {
      setToolMessage(unequipResult.error.message);
      return false;
    }

    setToolMessage(`${item.item_name} moved back to inventory.`);
    await loadLoadoutStrip();
    onSaved();
    return true;
  }

  function resetLoadoutDrag() {
    if (loadoutDragTimer.current) clearTimeout(loadoutDragTimer.current);
    loadoutDragTimer.current = null;
    loadoutDraggingItem.current = null;
    loadoutDragTarget.current = null;
    setLoadoutDraggingItemId(null);
    setLoadoutDragGhost(null);
    setHoveredLoadoutSlot(null);
    document.body.classList.remove('inventory-drag-active');
  }

  function beginLoadoutLongPress(item: InventoryItemWithModifiers, event: PointerEvent<HTMLDivElement>) {
    if (!mayManage || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (loadoutDragTimer.current) clearTimeout(loadoutDragTimer.current);
    loadoutDragTimer.current = setTimeout(() => {
      loadoutDraggingItem.current = item;
      setLoadoutDraggingItemId(item.id);
      setLoadoutDragGhost({ item, x: event.clientX, y: event.clientY });
      document.body.classList.add('inventory-drag-active');
      if (navigator.vibrate) navigator.vibrate(18);
    }, 380);
  }

  function beginLoadoutNativeDrag(item: InventoryItemWithModifiers, event: DragEvent<HTMLDivElement>) {
    if (!mayManage) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('application/x-inventory-item-id', item.id);
    event.dataTransfer.setData('application/x-loadout-source', 'true');
    event.dataTransfer.setData('text/plain', item.id);
    event.dataTransfer.effectAllowed = 'move';
    setLoadoutDraggingItemId(item.id);
  }

  function openLoadoutItem(item: InventoryItemWithModifiers) {
    const matchedSpell = spells.find((spell) => spell.name === imbuedSpellName(item.notes));
    setSelectedLoadoutItem(item);
    setLoadoutAction('inspect');
    setLoadoutQuantity(1);
    setToolMessage('');
    setLoadoutForm({
      item_name: item.item_name,
      quantity: item.quantity,
      item_type: item.item_type,
      imbued_spell_id: matchedSpell?.id ?? '',
      equipped: item.equipped,
      storage_capacity: item.storage_capacity ?? 0,
      legendary_weapon: item.rarity === 'Legendary' && typeOfItem(item) === 'weapon',
      legendary_description: legendaryDescription(item.notes),
      legendary_display_text: legendaryDisplayText(item),
      modifiers_enabled: hasModifierValues(item.modifiers),
      modifiers: modifierFormFromItem(item.modifiers)
    });
  }

  function closeLoadoutEditor() {
    setSelectedLoadoutItem(null);
    setLoadoutAction('inspect');
    setToolMessage('');
  }

  async function saveLoadoutItem(event: FormEvent) {
    event.preventDefault();
    if (!selectedLoadoutItem || !canEdit || !loadoutForm.item_name.trim()) return;
    setLoadoutBusy(true);
    const spellName = spells.find((spell) => spell.id === loadoutForm.imbued_spell_id)?.name ?? '';
    const isLegendaryWeapon = typeOfItem(loadoutForm as unknown as InventoryItem) === 'weapon' && loadoutForm.legendary_weapon;
    const payload = {
      item_name: loadoutForm.item_name.trim(),
      quantity: Math.max(1, Number(loadoutForm.quantity) || 1),
      item_type: loadoutForm.item_type,
      notes: typeOfItem(loadoutForm as unknown as InventoryItem) === 'weapon'
        ? isLegendaryWeapon
          ? legendaryNotes(loadoutForm.legendary_description, spellName)
          : imbueNotes(spellName)
        : '',
      rarity: isLegendaryWeapon ? 'Legendary' : (selectedLoadoutItem.rarity ?? 'Common'),
      legendary_display_text: isLegendaryWeapon ? loadoutForm.legendary_display_text.trim() : '',
      equipped: true,
      modifiers: loadoutForm.modifiers_enabled ? cleanModifierInput(loadoutForm.modifiers) : {}
    };

    const result = await createClient()
      .from('inventory_items')
      .update(payload)
      .eq('id', selectedLoadoutItem.id);

    setLoadoutBusy(false);
    if (result.error) return setToolMessage(result.error.message);
    closeLoadoutEditor();
    await loadLoadoutStrip();
    onSaved();
  }

  async function unequipLoadoutItem() {
    if (!selectedLoadoutItem) return;
    setLoadoutBusy(true);
    const { error } = await createClient().rpc('unequip_inventory_item', { target_item_id: selectedLoadoutItem.id });
    setLoadoutBusy(false);
    if (error) return setToolMessage(error.message);
    closeLoadoutEditor();
    await loadLoadoutStrip();
    onSaved();
  }

  async function dropLoadoutItem() {
    if (!selectedLoadoutItem) return;
    setLoadoutBusy(true);
    const { error } = await createClient().rpc('drop_inventory_item', {
      target_item_id: selectedLoadoutItem.id,
      drop_quantity: Math.max(1, Math.min(selectedLoadoutItem.quantity, loadoutQuantity || 1))
    });
    setLoadoutBusy(false);
    if (error) return setToolMessage(error.message);
    closeLoadoutEditor();
    await loadLoadoutStrip();
    onSaved();
  }

  useEffect(() => {
    function pointerMove(event: globalThis.PointerEvent) {
      if (!loadoutDraggingItem.current) return;
      event.preventDefault();
      setLoadoutDragGhost({ item: loadoutDraggingItem.current, x: event.clientX, y: event.clientY });

      const element = document.elementFromPoint(event.clientX, event.clientY);
      const loadoutElement = element?.closest('[data-loadout-slot]') as HTMLElement | null;
      const inventoryElement = element?.closest('[data-inventory-slot]') as HTMLElement | null;

      if (loadoutElement?.dataset.loadoutSlot) {
        const slot = loadoutElement.dataset.loadoutSlot as LoadoutSlotKey;
        loadoutDragTarget.current = { kind: 'loadout', slot };
        setHoveredLoadoutSlot(slot);
      } else if (inventoryElement) {
        const slot = Number(inventoryElement.dataset.slotIndex);
        const parentId = inventoryElement.dataset.parentId === 'main' ? null : inventoryElement.dataset.parentId ?? null;
        loadoutDragTarget.current = Number.isFinite(slot) ? { kind: 'inventory', slot, parentId } : null;
        setHoveredLoadoutSlot(null);
      } else {
        loadoutDragTarget.current = null;
        setHoveredLoadoutSlot(null);
      }
    }

    function pointerUp() {
      if (loadoutDragTimer.current) clearTimeout(loadoutDragTimer.current);
      loadoutDragTimer.current = null;
      const item = loadoutDraggingItem.current;
      const target = loadoutDragTarget.current;

      if (item) {
        suppressLoadoutClick.current = true;
        window.setTimeout(() => {
          suppressLoadoutClick.current = false;
        }, 100);

        if (target?.kind === 'loadout') {
          void equipItemToSlot(item.id, target.slot);
        } else if (target?.kind === 'inventory') {
          void moveLoadoutItemToInventorySlot(item, target.slot, target.parentId);
        }
      }

      resetLoadoutDrag();
    }

    window.addEventListener('pointermove', pointerMove, { passive: false });
    window.addEventListener('pointerup', pointerUp);
    window.addEventListener('pointercancel', pointerUp);
    return () => {
      window.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
      window.removeEventListener('pointercancel', pointerUp);
      resetLoadoutDrag();
    };
  }, [character.id, mayManage]);

  function setAttribute(key: keyof CharacterAttributes, value: number) {
    setForm((current) => ({ ...current, attributes: { ...current.attributes, [key]: value } }));
  }

  async function save() {
    setSaving(true);
    const { error } = await createClient()
      .from('characters')
      .update({
        name: form.name.trim() || character.name,
        class_name: form.class_name.trim() || 'Adventurer',
        level: Number(form.level) || 1,
        max_hp: Math.max(0, Number(form.max_hp) || 0),
        current_hp: Math.max(0, Number(form.current_hp) || 0),
        max_mana: Math.max(0, Number(form.max_mana) || 0),
        current_mana: Math.max(0, Number(form.current_mana) || 0),
        inventory_slots: Math.max(0, Math.min(100, Number(form.inventory_slots) || 0)),
        spell_slots: Math.max(0, Number(form.spell_slots) || 0),
        notes: form.personal_passives.trim(),
        attributes: form.attributes
      })
      .eq('id', character.id);

    setSaving(false);
    if (!error) {
      setEditing(false);
      onSaved();
    }
  }

  const activeAttributeModifiers = useMemo(() => {
    return equipmentItems.reduce((totals, item) => {
      const itemModifiers = item.modifiers ?? {};
      ATTRIBUTE_KEYS.forEach((key) => {
        totals[key] = (totals[key] ?? 0) + modifierNumber(itemModifiers[key]);
      });
      return totals;
    }, { ...DEFAULT_ATTRIBUTES } as CharacterAttributes);
  }, [equipmentItems]);
  const shownAttributes = editing ? form.attributes : applyActiveModifiers(attributes, activeAttributeModifiers);
  const personalPassives = (editing ? form.personal_passives : character.notes ?? '').trim();
  const personalPassiveLines = personalPassives.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const equippedWeapon = equipmentItems.find((item) => typeOfItem(item) === 'weapon') ?? null;
  const equippedArmor = equipmentItems.find((item) => typeOfItem(item) === 'armor') ?? null;
  const equippedShield = equipmentItems.find((item) => typeOfItem(item) === 'shield') ?? null;
  const activePetItem = equipmentItems.find((item) => typeOfItem(item) === 'pet') ?? null;
  const activeAnimal = properties.find((entry) => entry.property_type === 'animal') ?? null;

  function LoadoutSlot({
    label,
    slot,
    item,
    fallbackName,
    icon: Icon
  }: {
    label: string;
    slot: LoadoutSlotKey;
    item?: InventoryItemWithModifiers | null;
    fallbackName?: string;
    icon: LucideIcon;
  }) {
    const active = hoveredLoadoutSlot === slot;
    const hasItem = Boolean(item);
    const hasValue = hasItem || Boolean(fallbackName);
    const displayName = item?.item_name ?? fallbackName ?? 'Empty';
    const lines = modifierLines(item);
    const spellName = item ? imbuedSpellName(item.notes) : '';
    const abilityDisplay = item && item.rarity === 'Legendary' ? legendaryDisplayText(item) : '';
    const enchantedClass = item && spellName ? 'inventory-enchanted-outline loadout-enchanted-outline' : '';
    const filledClass = item ? `loadout-filled rarity-card ${rarityClass(item.rarity)} ${enchantedClass}` : '';
    return (
      <div
        data-loadout-slot={slot}
        role={item ? 'button' : undefined}
        tabIndex={item ? 0 : undefined}
        draggable={!!item && mayManage}
        className={`loadout-drop-slot surface-soft min-h-24 rounded-xl border p-3 ${filledClass} ${active ? 'loadout-drop-slot-active' : ''} ${loadoutDraggingItemId === item?.id ? 'inventory-slot-dragging' : ''} ${item ? 'cursor-pointer active:scale-[0.98]' : ''}`}
        onDragStart={(event) => item && beginLoadoutNativeDrag(item, event)}
        onDragEnd={() => setLoadoutDraggingItemId(null)}
        onPointerDown={(event) => item && beginLoadoutLongPress(item, event)}
        onClick={() => {
          if (suppressLoadoutClick.current) return;
          if (item) openLoadoutItem(item);
        }}
        onKeyDown={(event) => {
          if (item && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            openLoadoutItem(item);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          setHoveredLoadoutSlot(slot);
        }}
        onDragLeave={() => setHoveredLoadoutSlot((current) => (current === slot ? null : current))}
        onDrop={(event) => equipDroppedItem(slot, event)}
        title={item ? `${displayName} — click to inspect/edit. Drag or hold to move.` : `Drag a ${label.toLowerCase()} item here to equip it.`}
      >
        <div className="mb-2 flex items-center gap-2 text-[var(--brass)]">
          <Icon size={15} />
          <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-sm font-black leading-5">{displayName}</p>
        {spellName && <p className="loadout-imbued-spell">{spellName}</p>}
        {abilityDisplay && <p className="loadout-legendary-display">{abilityDisplay}</p>}
        {hasValue ? (
          lines.length > 0 ? (
            <div className="loadout-modifier-lines">
              {lines.map((line) => (
                <span key={line.key} className={line.value > 0 ? 'loadout-modifier-positive' : 'loadout-modifier-negative'}>
                  {formatModifier(line.value)} {line.label}
                </span>
              ))}
            </div>
          ) : (
            <div className="loadout-empty-detail" aria-hidden="true" />
          )
        ) : (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Drop eligible item here</p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 border-t border-white/[0.07] pt-4">
      <section className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="rule-title mb-3">
            <h4 className="text-sm font-black uppercase tracking-wider">Character Sheet</h4>
          </div>
          {editing ? (
            <div className="grid gap-2 sm:grid-cols-3">
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Character name</span>
                <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Class</span>
                <input className="field opacity-70" value={form.class_name} readOnly />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Level</span>
                <NumberInput className="field" min={1} value={form.level} onValueChange={(level) => setForm({ ...form, level })} />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20" style={{ backgroundColor: character.token_color }}>
                <UserRound size={22} />
              </div>
              <div>
                <h3 className="text-xl font-black">{character.name}</h3>
                <p className="text-sm text-[var(--muted)]">Level {character.level ?? 1} {character.class_name}</p>
              </div>
            </div>
          )}
        </div>
        {canEdit && (
          <button
            onClick={editing ? save : () => setEditing(true)}
            disabled={saving}
            className={`h-fit rounded-xl px-4 py-3 text-sm font-black ${editing ? 'primary-button' : 'border border-[var(--line)] text-[var(--muted)]'}`}
          >
            {editing ? <span className="flex items-center gap-2"><Save size={16} /> {saving ? 'Saving…' : 'Save sheet'}</span> : 'Edit sheet'}
          </button>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2">
        {[
          { label: 'Health', icon: Heart, color: 'var(--red)', current: form.current_hp, max: form.max_hp, currentKey: 'current_hp', maxKey: 'max_hp' },
          { label: 'Mana', icon: Sparkles, color: 'var(--blue)', current: form.current_mana, max: form.max_mana, currentKey: 'current_mana', maxKey: 'max_mana' }
        ].map((resource) => (
          <div key={resource.label} className="surface-soft rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2">
              <resource.icon size={15} style={{ color: resource.color }} />
              <span className="text-xs font-black uppercase tracking-wider">{resource.label}</span>
            </div>
            {editing ? (
              <div className="grid grid-cols-2 gap-2">
                <label>
                  <span className="text-[9px] uppercase text-[var(--muted)]">Current</span>
                  <NumberInput className="field mt-1 px-2 py-2" min={0} value={resource.current} onValueChange={(value) => setForm({ ...form, [resource.currentKey]: value })} />
                </label>
                <label>
                  <span className="text-[9px] uppercase text-[var(--muted)]">Maximum</span>
                  <NumberInput className="field mt-1 px-2 py-2" min={0} value={resource.max} onValueChange={(value) => setForm({ ...form, [resource.maxKey]: value })} />
                </label>
              </div>
            ) : (
              <p className="text-2xl font-black">{resource.current}<span className="text-sm text-[var(--muted)]"> / {resource.max}</span></p>
            )}
          </div>
        ))}
      </section>

      {!readOnly && currencySystems.length > 0 && (
        <section>
          <div className="rule-title mb-3">
            <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><Coins size={16} /> Currency</h4>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {currencySystems.map((system) => {
              const systemDenominations = denominations.filter((entry) => entry.currency_system_id === system.id);
              const wallet = wallets.find((entry) => entry.currency_system_id === system.id);
              return (
                <div key={system.id} className="surface-soft rounded-xl p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--brass)]">{system.name}</p>
                  <p className="mt-1 font-black">{formatCurrency(wallet?.balance_base ?? 0, systemDenominations)}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {canEdit && (
        <section className="rounded-2xl border border-[#d1a85b38] bg-[#d1a85b08] p-3">
          <div className="rule-title mb-3">
            <h4 className="text-sm font-black uppercase tracking-wider">DM Grants</h4>
          </div>
          {denominations.length > 0 && (
            <div className="grid grid-cols-[1fr_90px_auto] gap-2">
              <select className="field" value={currencyForm.denomination_id} onChange={(event) => setCurrencyForm({ ...currencyForm, denomination_id: event.target.value })}>
                {denominations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
              </select>
              <NumberInput className="field" value={currencyForm.amount} onValueChange={(amount) => setCurrencyForm({ ...currencyForm, amount })} title="Use a negative number to remove currency" />
              <button type="button" onClick={adjustCurrency} className="teal-button rounded-xl px-3" aria-label="Give currency"><Plus size={17} /></button>
            </div>
          )}
          <p className="mt-1 text-[10px] text-[var(--muted)]">Use a negative amount to remove currency.</p>

          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-black/20 p-1 text-xs font-black">
            <button type="button" onClick={() => setGrantMode('catalog')} className={`rounded-md py-2 ${grantMode === 'catalog' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Catalog item</button>
            <button type="button" onClick={() => setGrantMode('custom')} className={`rounded-md py-2 ${grantMode === 'custom' ? 'bg-[var(--paper)] text-[#141915]' : 'text-[var(--muted)]'}`}>Custom item</button>
          </div>
          {grantMode === 'catalog' ? (
            <div className="mt-2 grid grid-cols-[1fr_7rem] gap-2">
              <select className="field" value={grantProductId} onChange={(event) => setGrantProductId(event.target.value)}>
                {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
              </select>
              <NumberInput className="field" min={1} value={grantCatalogQuantity} onValueChange={setGrantCatalogQuantity} aria-label="Catalog item amount" />
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className="field sm:col-span-2" value={grantForm.name} onChange={(event) => setGrantForm({ ...grantForm, name: event.target.value })} placeholder="Custom item name" />
              <select className="field" value={grantForm.item_type} onChange={(event) => setGrantForm({ ...grantForm, item_type: event.target.value as InventoryItemType, legendary_weapon: event.target.value === 'weapon' ? grantForm.legendary_weapon : false })}>
                {grantItemTypes.map((entry) => <option key={String(entry.value)} value={String(entry.value)}>{entry.label}</option>)}
              </select>
              <NumberInput className="field" min={1} value={grantForm.quantity} onValueChange={(quantity) => setGrantForm({ ...grantForm, quantity })} placeholder="Quantity" />
              {String(grantForm.item_type) === 'weapon' && spells.length > 0 && (
                <select className="field" value={grantForm.imbued_spell_id} onChange={(event) => setGrantForm({ ...grantForm, imbued_spell_id: event.target.value })}>
                  <option value="">No imbued spell</option>
                  {spells.map((spell) => <option key={spell.id} value={spell.id}>{spell.category} · {spell.name}</option>)}
                </select>
              )}
              <NumberInput className="field" min={0} value={grantForm.storage_capacity} onValueChange={(storage_capacity) => setGrantForm({ ...grantForm, storage_capacity })} placeholder="Storage slots (0 = normal item)" />
              {String(grantForm.item_type) === 'weapon' && (
                <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                  <input type="checkbox" className="mt-1" checked={grantForm.legendary_weapon} onChange={(event) => setGrantForm({ ...grantForm, legendary_weapon: event.target.checked })} />
                  <span className="grid flex-1 gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Legendary weapon</span>
                    <span className="text-xs leading-5 text-[var(--muted)]">Turns this weapon into a Legendary item and unlocks its ability description.</span>
                    {grantForm.legendary_weapon && (
                      <>
                        <textarea className="field min-h-20" value={grantForm.legendary_description} onChange={(event) => setGrantForm({ ...grantForm, legendary_description: event.target.value })} placeholder="What does this legendary weapon do?" />
                        <input className="field" value={grantForm.legendary_display_text} onChange={(event) => setGrantForm({ ...grantForm, legendary_display_text: event.target.value })} placeholder="Brief active loadout display text, ex: Reroll once per combat" />
                      </>
                    )}
                  </span>
                </label>
              )}
              <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                <input type="checkbox" className="mt-1" checked={grantForm.modifiers_enabled} onChange={(event) => setGrantForm({ ...grantForm, modifiers_enabled: event.target.checked })} />
                <span className="grid flex-1 gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Item modifiers</span>
                  <span className="text-xs leading-5 text-[var(--muted)]">Only applies while this item is in an active loadout slot.</span>
                  {grantForm.modifiers_enabled && (
                    <div className="modifier-input-grid">
                      {ATTRIBUTE_KEYS.map((key) => (
                        <label key={key}>
                          <span>{ATTRIBUTE_LABELS[key]}</span>
                          <input
                            className="field px-2 py-2 text-center"
                            type="number"
                            step="1"
                            value={grantForm.modifiers[key]}
                            onChange={(event) => setGrantForm({ ...grantForm, modifiers: { ...grantForm.modifiers, [key]: event.target.value } })}
                            placeholder="0"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </span>
              </label>
            </div>
          )}
          <button type="button" onClick={grantItem} disabled={grantMode === 'custom' && !grantForm.name.trim()} className="primary-button mt-2 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-40"><Gift size={17} /> Give item</button>
          {toolMessage && <p className="mt-2 text-xs text-[var(--muted)]">{toolMessage}</p>}
        </section>
      )}

      <section className="grid grid-cols-2 gap-2">
        {[
          { label: 'Inventory capacity', icon: PackageOpen, value: form.inventory_slots, key: 'inventory_slots', suffix: 'slots' },
          { label: 'Spell capacity', icon: WandSparkles, value: form.spell_slots, key: 'spell_slots', suffix: 'slots' }
        ].map((capacity) => (
          <div key={capacity.label} className="surface-soft rounded-xl p-3">
            <div className="mb-2 flex items-center gap-2 text-[var(--brass)]">
              <capacity.icon size={15} />
              <span className="text-xs font-black uppercase tracking-wider">{capacity.label}</span>
            </div>
            {editing ? (
              <NumberInput
                className="field px-3 py-2.5 text-lg font-black"
                min={0}
                max={capacity.key === 'inventory_slots' ? 100 : undefined}
                value={capacity.value}
                onValueChange={(value) => setForm({ ...form, [capacity.key]: value })}
              />
            ) : (
              <p className="text-xl font-black">{capacity.value} <span className="text-xs text-[var(--muted)]">{capacity.suffix}</span></p>
            )}
          </div>
        ))}
      </section>

      <section>
        <div className="rule-title mb-3">
          <h4 className="text-sm font-black uppercase tracking-wider">Attributes & Skills</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ATTRIBUTE_KEYS.map((key) => (
            <label key={key} className="surface-soft flex min-h-14 items-center justify-between gap-2 rounded-xl px-3 py-2">
              <span className="text-xs font-bold text-[var(--muted)]">{ATTRIBUTE_LABELS[key]}</span>
              {editing ? (
                <NumberInput
                  className="w-14 rounded-lg border border-[var(--line)] bg-black/30 px-2 py-2 text-center font-black outline-none focus:border-[var(--brass)]"
                  value={shownAttributes[key]}
                  onValueChange={(value) => setAttribute(key, value)}
                />
              ) : (
                <span className={`text-base font-black ${shownAttributes[key] > 0 ? 'text-[var(--teal)]' : shownAttributes[key] < 0 ? 'text-[var(--red)]' : 'text-[var(--paper)]'}`}>
                  {signed(shownAttributes[key])}
                </span>
              )}
            </label>
          ))}
        </div>
      </section>

      {classPreset && (
        <section>
          <div className="rule-title mb-3">
            <h4 className="text-sm font-black uppercase tracking-wider">Class Features</h4>
          </div>
          <div className="surface-soft rounded-xl p-3">
            <p className="mb-3 text-sm leading-6 text-[var(--muted)]">{classPreset.identity}</p>
            <ul className="space-y-2">
              {classPreset.passives.map((passive) => (
                <li key={passive} className="flex gap-2 text-xs leading-5 text-[var(--muted)]">
                  <span className="text-[var(--brass)]">◆</span>{passive}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="hidden">
        <div className="rule-title mb-3">
          <h4 className="text-sm font-black uppercase tracking-wider">Notes</h4>
        </div>
        {editing ? (
          <textarea className="field min-h-24" value={form.personal_passives} onChange={(e) => setForm({ ...form, personal_passives: e.target.value })} placeholder="Backstory, conditions, reminders…" />
        ) : (
          <p className="surface-soft min-h-16 rounded-xl p-3 text-sm leading-6 text-[var(--muted)]">{character.notes || 'No notes recorded.'}</p>
        )}
      </section>

      {personalPassiveLines.length > 0 && (
        <section>
          <div className="rule-title mb-3">
            <h4 className="text-sm font-black uppercase tracking-wider">Personal Features</h4>
          </div>
          <div className="surface-soft rounded-xl p-3">
            <ul className="space-y-2">
              {personalPassiveLines.map((passive) => (
                <li key={passive} className="flex gap-2 text-xs leading-5 text-[var(--muted)]">
                  <span className="text-[var(--brass)]">◆</span>{passive}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="sheet-section-break" aria-hidden="true" />

      <SpellPanel character={character} canEdit={canEdit} readOnly={readOnly} onCharacterChanged={onSaved} />

      <section>
        <div className="rule-title mb-3">
          <h4 className="text-sm font-black uppercase tracking-wider">Loadout</h4>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <LoadoutSlot label="Armor" slot="armor" icon={Shield} item={equippedArmor} />
          <LoadoutSlot label="Weapon" slot="weapon" icon={Sword} item={equippedWeapon} />
          <LoadoutSlot label="Shield" slot="shield" icon={Shield} item={equippedShield} />
          <LoadoutSlot label="Active pet" slot="pet" icon={PawPrint} item={activePetItem} fallbackName={activeAnimal?.custom_name || activeAnimal?.property_name || undefined} />
        </div>
      </section>

      {selectedLoadoutItem && (
        <Modal onClose={closeLoadoutEditor}>
          <form onSubmit={saveLoadoutItem} className="surface max-h-[90vh] w-[min(94vw,38rem)] overflow-y-auto rounded-2xl p-4 sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow mb-2">Active loadout item</p>
                <h3 className="text-2xl font-black">{selectedLoadoutItem.item_name}</h3>
                <p className="mt-1 text-xs text-[var(--muted)]">Equipped in the active loadout. Click save after edits, or unequip it to return it to carried inventory only.</p>
                {legendaryDescription(selectedLoadoutItem.notes) && <p className="mt-2 text-xs leading-5 text-[var(--brass)]">Legendary ability: {legendaryDescription(selectedLoadoutItem.notes)}</p>}
                {legendaryDisplayText(selectedLoadoutItem) && <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Active display: {legendaryDisplayText(selectedLoadoutItem)}</p>}
              </div>
              <button type="button" onClick={closeLoadoutEditor} className="rounded-full border border-[var(--line)] p-2 text-[var(--muted)]" aria-label="Close"><X size={17} /></button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Item name</span>
                <input className="field" value={loadoutForm.item_name} onChange={(event) => setLoadoutForm({ ...loadoutForm, item_name: event.target.value })} readOnly={!canEdit} />
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Type</span>
                <select className="field" value={String(loadoutForm.item_type)} onChange={(event) => setLoadoutForm({ ...loadoutForm, item_type: event.target.value as InventoryItemType, legendary_weapon: event.target.value === 'weapon' ? loadoutForm.legendary_weapon : false })} disabled={!canEdit}>
                  {grantItemTypes.map((entry) => <option key={String(entry.value)} value={String(entry.value)}>{entry.label}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Quantity</span>
                <NumberInput className="field" min={1} value={loadoutForm.quantity} onValueChange={(quantity) => setLoadoutForm({ ...loadoutForm, quantity })} disabled={!canEdit} />
              </label>

              {String(loadoutForm.item_type) === 'weapon' && spells.length > 0 && (
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Imbued spell</span>
                  <select className="field" value={loadoutForm.imbued_spell_id} onChange={(event) => setLoadoutForm({ ...loadoutForm, imbued_spell_id: event.target.value })} disabled={!canEdit}>
                    <option value="">No imbued spell</option>
                    {spells.map((spell) => <option key={spell.id} value={spell.id}>{spell.category} · {spell.name}</option>)}
                  </select>
                </label>
              )}

              {String(loadoutForm.item_type) === 'weapon' && (
                <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                  <input type="checkbox" className="mt-1" checked={loadoutForm.legendary_weapon} onChange={(event) => setLoadoutForm({ ...loadoutForm, legendary_weapon: event.target.checked })} disabled={!canEdit} />
                  <span className="grid flex-1 gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Legendary weapon</span>
                    <span className="text-xs leading-5 text-[var(--muted)]">Keeps the Legendary effect in inventory and active loadout.</span>
                    {loadoutForm.legendary_weapon && (
                      <>
                        <textarea className="field min-h-20" value={loadoutForm.legendary_description} onChange={(event) => setLoadoutForm({ ...loadoutForm, legendary_description: event.target.value })} placeholder="What does this legendary weapon do?" readOnly={!canEdit} />
                        <input className="field" value={loadoutForm.legendary_display_text} onChange={(event) => setLoadoutForm({ ...loadoutForm, legendary_display_text: event.target.value })} placeholder="Brief active loadout display text, ex: Reroll once per combat" readOnly={!canEdit} />
                      </>
                    )}
                  </span>
                </label>
              )}

              <label className="flex items-start gap-3 rounded-xl border border-[#d1a85b45] bg-[#d1a85b0d] p-3 sm:col-span-2">
                <input type="checkbox" className="mt-1" checked={loadoutForm.modifiers_enabled} onChange={(event) => setLoadoutForm({ ...loadoutForm, modifiers_enabled: event.target.checked })} disabled={!canEdit} />
                <span className="grid flex-1 gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--brass)]">Item modifiers</span>
                  <span className="text-xs leading-5 text-[var(--muted)]">Only applies while this item is equipped in the active loadout.</span>
                  {loadoutForm.modifiers_enabled && (
                    <div className="modifier-input-grid">
                      {ATTRIBUTE_KEYS.map((key) => (
                        <label key={key}>
                          <span>{ATTRIBUTE_LABELS[key]}</span>
                          <input
                            className="field px-2 py-2 text-center"
                            type="number"
                            step="1"
                            value={loadoutForm.modifiers[key]}
                            onChange={(event) => setLoadoutForm({ ...loadoutForm, modifiers: { ...loadoutForm.modifiers, [key]: event.target.value } })}
                            placeholder="0"
                            readOnly={!canEdit}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </span>
              </label>
            </div>

            {toolMessage && <p className="mt-3 whitespace-pre-line text-xs text-[var(--muted)]">{toolMessage}</p>}

            {loadoutAction === 'drop' && (
              <div className="mt-4 rounded-xl border border-[#d76a6255] bg-[#d76a620d] p-3">
                <p className="text-sm font-black text-[var(--red)]">Drop {selectedLoadoutItem.item_name}?</p>
                <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                  <NumberInput className="field" min={1} max={selectedLoadoutItem.quantity} value={loadoutQuantity} onValueChange={setLoadoutQuantity} />
                  <button type="button" onClick={dropLoadoutItem} disabled={loadoutBusy} className="rounded-xl border border-[#d76a6255] px-4 text-sm font-black text-[var(--red)] disabled:opacity-40">Confirm</button>
                </div>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {mayManage && <button type="button" onClick={unequipLoadoutItem} disabled={loadoutBusy} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-black text-[var(--muted)] disabled:opacity-40">Unequip</button>}
              {mayManage && <button type="button" onClick={() => { setLoadoutAction('drop'); setLoadoutQuantity(1); }} className="flex items-center gap-2 rounded-xl border border-[#d76a6255] px-4 py-3 text-sm font-black text-[var(--red)]"><Trash2 size={16} /> Drop</button>}
              {canEdit && <button type="submit" disabled={loadoutBusy || !loadoutForm.item_name.trim()} className="primary-button ml-auto rounded-xl px-4 py-3 text-sm font-black disabled:opacity-40">Save item</button>}
            </div>
          </form>
        </Modal>
      )}

      {loadoutDragGhost && (
        <div className="pointer-events-none fixed z-[100] rounded-xl border border-[var(--brass)] bg-[#1a0d05f2] px-3 py-2 text-xs font-black shadow-2xl" style={{ left: loadoutDragGhost.x + 12, top: loadoutDragGhost.y + 12 }}>
          {loadoutDragGhost.item.item_name} ×{loadoutDragGhost.item.quantity}
        </div>
      )}

      <InventoryPanel character={character} canEdit={canEdit} profile={profile} />
      {character.class_key === 'beastmaster' && <TamedBeastsPanel character={character} profile={profile} readOnly={readOnly} />}
      <PropertyPanel character={character} profile={profile} readOnly={readOnly} />
    </div>
  );
}
