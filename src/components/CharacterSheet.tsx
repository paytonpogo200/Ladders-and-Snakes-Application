'use client';

import { useEffect, useMemo, useState } from 'react';
import { Coins, Gift, Heart, PackageOpen, Plus, Save, Sparkles, UserRound, WandSparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import InventoryPanel from '@/components/InventoryPanel';
import SpellPanel from '@/components/SpellPanel';
import NumberInput from '@/components/NumberInput';
import TamedBeastsPanel from '@/components/TamedBeastsPanel';
import PropertyPanel from '@/components/PropertyPanel';
import { classAssetToPreset, getClassPreset, type ClassPreset } from '@/lib/classPresets';
import { formatCurrency, signed } from '@/lib/format';
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
  type MarketProduct,
  type Profile
} from '@/lib/types';

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
  const [currencyForm, setCurrencyForm] = useState({ denomination_id: '', amount: 1 });
  const [grantMode, setGrantMode] = useState<'catalog' | 'custom'>('catalog');
  const [grantProductId, setGrantProductId] = useState('');
  const [grantCatalogQuantity, setGrantCatalogQuantity] = useState(1);
  const [grantForm, setGrantForm] = useState({ name: '', quantity: 1, item_type: 'misc' as InventoryItemType, storage_capacity: 0 });
  const [toolMessage, setToolMessage] = useState('');

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from('class_assets').select('*').eq('class_key', character.class_key).maybeSingle(),
      supabase.from('currency_systems').select('*'),
      supabase.from('currency_denominations').select('*').order('sort_order'),
      supabase.from('character_wallets').select('*').eq('character_id', character.id),
      supabase.from('market_products').select('*').order('name')
    ]).then(([classResult, systemsResult, denominationsResult, walletsResult, productsResult]) => {
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
    });
  }, [character.class_key]);

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
    const result = grantMode === 'catalog'
      ? await supabase.rpc('dm_grant_market_item', { target_character_id: character.id, target_product_id: grantProductId, quantity_input: Math.max(1, grantCatalogQuantity || 1) })
      : await supabase.rpc('dm_grant_custom_item', {
          target_character_id: character.id,
          item_name_input: grantForm.name.trim(),
          quantity_input: Number(grantForm.quantity) || 1,
          notes_input: '',
          item_type_input: grantForm.item_type,
          storage_capacity_input: Math.max(0, Number(grantForm.storage_capacity) || 0)
        });
    setToolMessage(result.error ? result.error.message : 'Item added to the character.');
    if (!result.error) {
      setGrantForm({ name: '', quantity: 1, item_type: 'misc', storage_capacity: 0 });
      onSaved();
    }
  }

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

  const shownAttributes = editing ? form.attributes : attributes;
  const personalPassives = (editing ? form.personal_passives : character.notes ?? '').trim();
  const personalPassiveLines = personalPassives.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

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
              <select className="field" value={grantForm.item_type} onChange={(event) => setGrantForm({ ...grantForm, item_type: event.target.value as InventoryItemType })}>
                <option value="weapon">Weapon</option><option value="armor">Armor</option><option value="consumable">Consumable</option><option value="tool">Tool</option><option value="quest">Quest</option><option value="misc">Misc.</option>
              </select>
              <NumberInput className="field" min={1} value={grantForm.quantity} onValueChange={(quantity) => setGrantForm({ ...grantForm, quantity })} placeholder="Quantity" />
              <NumberInput className="field" min={0} value={grantForm.storage_capacity} onValueChange={(storage_capacity) => setGrantForm({ ...grantForm, storage_capacity })} placeholder="Storage slots (0 = normal item)" />
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

      {(editing || personalPassiveLines.length > 0) && (
        <section>
          <div className="rule-title mb-3">
            <h4 className="text-sm font-black uppercase tracking-wider">Personal Passives</h4>
          </div>
          <div className="surface-soft rounded-xl p-3">
            {editing ? (
              <textarea
                className="field min-h-24"
                value={form.personal_passives}
                onChange={(event) => setForm({ ...form, personal_passives: event.target.value })}
                placeholder="Optional. One passive or ability per line."
              />
            ) : (
              <ul className="space-y-2">
                {personalPassiveLines.map((passive) => (
                  <li key={passive} className="flex gap-2 text-xs leading-5 text-[var(--muted)]">
                    <span className="text-[var(--teal)]">◆</span>{passive}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="hidden">
        <div className="rule-title mb-3">
          <h4 className="text-sm font-black uppercase tracking-wider">Notes</h4>
        </div>
        {editing ? (
          <textarea className="field min-h-24" value="" onChange={() => undefined} placeholder="Backstory, conditions, reminders…" />
        ) : (
          <p className="surface-soft min-h-16 rounded-xl p-3 text-sm leading-6 text-[var(--muted)]">{character.notes || 'No notes recorded.'}</p>
        )}
      </section>

      <SpellPanel character={character} canEdit={canEdit} readOnly={readOnly} onCharacterChanged={onSaved} />
      <InventoryPanel character={character} canEdit={canEdit} profile={profile} />
      {character.class_key === 'beastmaster' && <TamedBeastsPanel character={character} profile={profile} readOnly={readOnly} />}
      <PropertyPanel character={character} profile={profile} readOnly={readOnly} />
    </div>
  );
}
