'use client';

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, LocateFixed, Minus, Plus } from 'lucide-react';
import { clamp, percent } from '@/lib/format';
import type { Battle, Combatant, Profile } from '@/lib/types';

const CELL_SIZE = 76;

const STARTING_ZOOM = 0.8;

type Props = {
  battle: Battle;
  combatants: Combatant[];
  profile: Profile;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
};

type BattleTokenProps = {
  combatant: Combatant;
  selected: boolean;
  mine: boolean;
  enemy: boolean;
  tamed: boolean;
  onSelect: (id: string) => void;
};

const BattleToken = memo(function BattleToken({ combatant, selected, mine, enemy, tamed, onSelect }: BattleTokenProps) {
  const character = combatant.characters;

  return (
    <button
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
});

export default function BattleMap({ battle, combatants, profile, selectedId, onSelect, onMove }: Props) {
  const isDm = profile.role === 'dm';
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const mapLayerRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef({ x: 16, y: 16 });
  const zoomRef = useRef(STARTING_ZOOM);
  const dragRef = useRef<{ id: number; x: number; y: number; baseX: number; baseY: number; moved: boolean } | null>(null);
  const [zoom, setZoom] = useState(STARTING_ZOOM);
  const size = useMemo(() => ({ width: battle.grid_width * CELL_SIZE, height: battle.grid_height * CELL_SIZE }), [battle.grid_width, battle.grid_height]);

  function applyTransform() {
    if (!mapLayerRef.current) return;
    const pan = panRef.current;
    mapLayerRef.current.style.transform = `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomRef.current})`;
  }

  function setZoomValue(nextZoom: number | ((current: number) => number)) {
    const resolved = typeof nextZoom === 'function' ? nextZoom(zoomRef.current) : nextZoom;
    zoomRef.current = clamp(resolved, 0.4, 2);
    setZoom(zoomRef.current);
    applyTransform();
  }

  function getTokenCenter() {
    const visibleCombatants = combatants.filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y));

    if (visibleCombatants.length === 0) {
      return {
        x: Math.max(0.5, battle.grid_width / 2),
        y: Math.max(0.5, battle.grid_height / 2)
      };
    }

    const avgX = visibleCombatants.reduce((sum, entry) => sum + entry.x, 0) / visibleCombatants.length;
    const avgY = visibleCombatants.reduce((sum, entry) => sum + entry.y, 0) / visibleCombatants.length;

    return { x: avgX + 0.5, y: avgY + 0.5 };
  }

  function centerView(nextZoom = zoom) {
    const viewport = viewportRef.current;
    const viewportWidth = viewport?.clientWidth ?? 900;
    const viewportHeight = viewport?.clientHeight ?? 520;
    const center = getTokenCenter();

    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    panRef.current = {
      x: viewportWidth / 2 - center.x * CELL_SIZE * nextZoom,
      y: viewportHeight / 2 - center.y * CELL_SIZE * nextZoom
    };
    applyTransform();
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => centerView(STARTING_ZOOM));
    return () => window.cancelAnimationFrame(frame);
  }, [battle.id, battle.grid_width, battle.grid_height, combatants.length]);

  function resetView() {
    centerView(STARTING_ZOOM);
  }

  function pointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest('[data-token]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, baseX: panRef.current.x, baseY: panRef.current.y, moved: false };
  }

  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.moved = drag.moved || Math.abs(dx) + Math.abs(dy) > 7;
    panRef.current = { x: drag.baseX + dx, y: drag.baseY + dy };
    applyTransform();
  }

  function pointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const selected = combatants.find((entry) => entry.id === selectedId);

    if (!drag.moved && isDm && selected && viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      const pan = panRef.current;
      const x = Math.floor((event.clientX - rect.left - pan.x) / zoomRef.current / CELL_SIZE);
      const y = Math.floor((event.clientY - rect.top - pan.y) / zoomRef.current / CELL_SIZE);
      if (x >= 0 && x < battle.grid_width && y >= 0 && y < battle.grid_height) onMove(selected.id, x, y);
    }
    dragRef.current = null;
  }

  return (
    <section className="surface overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] p-3">
        <div>
          <p className="eyebrow">Live encounter</p>
          <h2 className="font-black">Battlefield</h2>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setZoomValue((value) => value - 0.12)} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Zoom out"><Minus size={16} /></button>
          <span className="flex min-w-12 items-center justify-center text-xs font-black text-[var(--muted)]">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoomValue((value) => value + 0.12)} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Zoom in"><Plus size={16} /></button>
          <button onClick={resetView} className="rounded-lg border border-[var(--line)] bg-black/20 p-2.5" aria-label="Reset view"><LocateFixed size={16} /></button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="thin-scrollbar relative h-[56vh] min-h-[410px] touch-none overflow-hidden bg-[#090d0c]"
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={() => { dragRef.current = null; }}
        onWheel={(event) => {
          if (!event.ctrlKey) return;
          event.preventDefault();
          setZoomValue((value) => value - event.deltaY * 0.001);
        }}
      >
        <div ref={mapLayerRef} className="absolute left-0 top-0 origin-top-left will-change-transform" style={{ transform: `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${zoom})` }}>
          <div className="map-grid-bg relative rounded-lg" style={{ width: size.width, height: size.height, backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px` }}>
            {combatants.map((combatant) => {
              const character = combatant.characters;
              return (
                <BattleToken
                  key={combatant.id}
                  combatant={combatant}
                  selected={combatant.id === selectedId}
                  mine={character?.owner_user_id === profile.id}
                  enemy={character?.kind === 'enemy'}
                  tamed={character?.class_key === 'tamed-beast'}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex justify-center">
          <div className="rounded-full border border-white/10 bg-[#0d1110dc] px-4 py-2 text-center text-[11px] font-bold text-[var(--muted)] backdrop-blur">
            {isDm && selectedId ? <span className="flex items-center gap-2 text-[var(--brass)]"><Crosshair size={14} /> Tap a square to move · tap the token again to cancel</span> : 'Drag to move around the map · use controls to zoom'}
          </div>
        </div>
      </div>
    </section>
  );
}
