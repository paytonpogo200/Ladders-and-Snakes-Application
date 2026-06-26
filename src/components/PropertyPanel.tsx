'use client';

import { useEffect, useMemo, useState } from 'react';
import { Home, PawPrint, Save, Truck, Warehouse } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { Character, CharacterProperty, Profile } from '@/lib/types';

function PropertyIcon({ type }: { type: CharacterProperty['property_type'] }) {
  if (type === 'wagon') return <Truck size={18} />;
  if (type === 'animal') return <PawPrint size={18} />;
  return <Warehouse size={18} />;
}

export default function PropertyPanel({ character, profile, readOnly = false }: { character: Character; profile: Profile; readOnly?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [properties, setProperties] = useState<CharacterProperty[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const mayEdit = !readOnly && (profile.role === 'dm' || character.owner_user_id === profile.id);

  async function loadProperties() {
    const { data, error } = await supabase
      .from('character_properties')
      .select('*')
      .eq('character_id', character.id)
      .order('created_at');

    if (!error) {
      const loaded = (data ?? []) as CharacterProperty[];
      setProperties(loaded);
      setDrafts(Object.fromEntries(loaded.map((entry) => [entry.id, entry.custom_name || entry.property_name])));
    }
  }

  useEffect(() => {
    loadProperties();
    const channel = supabase
      .channel(`property-${character.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'character_properties', filter: `character_id=eq.${character.id}` }, loadProperties)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [character.id]);

  async function renameProperty(property: CharacterProperty) {
    if (!mayEdit) return;
    setSavingId(property.id);
    setMessage('');
    const nextName = (drafts[property.id] ?? '').trim();
    const { error } = await supabase
      .from('character_properties')
      .update({ custom_name: nextName })
      .eq('id', property.id);
    setSavingId(null);
    if (error) setMessage(error.message);
    else {
      setMessage('Property name saved.');
      await loadProperties();
    }
  }

  if (properties.length === 0) return null;

  return (
    <section>
      <div className="rule-title mb-3">
        <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider"><Home size={16} /> Property</h4>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {properties.map((property) => (
          <article key={property.id} className="rounded-2xl border border-[#d1a85b35] bg-[#d1a85b08] p-3">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-black/20 p-2 text-[var(--brass)]"><PropertyIcon type={property.property_type} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">{property.property_type}</p>
                {mayEdit ? (
                  <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                    <input
                      className="field py-2 text-sm"
                      value={drafts[property.id] ?? property.custom_name ?? property.property_name}
                      onChange={(event) => setDrafts((current) => ({ ...current, [property.id]: event.target.value }))}
                      placeholder={property.property_name}
                    />
                    <button type="button" onClick={() => renameProperty(property)} disabled={savingId === property.id} className="rounded-xl border border-[var(--line)] px-3 text-[var(--brass)] disabled:opacity-45" aria-label={`Save ${property.property_name} name`}>
                      <Save size={15} />
                    </button>
                  </div>
                ) : (
                  <h5 className="truncate text-lg font-black">{property.custom_name || property.property_name}</h5>
                )}
                <p className="mt-1 text-xs text-[var(--muted)]">{property.property_name}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      {message && <p className="mt-2 rounded-xl border border-[var(--line)] bg-black/20 p-3 text-xs text-[var(--muted)]">{message}</p>}
    </section>
  );
}
