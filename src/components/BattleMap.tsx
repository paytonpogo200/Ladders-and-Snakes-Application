'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, LocateFixed, Minus, Plus } from 'lucide-react';
import { clamp, percent } from '@/lib/format';
import type { Battle, Combatant, Profile } from '@/lib/types';

const CELL_SIZE = 76;

type Props = {
  battle: Battle;
  combatants: Combatant[];
  profile: Profile;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

export default function BattleMap({ battle, combatants, profile, selectedId, onSelect, onMove }: Props) {
  const isDm = profile.role === 'dm';
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 16, y: 16 });
  const [drag, setDrag] = useState<{ id: number; x: number; y: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const panFrame = useRef<number | null>(null);
  const queuedPan = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);
  const size = useMemo(() => ({ width: battle.grid_width * CELL_SIZE, height: battle.grid_height * CELL_SIZE }), [battle]);

  useEffect(() => {
    return () => {
      if (panFrame.current !== null) window.cancelAnimationFrame(panFrame.current);
    };
  }, []);

  function schedulePan(nextPan: { x: number; y: number }) {
    queuedPan.current = nextPan;
    if (panFrame.current !== null) return;

    panFrame.current = window.requestAnimationFrame(() => {
      panFrame.current = null;
      const next = queuedPan.current;
      queuedPan.current = null;
      if (next) setPan(next);
    });
  }

  function resetView() {
    if (panFrame.current !== null) window.cancelAnimationFrame(panFrame.current);
    panFrame.current = null;
    queuedPan.current = null;
    setZoom(0.8);
    setPan({ x: 16, y: 16 });
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-token]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragMoved.current = false;
    setDrag({ id: event.pointerId, x: event.clientX, y: event.clientY, baseX: pan.x, baseY: pan.y, moved: false });
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const moved = Math.abs(dx) + Math.abs(dy) > 7;
    if (moved) dragMoved.current = true;
    if (!drag.moved && moved) setDrag({ ...drag, moved: true });
    schedulePan({ x: drag.baseX + dx, y: drag.baseY + dy });
  }

  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag || drag.id !== event.pointerId) return;
    const selected = combatants.find((entry) => entry.id === selectedId);

    if (!drag.moved && !dragMoved.current && isDm && selected && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left - pan.x) / zoom / CELL_SIZE);
      const y = Math.floor((event.clientY - rect.top - pan.y) / zoom / CELL_SIZE);
      if (x >= 0 && x < battle.grid_width && y >= 0 && y < battle.grid_height) onMove(selected.id, x, y);
    }
    dragMoved.current = false;
    setDrag(null);
  }

  return (
    <section className="surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] p-3">
        <div>
          <p className="eyebrow">Live encounter</p>
          <h2 className="font-black">Battlefield</h2>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setZoom((value) => clamp(value - 0.12, 0.4, 2))} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Zoom out"><Minus size={16} /></button>
          <span className="flex min-w-12 items-center justify-center text-xs font-black text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => clamp(value + 0.12, 0.4, 2))} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Zoom in"><Plus size={16} /></button>
          <button onClick={resetView} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Reset view"><LocateFixed size={16} /></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="thin-scrollbar relative h-[56vh] min-h-[410px] touch-none overflow-hidden bg-[#090d0c]"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => {
          dragMoved.current = false;
          setDrag(null);
        }}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          setZoom((value) => clamp(value - event.deltaY * 0.001, 0.4, 2));
        }}
      >
        <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <div className="map-grid-bg relative rounded-lg" style={{ width: size.width, height: size.height, backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px` }}>
            {combatants.map((combatant) => {
              const character = combatant.characters;
              const selected = combatant.id === selectedId;
              const mine = character?.owner_user_id === profile.id;
              const enemy = character?.kind === 'enemy';
              const tamed = character?.class_key === 'tamed-beast';
              return (
                <button
                  key={combatant.id}
                  data-token
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelect(combatant.id);
                  }}
                  className={`absolute flex h-[70px] w-[70px] flex-col items-center justify-end gap-2 overflow-visible rounded-[22px] border-2 px-2 pb-2.5 pt-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_15px_28px_rgba(0,0,0,0.42)] transition active:scale-95 ${
                    selected ? 'border-[var(--brass)] ring-4 ring-[#d1a85b33]' : tamed ? 'border-[var(--teal)] ring-2 ring-[#63b5a533]' : mine ? 'border-[var(--teal)]' : enemy ? 'border-[#d76a6299]' : 'border-white/25'
                  }`}
                  style={{
                    left: combatant.x * CELL_SIZE + 3,
                    top: combatant.y * CELL_SIZE + 3,
                    backgroundColor: character?.token_color ?? '#5c665f',
                    backgroundImage: 'radial-gradient(circle at 32% 22%, rgba(255,255,255,0.26), rgba(255,255,255,0) 34%), linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.24))'
                  }}
                  title={character?.name}
                >
                  <span className="pointer-events-none absolute left-1/2 top-2.5 z-20 max-w-[11rem] -translate-x-1/2 whitespace-nowrap px-1 text-center text-[12px] font-black leading-none text-white [text-shadow:0_2px_3px_rgba(0,0,0,0.95),0_0_9px_rgba(0,0,0,0.85)]">
                    {character?.name ?? 'Token'}
                  </span>
                  <span className="grid w-full gap-1.5">
                    <span className="h-2.5 w-full overflow-hidden rounded-full border border-black/20 bg-black/50 shadow-inner" aria-label={`${character?.name ?? 'Token'} health`}>
                      <span className="block h-full rounded-full bg-gradient-to-r from-[#b9332e] to-[#ff9c8e]" style={{ width: `${percent(combatant.current_hp, character?.max_hp ?? 1)}%` }} />
                    </span>
                    <span className="h-2.5 w-full overflow-hidden rounded-full border border-black/20 bg-black/50 shadow-inner" aria-label={`${character?.name ?? 'Token'} mana`}>
                      <span className="block h-full rounded-full bg-gradient-to-r from-[#336cbb] to-[#9ed1ff]" style={{ width: `${percent(combatant.current_mana, character?.max_mana ?? 1)}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
          <div className="rounded-full border border-white/10 bg-[#0d1110f2] px-4 py-2 text-center text-[11px] font-bold text-[var(--muted)]">
            {isDm && selectedId ? <span className="flex items-center gap-2 text-[var(--brass)]"><Crosshair size={14} /> Tap a square to move · tap the token again to cancel</span> : 'Drag to move around the map · use controls to zoom'}
          </div>
        </div>
      </div>
    </section>
  );
}
