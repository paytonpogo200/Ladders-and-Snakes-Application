'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Coins, DoorClosed, DoorOpen, Eye, EyeOff, LockKeyhole, MapPinned, PackageOpen, Save, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CALOSTRYNN_CURRENCY, CALOSTRYNN_FACILITIES, CALOSTRYNN_PRODUCTS, CALOSTRYNN_VENDORS } from '@/lib/marketPresets';
import { CALOSTRYNN_SPELLS } from '@/lib/spellPresets';
import { formatCurrency } from '@/lib/format';
import BrewingGuide from '@/components/BrewingGuide';
import HousePanel from '@/components/HousePanel';
import NumberInput from '@/components/NumberInput';
import Modal from '@/components/Modal';
import type {
  CampaignLocation,
  Character,
  CharacterWallet,
  City,
  CityFacility,
  CityVendor,
  CurrencyDenomination,
  MarketListing,
  MarketProduct,
  Profile
} from '@/lib/types';

type ListingView = MarketListing & { products: MarketProduct };

export default function CitiesPanel({ profile }: { profile: Profile }) {
  const supabase = useMemo(() => createClient(), []);
  const isDm = profile.role === 'dm';
  const [cities, setCities] = useState<City[]>([]);
  const [facilities, setFacilities] = useState<CityFacility[]>([]);
  const [vendors, setVendors] = useState<CityVendor[]>([]);
  const [listings, setListings] = useState<ListingView[]>([]);
  const [denominations, setDenominations] = useState<CurrencyDenomination[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [wallets, setWallets] = useState<CharacterWallet[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedListingId, setSelectedListingId] = useState('');
  const [purchaseError, setPurchaseError] = useState('');
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);
  const [campaignLocations, setCampaignLocations] = useState<CampaignLocation[]>([]);
  const [priceAmount, setPriceAmount] = useState(0);
  const [priceDenominationId, setPriceDenominationId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const city = cities.find((entry) => entry.city_key === 'calostrynn') ?? cities[0] ?? null;
  const cityDenominations = denominations.filter((entry) => entry.currency_system_id === city?.currency_system_id);
  const visibleCharacters = isDm ? characters.filter((entry) => entry.kind === 'player') : characters.filter((entry) => entry.owner_user_id === profile.id);
  const selectedCharacter = visibleCharacters.find((entry) => entry.id === selectedCharacterId) ?? visibleCharacters[0] ?? null;
  const selectedWallet = wallets.find((entry) => entry.character_id === selectedCharacter?.id && entry.currency_system_id === city?.currency_system_id);
  const selectedProduct = listings.find((entry) => entry.products.id === selectedProductId)?.products ?? null;
  const selectedLocation = campaignLocations.find((entry) => entry.id === selectedCharacter?.location_id)
    ?? campaignLocations.find((entry) => entry.location_key === 'calostrynn')
    ?? null;
  const selectedAtCity = selectedLocation?.location_key === city?.city_key;
  const servicesAvailable = city?.is_open && selectedAtCity;
  const ingredientProducts = listings
    .map((entry) => entry.products)
    .filter((product) => product.product_key.startsWith('plant-') || product.product_key.startsWith('catalyst-'));
  const ingredientSalesVisible = ingredientProducts.some((product) => product.is_available);

  async function loadData() {
    await supabase.rpc('ensure_character_locations');
    const [cityResult, facilityResult, vendorResult, listingResult, systemResult, denominationResult, characterResult, walletResult, campaignLocationResult] = await Promise.all([
      supabase.from('cities').select('*').order('name'),
      supabase.from('city_facilities').select('*').order('sort_order'),
      supabase.from('city_vendors').select('*').order('sort_order'),
      supabase.from('market_listings').select('*, products:market_products(*)').order('sort_order'),
      supabase.from('currency_systems').select('*'),
      supabase.from('currency_denominations').select('*').order('sort_order'),
      supabase.from('characters').select('*').eq('kind', 'player').order('name'),
      supabase.from('character_wallets').select('*'),
      supabase.from('campaign_locations').select('*')
    ]);
    if (!cityResult.error) setCities((cityResult.data ?? []) as City[]);
    if (!facilityResult.error) setFacilities((facilityResult.data ?? []) as CityFacility[]);
    if (!vendorResult.error) setVendors((vendorResult.data ?? []) as CityVendor[]);
    if (!listingResult.error) setListings((listingResult.data ?? []) as ListingView[]);
    if (!denominationResult.error) setDenominations((denominationResult.data ?? []) as CurrencyDenomination[]);
    if (!characterResult.error) {
      const loaded = (characterResult.data ?? []) as Character[];
      setCharacters(loaded);
      const mine = isDm ? loaded : loaded.filter((entry) => entry.owner_user_id === profile.id);
      if (!selectedCharacterId && mine[0]) setSelectedCharacterId(mine[0].id);
    }
    if (!walletResult.error) setWallets((walletResult.data ?? []) as CharacterWallet[]);
    if (!campaignLocationResult.error) setCampaignLocations((campaignLocationResult.data ?? []) as CampaignLocation[]);
  }

  useEffect(() => {
    loadData();
    const channel = supabase
      .channel('city-market-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cities' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'city_vendors' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_products' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_wallets' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, loadData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedCharacterId && visibleCharacters[0]) setSelectedCharacterId(visibleCharacters[0].id);
  }, [visibleCharacters.length]);

  useEffect(() => {
    if (!selectedProduct || cityDenominations.length === 0) return;
    const exact = [...cityDenominations].sort((a, b) => b.base_value - a.base_value).find((entry) => selectedProduct.price_base % entry.base_value === 0) ?? cityDenominations[0];
    setPriceDenominationId(exact.id);
    setPriceAmount(selectedProduct.price_base / exact.base_value);
  }, [selectedProductId, denominations.length]);

  async function seedCalostrynn() {
    setBusy(true);
    setMessage('');
    try {
      const { data: system, error: systemError } = await supabase.from('currency_systems').upsert({
        system_key: CALOSTRYNN_CURRENCY.system_key,
        name: CALOSTRYNN_CURRENCY.name,
        base_unit_name: CALOSTRYNN_CURRENCY.base_unit_name
      }, { onConflict: 'system_key' }).select('*').single();
      if (systemError) throw systemError;

      const { error: denominationError } = await supabase.from('currency_denominations').upsert(
        CALOSTRYNN_CURRENCY.denominations.map((entry) => ({ ...entry, currency_system_id: system.id })),
        { onConflict: 'currency_system_id,denomination_key' }
      );
      if (denominationError) throw denominationError;

      const { data: seededCity, error: cityError } = await supabase.from('cities').upsert({
        city_key: 'calostrynn',
        name: 'Calostrynn',
        description: 'A kingdom built on knowledge, craft, magic, and the trade that keeps all three alive.',
        currency_system_id: system.id,
        is_discovered: true,
        is_open: true
      }, { onConflict: 'city_key' }).select('*').single();
      if (cityError) throw cityError;

      const { data: seededFacilities, error: facilityError } = await supabase.from('city_facilities').upsert(
        CALOSTRYNN_FACILITIES.map((entry) => ({ ...entry, city_id: seededCity.id })),
        { onConflict: 'city_id,facility_key' }
      ).select('*');
      if (facilityError) throw facilityError;

      const facilityMap = new Map((seededFacilities ?? []).map((entry) => [entry.facility_key, entry.id]));
      const { data: seededVendors, error: vendorError } = await supabase.from('city_vendors').upsert(
        CALOSTRYNN_VENDORS.map(({ facility_key, ...entry }) => ({ ...entry, facility_id: facilityMap.get(facility_key) })),
        { onConflict: 'facility_id,vendor_key' }
      ).select('*');
      if (vendorError) throw vendorError;

      const { error: spellError } = await supabase.from('spells').upsert(
        CALOSTRYNN_SPELLS.map(({ price_base, is_available, ...spell }) => spell),
        { onConflict: 'spell_key' }
      );
      if (spellError) throw spellError;

      const { error: productError } = await supabase.from('market_products').upsert(
        CALOSTRYNN_PRODUCTS.map(({ vendor_keys, ...entry }) => entry),
        { onConflict: 'product_key', ignoreDuplicates: true }
      );
      if (productError) throw productError;
      const { data: seededProducts, error: productLoadError } = await supabase.from('market_products').select('*').in('product_key', CALOSTRYNN_PRODUCTS.map((entry) => entry.product_key));
      if (productLoadError) throw productLoadError;

      const vendorMap = new Map((seededVendors ?? []).map((entry) => [entry.vendor_key, entry.id]));
      const productMap = new Map((seededProducts ?? []).map((entry) => [entry.product_key, entry.id]));
      const listingRows = CALOSTRYNN_PRODUCTS.flatMap((product, productIndex) =>
        product.vendor_keys.map((vendorKey) => ({
          vendor_id: vendorMap.get(vendorKey),
          product_id: productMap.get(product.product_key),
          sort_order: productIndex
        }))
      );
      const { error: listingError } = await supabase.from('market_listings').upsert(listingRows, { onConflict: 'vendor_id,product_id', ignoreDuplicates: true });
      if (listingError) throw listingError;

      const { data: oldVendors } = await supabase.from('city_vendors').select('id').eq('vendor_key', 'florist');
      if ((oldVendors ?? []).length > 0) {
        await supabase.from('market_listings').delete().in('vendor_id', (oldVendors ?? []).map((entry) => entry.id));
        await supabase.from('city_vendors').delete().eq('vendor_key', 'florist');
      }
      await supabase.from('city_facilities').delete().eq('facility_key', 'florist');
      const { data: oldTome } = await supabase.from('market_products').select('id').eq('product_key', 'spell-tomes').maybeSingle();
      if (oldTome) {
        await supabase.from('market_listings').delete().eq('product_id', oldTome.id);
        await supabase.from('market_products').delete().eq('id', oldTome.id);
      }

      setMessage('Calostrynn and its facilities are ready.');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create Calostrynn.');
    } finally {
      setBusy(false);
    }
  }

  async function purchase(listing: ListingView) {
    if (!selectedCharacter) return;
    const amount = Math.max(1, purchaseQuantity || 1);
    if (listing.products.stock_quantity !== null && amount > listing.products.stock_quantity) {
      setPurchaseError(`Only ${listing.products.stock_quantity} remain in stock.`);
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc('purchase_market_item_quantity', {
      target_character_id: selectedCharacter.id,
      target_listing_id: listing.id,
      purchase_quantity: amount
    });
    setBusy(false);
    if (error) {
      const inventoryFull = /inventory|space|full/i.test(error.message);
      setPurchaseError(inventoryFull ? `${selectedCharacter.name}’s inventory is full. Nothing was purchased.` : error.message);
      return;
    }
    setSelectedListingId('');
    setPurchaseQuantity(1);
    setMessage(`${data} was acquired by ${selectedCharacter.name}.`);
    await loadData();
  }

  async function toggleCity(field: 'is_discovered' | 'is_open') {
    if (!city || !isDm) return;
    await supabase.from('cities').update({ [field]: !city[field] }).eq('id', city.id);
    await loadData();
  }

  async function saveVendor(vendor: CityVendor, name: string) {
    await supabase.from('city_vendors').update({ name: name.trim() || vendor.name }).eq('id', vendor.id);
    await loadData();
  }

  async function saveProduct() {
    if (!selectedProduct || !isDm) return;
    const denomination = cityDenominations.find((entry) => entry.id === priceDenominationId);
    const price = Math.max(0, Math.round(priceAmount * (denomination?.base_value ?? 1)));
    await supabase.from('market_products').update({
      name: selectedProduct.name,
      description: selectedProduct.description,
      price_base: price,
      stock_quantity: selectedProduct.stock_quantity,
      is_available: selectedProduct.is_available
    }).eq('id', selectedProduct.id);
    setMessage(`${selectedProduct.name} updated everywhere it is sold.`);
    await loadData();
  }

  async function toggleIngredientSales() {
    const ingredients = listings
      .map((entry) => entry.products)
      .filter((product) => product.product_key.startsWith('plant-') || product.product_key.startsWith('catalyst-'));
    const shouldShow = !ingredients.some((product) => product.is_available);
    if (ingredients.length === 0) return;
    const { error } = await supabase.from('market_products').update({ is_available: shouldShow }).in('id', ingredients.map((product) => product.id));
    setMessage(error ? error.message : shouldShow ? 'Plant and catalyst sales are visible.' : 'Plant and catalyst sales are hidden.');
    if (!error) await loadData();
  }

  if (!city) {
    return (
      <section className="surface rounded-2xl p-5">
        <MapPinned className="mb-4 text-[var(--brass)]" size={28} />
        <h2 className="text-2xl font-black">No cities discovered yet.</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          {isDm ? 'Build the first city and its market catalog.' : 'The party has not discovered a city yet.'}
        </p>
        {isDm && <button onClick={seedCalostrynn} disabled={busy} className="primary-button mt-4 rounded-xl px-4 py-3 font-black">Add Calostrynn</button>}
        {message && <p className="mt-3 text-sm text-[var(--muted)]">{message}</p>}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="surface rounded-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Discovered city</p>
            <h2 className="text-3xl font-black tracking-tight">{city.name}</h2>
          </div>
          <span className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${city.is_open ? 'bg-[#63b5a518] text-[var(--teal)]' : 'bg-[#d76a6218] text-[var(--red)]'}`}>
            {city.is_open ? <DoorOpen size={15} /> : <DoorClosed size={15} />} {city.is_open ? 'Available' : 'Party away'}
          </span>
        </div>
        {isDm && (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button onClick={() => toggleCity('is_discovered')} className="rounded-xl border border-[var(--line)] px-3 py-3 text-sm font-black">
              {city.is_discovered ? 'Hide city from party' : 'Mark city discovered'}
            </button>
            <button onClick={() => toggleCity('is_open')} className={`rounded-xl px-3 py-3 text-sm font-black ${city.is_open ? 'bg-[#d76a6215] text-[var(--red)]' : 'teal-button'}`}>
              {city.is_open ? 'Lock facilities' : 'Open facilities'}
            </button>
            <button onClick={seedCalostrynn} disabled={busy} className="rounded-xl border border-[#e0a64e55] px-3 py-3 text-sm font-black text-[var(--brass)] disabled:opacity-40">
              {busy ? 'Syncing…' : 'Sync city catalog'}
            </button>
          </div>
        )}
      </section>

      {visibleCharacters.length > 0 && (
        <section className="surface rounded-2xl p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Shopping as</span>
              <select className="field" value={selectedCharacter?.id ?? ''} onChange={(event) => setSelectedCharacterId(event.target.value)}>
                {visibleCharacters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}
              </select>
            </label>
            <div className="rounded-xl border border-[#d1a85b35] bg-[#d1a85b08] px-4 py-3">
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[var(--brass)]"><Coins size={14} /> Purse</p>
              <p className="mt-1 font-black">{formatCurrency(selectedWallet?.balance_base ?? 0, cityDenominations)}</p>
            </div>
          </div>
        </section>
      )}

      {servicesAvailable && selectedCharacter?.owner_user_id && (
        <HousePanel
          profile={profile}
          ownerUserId={selectedCharacter.owner_user_id}
          characters={characters.filter((entry) => entry.owner_user_id === selectedCharacter.owner_user_id)}
        />
      )}

      {!servicesAvailable && !isDm && (
        <section className="surface rounded-2xl p-6 text-center">
          <LockKeyhole className="mx-auto text-[var(--muted)]" size={28} />
          <h3 className="mt-3 text-xl font-black">Services locked</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">{selectedLocation?.name ? `${selectedCharacter?.name ?? 'This character'} is currently at ${selectedLocation.name}.` : 'This character is away from the city.'}</p>
        </section>
      )}

      {(servicesAvailable || isDm) && facilities.filter((entry) => entry.city_id === city.id).map((facility) => {
        const facilityVendors = vendors.filter((entry) => entry.facility_id === facility.id);
        return (
          <details key={facility.id} className="surface overflow-hidden rounded-2xl" open={facility.facility_key === 'market'}>
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="rounded-xl bg-[#d1a85b12] p-2.5 text-[var(--brass)]"><Building2 size={19} /></span>
              <span className="min-w-0 flex-1"><span className="block font-black">{facility.name}</span><span className="block truncate text-xs text-[var(--muted)]">{facility.description}</span></span>
              <span className="text-xs font-black text-[var(--muted)]">{facilityVendors.length} vendors</span>
            </summary>
            <div className="space-y-3 border-t border-white/[0.07] p-3">
              {facility.facility_key === 'brewery' && (
                <>
                  <BrewingGuide />
                  {isDm && (
                    <button onClick={toggleIngredientSales} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-black text-[var(--muted)]">
                      {ingredientSalesVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                      {ingredientSalesVisible ? 'Hide plant & catalyst sales' : 'Show plant & catalyst sales'}
                    </button>
                  )}
                </>
              )}
              {facilityVendors.map((vendor) => {
                const vendorListings = listings
                  .filter((entry) => entry.vendor_id === vendor.id)
                  .filter((entry) => isDm || entry.products.is_available);
                return (
                  <section key={vendor.id} className="surface-soft rounded-xl p-3">
                    <div className="mb-3">
                      {isDm ? (
                        <input className="field py-2 font-black" defaultValue={vendor.name} onBlur={(event) => saveVendor(vendor, event.target.value)} />
                      ) : <h4 className="font-black">{vendor.name}</h4>}
                      <p className="text-xs text-[var(--muted)]">{vendor.role}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {vendorListings.map((listing) => {
                        const product = listing.products;
                        const available = product.is_available && product.price_base > 0 && (product.stock_quantity === null || product.stock_quantity > 0);
                        return (
                          <article
                            key={listing.id}
                            onClick={() => { setSelectedListingId(listing.id); setPurchaseQuantity(1); }}
                            className={`cursor-pointer rounded-xl border bg-black/15 p-3 transition ${selectedListingId === listing.id ? 'border-[var(--brass)] bg-[#e0a64e12]' : 'border-[var(--line)]'}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div><h5 className="font-black">{product.name}</h5><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{product.description}</p></div>
                              {product.storage_capacity > 0 && <span className="shrink-0 rounded-md bg-[#63b5a518] px-2 py-1 text-[10px] font-black text-[var(--teal)]">{product.storage_capacity} slots</span>}
                            </div>
                            <div className="mt-3 flex items-end justify-between gap-3">
                              <div><p className="text-sm font-black text-[var(--brass)]">{product.price_base > 0 ? formatCurrency(product.price_base, cityDenominations) : 'Price unset'}</p><p className="text-[10px] text-[var(--muted)]">Stock: {product.stock_quantity === null ? 'Available' : product.stock_quantity}</p></div>
                              {isDm && <button onClick={(event) => { event.stopPropagation(); setSelectedProductId(product.id); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black">Edit</button>}
                            </div>
                            {selectedListingId === listing.id && (
                              <div className="mt-3 grid grid-cols-[6rem_1fr_1fr] gap-2 border-t border-[var(--line)] pt-3">
                                <NumberInput className="field py-2 text-center" min={1} max={product.stock_quantity ?? undefined} value={purchaseQuantity} onValueChange={setPurchaseQuantity} aria-label="Purchase amount" />
                                <button onClick={(event) => { event.stopPropagation(); purchase(listing); }} disabled={busy || !servicesAvailable || !selectedCharacter || !available} className="primary-button rounded-lg px-3 py-2 text-xs font-black disabled:opacity-35">Buy</button>
                                <button onClick={(event) => { event.stopPropagation(); setSelectedListingId(''); setPurchaseQuantity(1); }} className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-black text-[var(--muted)]">I’ll pass</button>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </details>
        );
      })}

      {isDm && selectedProduct && (
        <Modal onClose={() => setSelectedProductId('')}>
          <section className="surface w-full max-w-2xl rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div><p className="eyebrow mb-2">Edit global product</p><h3 className="text-2xl font-black">{selectedProduct.name}</h3></div>
              <button onClick={() => setSelectedProductId('')} className="rounded-lg border border-[var(--line)] p-2 text-[var(--muted)]"><X size={17} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Name</span><input className="field" value={selectedProduct.name} onChange={(event) => setListings((current) => current.map((entry) => entry.products.id === selectedProduct.id ? { ...entry, products: { ...entry.products, name: event.target.value } } : entry))} /></label>
              <div className="grid grid-cols-[1fr_1fr] gap-2">
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Price</span><NumberInput className="field" min={0} step="0.1" value={priceAmount} onValueChange={setPriceAmount} /></label>
                <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Unit</span><select className="field" value={priceDenominationId} onChange={(event) => setPriceDenominationId(event.target.value)}>{cityDenominations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
              </div>
              <label><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Stock (0 = sold out)</span><NumberInput className="field" min={0} value={selectedProduct.stock_quantity ?? 0} onValueChange={(stock_quantity) => setListings((current) => current.map((entry) => entry.products.id === selectedProduct.id ? { ...entry, products: { ...entry.products, stock_quantity } } : entry))} /></label>
              <button type="button" onClick={() => setListings((current) => current.map((entry) => entry.products.id === selectedProduct.id ? { ...entry, products: { ...entry.products, is_available: !entry.products.is_available } } : entry))} className={`flex items-center justify-between rounded-xl border p-3 font-black ${selectedProduct.is_available ? 'border-[var(--teal)] text-[var(--teal)]' : 'border-[var(--line)] text-[var(--muted)]'}`}>Available for sale {selectedProduct.is_available && <Check size={18} />}</button>
              <label className="sm:col-span-2"><span className="mb-1 block text-[10px] font-black uppercase text-[var(--muted)]">Description</span><textarea className="field min-h-24" value={selectedProduct.description} onChange={(event) => setListings((current) => current.map((entry) => entry.products.id === selectedProduct.id ? { ...entry, products: { ...entry.products, description: event.target.value } } : entry))} /></label>
            </div>
            <button onClick={async () => { await saveProduct(); setSelectedProductId(''); }} className="teal-button mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 font-black"><Save size={17} /> Save product</button>
          </section>
        </Modal>
      )}
      {purchaseError && (
        <Modal onClose={() => setPurchaseError('')}>
          <section className="surface w-full max-w-sm rounded-2xl p-5 text-center">
            <PackageOpen className="mx-auto text-[var(--red)]" size={28} />
            <h3 className="mt-3 text-xl font-black">Purchase failed</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{purchaseError}</p>
            <button onClick={() => setPurchaseError('')} className="primary-button mt-4 w-full rounded-xl px-4 py-3 font-black">Got it</button>
          </section>
        </Modal>
      )}
      {message && <p className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-sm text-[var(--muted)]">{message}</p>}
    </div>
  );
}
