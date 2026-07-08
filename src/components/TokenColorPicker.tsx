'use client';

import { useMemo } from 'react';

const palette = [
  '#c84f49', '#e06b55', '#d9813f', '#d89c45', '#c4aa49', '#9caf52', '#6e9d50', '#41906c',
  '#3f978d', '#3d8fa8', '#477fb1', '#596daf', '#725ea6', '#8b579d', '#a74f88', '#b85068',
  '#763e3b', '#8b503e', '#80613b', '#756f3d', '#526d43', '#38654e', '#35656a', '#3b5b78',
  '#4b4f7c', '#5d4775', '#704468', '#70474f', '#d6c8ae', '#aaa28f', '#7d817a', '#555d58',
  '#393f3c', '#202624', '#ffffff', '#111111', '#f08a80', '#7ab3ef', '#d1a85b', '#63b5a5',
  '#ff5a5f', '#ff8a3d', '#ffc857', '#f9f871', '#b8f35a', '#42d77d', '#25c7a9', '#1fb7ff',
  '#3d6cff', '#6852ff', '#9b5cff', '#d657ff', '#ff5cd6', '#ff6a9a', '#7b2d26', '#a94725',
  '#b8771f', '#9d8f24', '#5d8f2c', '#1f7e4f', '#1d7775', '#245d8f', '#2d3d85', '#4b2e83',
  '#682f7d', '#872c62', '#efc3a4', '#d7b087', '#b98f68', '#88634f', '#5b3d33', '#2f211f',
  '#cfe7dc', '#9fd1c5', '#6faea9', '#557f88', '#40535d', '#cdd8f6', '#9eb4e8', '#6d80c9',
  '#d9c8ff', '#b393f2', '#855ecb', '#5c3e91', '#ffd6e8', '#f09ac5', '#c45f94', '#873d68'
];

function rgb(hex: string) {
  const clean = hex.replace('#', '').padEnd(6, '0').slice(0, 6);
  return [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16));
}

function hex(values: number[]) {
  return `#${values.map((value) => Math.max(0, Math.min(255, value)).toString(16).padStart(2, '0')).join('')}`;
}

function cleanHex(value: string) {
  const cleaned = value.trim().replace(/^#/, '').replace(/[^a-fA-F0-9]/g, '').slice(0, 6);
  return `#${cleaned.padEnd(6, '0')}`;
}

export default function TokenColorPicker({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  const values = useMemo(() => rgb(value), [value]);

  function setChannel(index: number, channel: number) {
    const next = [...values];
    next[index] = channel;
    onChange(hex(next));
  }

  return (
    <div>
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-10' : 'grid-cols-8 sm:grid-cols-12'}`}>
        {palette.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`aspect-square min-h-7 rounded-full border-2 ${value.toLowerCase() === color ? 'border-white ring-2 ring-[var(--brass)]' : 'border-white/10'}`}
            style={{ backgroundColor: color }}
            aria-label={`Use token color ${color}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <label className="relative flex h-16 w-20 shrink-0 cursor-pointer items-end overflow-hidden rounded-xl border border-[var(--line)] p-1.5 shadow-inner" style={{ backgroundColor: value }}>
          <input className="absolute inset-[-12px] h-24 w-28 cursor-pointer opacity-0" type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label="Open custom color picker" />
          <span className="rounded-md bg-black/45 px-1.5 py-1 text-[9px] font-black uppercase tracking-wider text-white/90">Wheel</span>
        </label>
        <div className="min-w-0 flex-1 space-y-1">
          {(['R', 'G', 'B'] as const).map((label, index) => (
            <label key={label} className="grid grid-cols-[14px_1fr_34px] items-center gap-2 text-[10px] font-black text-[var(--muted)]">
              {label}
              <input type="range" min={0} max={255} value={values[index]} onChange={(event) => setChannel(index, Number(event.target.value))} style={{ accentColor: value }} />
              <span>{values[index]}</span>
            </label>
          ))}
          <label className="grid grid-cols-[34px_1fr] items-center gap-2 text-[10px] font-black text-[var(--muted)]">
            HEX
            <input className="rounded-lg border border-[var(--line)] bg-black/25 px-2 py-1.5 font-mono uppercase text-[var(--paper)]" value={value.toUpperCase()} onChange={(event) => onChange(cleanHex(event.target.value))} />
          </label>
        </div>
        <span className="hidden font-mono text-[10px] uppercase text-[var(--muted)] sm:block">{value}</span>
      </div>
    </div>
  );
}
