'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Building2, Check, Landmark, Plus, Save, ShieldAlert, Trash2, WandSparkles, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Modal from '@/components/Modal';
import TokenColorPicker from '@/components/TokenColorPicker';
import NumberInput from '@/components/NumberInput';
import { formatCurrency } from '@/lib/format';
import { DEFAULT_CLASS_ASSETS } from '@/lib/classPresets';
import { DEFAULT_ENEMY_ASSETS, ENEMY_CATEGORIES } from '@/lib/enemyPresets';
import {
  ATTRIBUTE_KEYS,
  ATTRIBUTE_LABELS,
  DEFAULT_ATTRIBUTES,
  type City,
  type CityFacility,
  type CityVendor,
  type ClassAsset,
  type CurrencyDenomination,
  type EnemyAsset,
  type InventoryItemType,
  type MarketListing,
  type MarketProduct,
  type Profile
} from '@/lib/types';

type ListingView = MarketListing & { products: MarketProduct | null };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function AssetsManager({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const [section, setSection] = useState<'classes' | 'enemies' | 'stores'>('classes');
  const [classes, setClasses] = useState<ClassAsset[]>([]);
  const [enemies, setEnemies] = useState<EnemyAsset[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [facilities, setFacilities] = useState<CityFacility[]>([]);
  const [vendors, setVendors] = useState<CityVendor[]>([]);
  const [listings, setListings] = useState<ListingView[]>([]);
  const [denominations, setDenominations] = useState<CurrencyDenomination[]>([]);
  const [classKey, setClassKey] = useState('');
  const [enemyKey, setEnemyKey] = useState('');
  const [cityId, setCityId] = useState('');
  const [classDraft, setClassDraft] = useState<ClassAsset | null>(null);
  const [enemyDraft, setEnemyDraft] = useState<EnemyAsset | null>(null);
  const [productDraft, setProductDraft] = useState<MarketProduct | null>(null);
  const [priceAmount, setPriceAmount] = useState(0);
  const [priceDenominationId, setPriceDenominationId] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAssets() {
    const [classResult, enemyResult, cityResult, facilityResult, vendorResult, listingResult, denominationResult] = await Promise.all([
      supabase.from('class_assets').select('*').order('name'),
      supabase.from('enemy_assets').select('*').order('category').order('name'),
      supabase.from('cities').select('*').order('name'),
      supabase.from('city_facilities').select('*').order('sort_order'),
      supabase.from('city_vendors').select('*').order('sort_order'),
      supabase.from('market_listings').select('*, products:market_products(*)').order('sort_order'),
      supabase.from('currency_denominations').select('*').order('sort_order')
    ]);

    const loadedClasses = (classResult.data ?? []) as ClassAsset[];
    const loadedEnemies = (enemyResult.data ?? []) as EnemyAsset[];
    setClasses(loadedClasses);
    setEnemies(loadedEnemies);
    if (!cityResult.error) {
      const loadedCities = (cityResult.data ?? []) as City[];
      setCities(loadedCities);
      if (!cityId && loadedCities[0]) setCityId(loadedCities[0].id);
    }
    if (!facilityResult.error) setFacilities((facilityResult.data ?? []) as CityFacility[]);
    if (!vendorResult.error) setVendors((vendorResult.data ?? []) as CityVendor[]);
    if (!listingResult.error) setListings((listingResult.data ?? []) as ListingView[]);
    if (!denominationResult.error) setDenominations((denominationResult.data ?? []) as CurrencyDenomination[]);

    if (!classKey && loadedClasses[0]) setClassKey(loadedClasses[0].class_key);
    if (!enemyKey && loadedEnemies[0]) setEnemyKey(loadedEnemies[0].enemy_key);
  }

  async function seedDefaults() {
    setSaving(true);
    setMessage('');
    const [classResult, enemyResult] = await Promise.all([
      supabase.from('class_assets').upsert(DEFAULT_CLASS_ASSETS, { onConflict: 'class_key', ignoreDuplicates: true }),
      supabase.from('enemy_assets').upsert(DEFAULT_ENEMY_ASSETS, { onConflict: 'enemy_key', ignoreDuplicates: true })
    ]);
    setSaving(false);
    if (classResult.error || enemyResult.error) {
      setMessage(classResult.error?.message ?? enemyResult.error?.message ?? 'Could not load the default assets.');
      return;
    }
    setMessage('Default classes and bestiary loaded.');
    await loadAssets();
  }

  useEffect(() => { loadAssets(); }, []);

  useEffect(() => {
    const selected = classes.find((entry) => entry.class_key === classKey);
    setClassDraft(selected ? { ...selected, attributes: { ...DEFAULT_ATTRIBUTES, ...selected.attributes }, passives: [...(selected.passives ?? [])] } : null);
  }, [classKey, classes]);

  useEffect(() => {
    const selected = enemies.find((entry) => entry.enemy_key === enemyKey);
    setEnemyDraft(selected ? { ...selected } : null);
  }, [enemyKey, enemies]);

  const selectedCity = cities.find((entry) => entry.id === cityId) ?? cities[0] ?? null;
  const cityDenominations = denominations.filter((entry) => entry.currency_system_id === selectedCity?.currency_system_id);

  useEffect(() => {
    if (!productDraft || cityDenominations.length === 0) return;
    const denomination = [...cityDenominations].sort((a, b) => b.base_value - a.base_value).find((entry) => productDraft.price_base % entry.base_value === 0) ?? cityDenominations[0];
    setPriceDenominationId(denomination.id);
    setPriceAmount(productDraft.price_base / denomination.base_value);
  }, [productDraft?.id, selectedCity?.id, denominations.length]);

  async function saveClass(applyToExisting = false) {
    if (!classDraft) return;
    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('class_assets').upsert(classDraft, { onConflict: 'class_key' });
    if (!error && applyToExisting) {
      const { error: patchError } = await supabase.rpc('apply_class_asset_patch', { target_class_key: classDraft.class_key });
      if (patchError) setMessage(`Class saved, but existing characters were not updated: ${patchError.message}`);
      else setMessage(`Class saved and applied to existing ${classDraft.name} characters.`);
    } else if (!error) {
      setMessage('Class definition saved. New characters will use it.');
    } else setMessage(error.message);
    setSaving(false);
    await loadAssets();
  }

  async function saveEnemy() {
    if (!enemyDraft || !enemyDraft.name.trim()) return;
    setSaving(true);
    const row = { ...enemyDraft, enemy_key: enemyDraft.enemy_key || slug(`${enemyDraft.category}-${enemyDraft.name}`) };
    const { error } = await supabase.from('enemy_assets').upsert(row, { onConflict: 'enemy_key' });
    setSaving(false);
    setMessage(error ? error.message : 'Enemy template saved.');
    if (!error) {
      setEnemyKey(row.enemy_key);
      await loadAssets();
    }
  }

  async function deleteEnemy() {
    if (!enemyDraft || !window.confirm(`Delete the ${enemyDraft.name} template? Existing enemies already placed in battles will remain.`)) return;
    await supabase.from('enemy_assets').delete().eq('enemy_key', enemyDraft.enemy_key);
    setEnemyKey('');
    setEnemyDraft(null);
    await loadAssets();
  }

  async function saveFacility(facility: CityFacility, patch: Partial<Pick<CityFacility, 'name' | 'description'>>) {
    const { error } = await supabase.from('city_facilities').update(patch).eq('id', facility.id);
    setMessage(error ? error.message : 'Facility updated.');
    if (!error) await loadAssets();
  }

  async function saveVendor(vendor: CityVendor, patch: Partial<Pick<CityVendor, 'name' | 'role' | 'description'>>) {
    const { error } = await supabase.from('city_vendors').update(patch).eq('id', vendor.id);
    setMessage(error ? error.message : 'Vendor updated.');
    if (!error) await loadAssets();
  }

  function openProduct(product: MarketProduct) {
    setProductDraft({ ...product });
    setMessage('');
  }

  async function saveStoreProduct() {
    if (!productDraft) return;
    setSaving(true);
    const denomination = cityDenominations.find((entry) => entry.id === priceDenominationId) ?? cityDenominations[0];
    const price = Math.max(0, Math.round(priceAmount * (denomination?.base_value ?? 1)));
    const { error } = await supabase.from('market_products').update({
      name: productDraft.name.trim() || productDraft.name,
      description: productDraft.description,
      item_type: productDraft.item_type,
      price_base: price,
      stock_quantity: productDraft.stock_quantity,
      storage_capacity: productDraft.storage_capacity,
      is_available: productDraft.is_available
    }).eq('id', productDraft.id);
    setSaving(false);
    setMessage(error ? error.message : `${productDraft.name} updated everywhere it is sold.`);
    if (!error) {
      setProductDraft(null);
      await loadAssets();
    }
  }

  function newEnemy() {
    const category = ENEMY_CATEGORIES[0];
    setEnemyKey('');
    setEnemyDraft({
      enemy_key: '',
      category,
      name: '',
      health: 50,
      mana: 0,
      damage: 10,
      notes: '',
      token_color: '#c84f49',
      is_discovered: false
    });
  }

  if (profile.role !== 'dm') return null;

  const groupedEnemies = enemies.reduce<Record<string, EnemyAsset[]>>((groups, enemy) => {
    (groups[enemy.category] ??= []).push(enemy);
    return groups;
  }, {});

  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-4 sm:p-5">
        <p className="eyebrow mb-2">Dungeon Master workshop</p>
        <h2 className="text-2xl font-black tracking-tight">Update Assets</h2>
      </section>

      {(classes.length === 0 || enemies.length === 0) && (
        <section className="rounded-2xl border border-[#d1a85b45] bg-[#d1a85b0b] p-4">
          <h3 className="font-black">Load the built-in game assets</h3>
          <button onClick={seedDefaults} disabled={saving} className="primary-button mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black"><WandSparkles size={17} /> Load defaults</button>
        </section>
      )}

      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => setSection('classes')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${section === 'classes' ? 'bg-[var(--paper)] text-[#141915]' : 'surface text-[var(--muted)]'}`}><BookOpen size={17} /> Classes</button>
        <button onClick={() => setSection('enemies')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${section === 'enemies' ? 'bg-[var(--paper)] text-[#141915]' : 'surface text-[var(--muted)]'}`}><ShieldAlert size={17} /> Enemies</button>
        <button onClick={() => setSection('stores')} className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black ${section === 'stores' ? 'bg-[var(--paper)] text-[#141915]' : 'surface text-[var(--muted)]'}`}><Landmark size={17} /> Stores</button>
      </div>

      {section === 'classes' && (
        <div className="grid gap-4 lg:grid-cols-[15rem_1fr]">
          <aside className="surface rounded-2xl p-3">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Class catalog</p>
            <div className="grid gap-1">
              {classes.map((entry) => (
                <button key={entry.class_key} onClick={() => setClassKey(entry.class_key)} className={`rounded-xl px-3 py-2.5 text-left text-sm font-black ${classKey === entry.class_key ? 'bg-[#d1a85b18] text-[var(--brass)]' : 'text-[var(--muted)]'}`}>{entry.name}</button>
              ))}
            </div>
          </aside>

          {classDraft && (
            <section className="surface rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Class name</span><input className="field" value={classDraft.name} onChange={(e) => setClassDraft({ ...classDraft, name: e.target.value })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Role / sustain</span><input className="field" value={classDraft.type} onChange={(e) => setClassDraft({ ...classDraft, type: e.target.value })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Armor</span><select className="field" value={classDraft.armor} onChange={(e) => setClassDraft({ ...classDraft, armor: e.target.value })}><option>Light armor</option><option>Medium armor</option><option>Heavy armor</option></select></label>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--red)]">Base HP</span><NumberInput className="field" min={0} value={classDraft.health} onValueChange={(health) => setClassDraft({ ...classDraft, health })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--blue)]">Base Mana</span><NumberInput className="field" min={0} value={classDraft.mana} onValueChange={(mana) => setClassDraft({ ...classDraft, mana })} /></label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Inventory</span><NumberInput className="field" min={0} max={100} value={classDraft.inventory_slots} onValueChange={(inventory_slots) => setClassDraft({ ...classDraft, inventory_slots })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Spell slots</span><NumberInput className="field" min={0} value={classDraft.spell_slots} onValueChange={(spell_slots) => setClassDraft({ ...classDraft, spell_slots })} /></label>
                </div>
                <label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Identity</span><textarea className="field min-h-20" value={classDraft.identity} onChange={(e) => setClassDraft({ ...classDraft, identity: e.target.value })} /></label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {ATTRIBUTE_KEYS.map((key) => (
                  <label key={key} className="surface-soft flex items-center justify-between gap-2 rounded-xl p-2.5">
                    <span className="text-xs font-bold text-[var(--muted)]">{ATTRIBUTE_LABELS[key]}</span>
                    <NumberInput className="w-14 rounded-lg border border-[var(--line)] bg-black/30 px-2 py-2 text-center font-black" value={classDraft.attributes[key]} onValueChange={(value) => setClassDraft({ ...classDraft, attributes: { ...classDraft.attributes, [key]: value } })} />
                  </label>
                ))}
              </div>

              <label className="mt-4 block"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Passives — one per line</span><textarea className="field min-h-28" value={classDraft.passives.join('\n')} onChange={(e) => setClassDraft({ ...classDraft, passives: e.target.value.split('\n').filter(Boolean) })} /></label>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button onClick={() => saveClass(false)} disabled={saving} className="primary-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Save size={17} /> Save for new characters</button>
                <button onClick={() => saveClass(true)} disabled={saving} className="teal-button flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Check size={17} /> Save and patch existing</button>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">“Patch existing” updates maximum/current HP, maximum/current Mana, attributes, and slot capacities for every character of this class.</p>
            </section>
          )}
        </div>
      )}

      {section === 'enemies' && (
        <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
          <aside className="surface max-h-[70vh] overflow-y-auto rounded-2xl p-3">
            <button onClick={newEnemy} className="primary-button mb-3 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-black"><Plus size={16} /> New enemy template</button>
            {Object.entries(groupedEnemies).map(([category, entries]) => (
              <details key={category} className="mb-2" open={entries.some((entry) => entry.enemy_key === enemyKey)}>
                <summary className="cursor-pointer rounded-lg px-2 py-2 text-xs font-black uppercase tracking-wider text-[var(--brass)]">{category} · {entries.length}</summary>
                <div className="grid gap-1 pl-2">
                  {entries.map((entry) => <button key={entry.enemy_key} onClick={() => setEnemyKey(entry.enemy_key)} className={`rounded-lg px-3 py-2 text-left text-sm ${enemyKey === entry.enemy_key ? 'bg-[#d1a85b18] font-black text-[var(--brass)]' : 'text-[var(--muted)]'}`}>{entry.name}</button>)}
                </div>
              </details>
            ))}
          </aside>

          {enemyDraft && (
            <section className="surface rounded-2xl p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Enemy name</span><input className="field" value={enemyDraft.name} onChange={(e) => setEnemyDraft({ ...enemyDraft, name: e.target.value })} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Category</span><input className="field" list="enemy-categories" value={enemyDraft.category} onChange={(e) => setEnemyDraft({ ...enemyDraft, category: e.target.value })} /><datalist id="enemy-categories">{ENEMY_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</datalist></label>
                <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--red)]">HP</span><NumberInput className="field" min={0} value={enemyDraft.health} onValueChange={(health) => setEnemyDraft({ ...enemyDraft, health })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--blue)]">Mana</span><NumberInput className="field" min={0} value={enemyDraft.mana} onValueChange={(mana) => setEnemyDraft({ ...enemyDraft, mana })} /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--brass)]">Damage</span><NumberInput className="field" min={0} value={enemyDraft.damage} onValueChange={(damage) => setEnemyDraft({ ...enemyDraft, damage })} /></label>
                </div>
                <label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Quick combat notes</span><textarea className="field min-h-24" value={enemyDraft.notes} onChange={(e) => setEnemyDraft({ ...enemyDraft, notes: e.target.value })} /></label>
                <div className="sm:col-span-2">
                  <span className="mb-2 block text-[10px] font-black uppercase text-[var(--muted)]">Default token color</span>
                  <TokenColorPicker value={enemyDraft.token_color} onChange={(token_color) => setEnemyDraft({ ...enemyDraft, token_color })} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                {enemyDraft.id && <button onClick={deleteEnemy} className="rounded-xl border border-[#d76a6255] px-4 text-[var(--red)]"><Trash2 size={17} /></button>}
                <button onClick={saveEnemy} disabled={saving} className="primary-button flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Save size={17} /> Save enemy template</button>
              </div>
            </section>
          )}
        </div>
      )}

      {section === 'stores' && (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <aside className="surface rounded-2xl p-3">
            <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Cities</p>
            <div className="grid gap-1">
              {cities.map((city) => (
                <button key={city.id} onClick={() => setCityId(city.id)} className={`rounded-xl px-3 py-2.5 text-left text-sm font-black ${selectedCity?.id === city.id ? 'bg-[#d1a85b18] text-[var(--brass)]' : 'text-[var(--muted)]'}`}>
                  {city.name}
                </button>
              ))}
              {cities.length === 0 && <p className="px-2 text-sm leading-6 text-[var(--muted)]">No city catalog found yet. Add Calostrynn from Discovered Cities first.</p>}
            </div>
          </aside>

          <section className="space-y-3">
            {selectedCity && (
              <div className="surface rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-[#d1a85b14] p-2.5 text-[var(--brass)]"><Landmark size={18} /></span>
                  <div>
                    <p className="eyebrow">Store catalog</p>
                    <h3 className="text-2xl font-black">{selectedCity.name}</h3>
                  </div>
                </div>
              </div>
            )}

            {selectedCity && facilities.filter((facility) => facility.city_id === selectedCity.id).map((facility) => {
              const facilityVendors = vendors.filter((vendor) => vendor.facility_id === facility.id);
              return (
                <details key={facility.id} className="surface overflow-hidden rounded-2xl" open={facility.facility_key === 'market'}>
                  <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                    <span className="rounded-xl bg-[#d1a85b12] p-2.5 text-[var(--brass)]"><Building2 size={18} /></span>
                    <span className="min-w-0 flex-1"><span className="block font-black">{facility.name}</span><span className="block truncate text-xs text-[var(--muted)]">{facility.description}</span></span>
                    <span className="text-xs font-black text-[var(--muted)]">{facilityVendors.length} vendors</span>
                  </summary>
                  <div className="space-y-3 border-t border-white/[0.07] p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Facility name</span><input className="field py-2.5" defaultValue={facility.name} onBlur={(event) => saveFacility(facility, { name: event.target.value.trim() || facility.name })} /></label>
                      <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Facility description</span><input className="field py-2.5" defaultValue={facility.description} onBlur={(event) => saveFacility(facility, { description: event.target.value })} /></label>
                    </div>

                    {facilityVendors.map((vendor) => {
                      const vendorListings = listings.filter((listing) => listing.vendor_id === vendor.id && listing.products);
                      return (
                        <details key={vendor.id} className="rounded-xl border border-[var(--line)] bg-black/15" open>
                          <summary className="cursor-pointer list-none p-3">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Vendor name</span><input className="field py-2.5" defaultValue={vendor.name} onBlur={(event) => saveVendor(vendor, { name: event.target.value.trim() || vendor.name })} /></label>
                              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Role</span><input className="field py-2.5" defaultValue={vendor.role} onBlur={(event) => saveVendor(vendor, { role: event.target.value })} /></label>
                              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Description</span><input className="field py-2.5" defaultValue={vendor.description} onBlur={(event) => saveVendor(vendor, { description: event.target.value })} /></label>
                            </div>
                          </summary>
                          <div className="grid gap-2 border-t border-[var(--line)] p-3 sm:grid-cols-2">
                            {vendorListings.map((listing) => {
                              const product = listing.products!;
                              return (
                                <button key={listing.id} onClick={() => openProduct(product)} className="rounded-xl border border-[var(--line)] bg-black/15 p-3 text-left transition hover:border-[#d1a85b66]">
                                  <span className="flex items-start justify-between gap-3">
                                    <span className="min-w-0">
                                      <span className="block truncate font-black">{product.name}</span>
                                      <span className="mt-1 block max-h-10 overflow-hidden text-xs leading-5 text-[var(--muted)]">{product.description}</span>
                                    </span>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${product.is_available ? 'bg-[#63b5a518] text-[var(--teal)]' : 'bg-[#d76a6218] text-[var(--red)]'}`}>{product.is_available ? 'Sale' : 'Hidden'}</span>
                                  </span>
                                  <span className="mt-3 flex flex-wrap items-center gap-2 text-xs font-black text-[var(--brass)]">
                                    <span>{formatCurrency(product.price_base, cityDenominations)}</span>
                                    <span className="text-[var(--muted)]">Stock: {product.stock_quantity === null ? 'Unlimited' : product.stock_quantity}</span>
                                    {product.storage_capacity > 0 && <span className="text-[var(--teal)]">{product.storage_capacity} slots</span>}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </section>
        </div>
      )}

      {productDraft && (
        <Modal onClose={() => setProductDraft(null)}>
          <section className="surface max-h-[90vh] w-[min(94vw,42rem)] overflow-y-auto rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow mb-2">Edit store item</p><h3 className="text-2xl font-black">{productDraft.name}</h3></div>
              <button onClick={() => setProductDraft(null)} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Name</span><input className="field" value={productDraft.name} onChange={(event) => setProductDraft({ ...productDraft, name: event.target.value })} /></label>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Item type</span><select className="field" value={productDraft.item_type} onChange={(event) => setProductDraft({ ...productDraft, item_type: event.target.value as InventoryItemType })}>{['weapon', 'armor', 'consumable', 'tool', 'quest', 'misc'].map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Price</span><NumberInput className="field" min={0} step="0.1" value={priceAmount} onValueChange={setPriceAmount} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Unit</span><select className="field" value={priceDenominationId} onChange={(event) => setPriceDenominationId(event.target.value)}>{cityDenominations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              </div>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Storage slots</span><NumberInput className="field" min={0} max={500} value={productDraft.storage_capacity} onValueChange={(storage_capacity) => setProductDraft({ ...productDraft, storage_capacity })} /></label>
              <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Stock</span><NumberInput className="field" min={0} value={productDraft.stock_quantity ?? 0} onValueChange={(stock_quantity) => setProductDraft({ ...productDraft, stock_quantity })} /></label>
                <button type="button" onClick={() => setProductDraft({ ...productDraft, stock_quantity: productDraft.stock_quantity === null ? 0 : null })} className="rounded-xl border border-[var(--line)] px-3 py-3 text-xs font-black text-[var(--muted)]">{productDraft.stock_quantity === null ? 'Limit' : 'Unlimited'}</button>
              </div>
              <button type="button" onClick={() => setProductDraft({ ...productDraft, is_available: !productDraft.is_available })} className={`flex items-center justify-between rounded-xl border p-3 font-black ${productDraft.is_available ? 'border-[var(--teal)] text-[var(--teal)]' : 'border-[var(--line)] text-[var(--muted)]'}`}>Available for sale {productDraft.is_available && <Check size={18} />}</button>
              <label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Description</span><textarea className="field min-h-28" value={productDraft.description} onChange={(event) => setProductDraft({ ...productDraft, description: event.target.value })} /></label>
            </div>
            <button onClick={saveStoreProduct} disabled={saving} className="teal-button mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black disabled:opacity-45"><Save size={17} /> Save store item</button>
          </section>
        </Modal>
      )}

      {message && <p className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
