'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Compass, Eye, Flag, Map, Mountain, Search } from 'lucide-react';
import {
  BASE_GUIDES,
  BEAST_CAVE_ENCOUNTERS,
  CAVE_PLANS,
  GOBLIN_CAVE_ENCOUNTERS,
  RUIN_GUIDES,
  type CavePlan,
  type EncounterRow,
  type GuideTable
} from '@/lib/explorationPresets';

function DifficultyBadge({ value }: { value: number | null }) {
  const colors = ['#9caf79', '#c1a85d', '#dd9a49', '#cf704d', '#b94a42'];
  return <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-[#241207]" style={{ backgroundColor: value ? colors[value - 1] : '#8b7358' }}>{value ?? '?'}</span>;
}

type CavePoint = { x: number; y: number };
type CaveTunnel = {
  path: string;
  start: CavePoint;
  boss: CavePoint;
  label: CavePoint;
  difficulty: number | null;
  synthetic?: boolean;
  depth: number;
};

function seeded(caveId: number, salt: number) {
  const value = Math.sin(caveId * 91.731 + salt * 47.117) * 43758.5453;
  return Math.round((value - Math.floor(value)) * 100000) / 100000;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

const CAVE_BOUNDS = {
  width: 540,
  height: 300,
  minX: 34,
  maxX: 506,
  minY: 34,
  maxY: 266
};

function cubicPoint(start: CavePoint, c1: CavePoint, c2: CavePoint, end: CavePoint, t: number) {
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * c1.x + 3 * inverse * t ** 2 * c2.x + t ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * c1.y + 3 * inverse * t ** 2 * c2.y + t ** 3 * end.y
  };
}

function makeLanes(count: number, caveId: number, salt: number) {
  const top = 54;
  const bottom = 246;
  return Array.from({ length: count }, (_, index) => {
    const base = count === 1 ? 150 : top + index * ((bottom - top) / Math.max(1, count - 1));
    return clamp(base + (seeded(caveId, salt + index) - 0.5) * 16, top, bottom);
  });
}

function laneOrder(count: number, caveId: number, salt: number) {
  const centerOut = Array.from({ length: count }, (_, index) => index)
    .sort((a, b) => Math.abs(a - (count - 1) / 2) - Math.abs(b - (count - 1) / 2) || a - b);
  const rotation = count === 0 ? 0 : Math.floor(seeded(caveId, salt) * count);
  return centerOut.map((_, index) => centerOut[(index + rotation) % count]);
}

function curveBetween(start: CavePoint, end: CavePoint, caveId: number, salt: number) {
  const distance = Math.max(68, end.x - start.x);
  const vertical = end.y - start.y;
  const sway = (seeded(caveId, salt) - 0.5) * Math.min(40, Math.max(18, distance * 0.14));
  const c1 = {
    x: clamp(start.x + distance * (0.3 + seeded(caveId, salt + 1) * 0.08), CAVE_BOUNDS.minX, CAVE_BOUNDS.maxX),
    y: clamp(start.y + vertical * (0.22 + seeded(caveId, salt + 2) * 0.08) + sway, CAVE_BOUNDS.minY, CAVE_BOUNDS.maxY)
  };
  const c2 = {
    x: clamp(end.x - distance * (0.28 + seeded(caveId, salt + 3) * 0.08), CAVE_BOUNDS.minX, CAVE_BOUNDS.maxX),
    y: clamp(start.y + vertical * (0.76 - seeded(caveId, salt + 4) * 0.08) - sway * 0.65, CAVE_BOUNDS.minY, CAVE_BOUNDS.maxY)
  };
  const label = cubicPoint(start, c1, c2, end, 0.5);
  return {
    path: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
    label: {
      x: clamp(label.x, CAVE_BOUNDS.minX + 34, CAVE_BOUNDS.maxX - 34),
      y: clamp(label.y, CAVE_BOUNDS.minY + 16, CAVE_BOUNDS.maxY - 16)
    }
  };
}

function CaveDiagram({ cave }: { cave: CavePlan }) {
  const layout = useMemo(() => {
    const entrance = { x: 36, y: 150 };
    const count = Math.max(1, cave.difficulties.length);
    const tunnels: CaveTunnel[] = [];
    const addTunnel = (
      start: CavePoint,
      boss: CavePoint,
      difficulty: number | null,
      index: number,
      depth: number,
      synthetic = false
    ) => {
      const curve = curveBetween(start, boss, cave.id, index * 17 + depth * 41 + (synthetic ? 701 : 11));
      const tunnel = { start, boss, difficulty, synthetic, depth, ...curve };
      tunnels.push(tunnel);
      return tunnel;
    };
    const lanes = makeLanes(count, cave.id, 25);
    const orderedLanes = laneOrder(count, cave.id, 35);
    const laneAt = (index: number) => lanes[orderedLanes[index % orderedLanes.length] ?? 0] ?? 150;

    if (cave.layout === 'Snaking Cave') {
      let previousBoss = entrance;
      cave.difficulties.forEach((difficulty, index) => {
        const progress = count === 1 ? 0.66 : index / Math.max(1, count - 1);
        const naturalX = 124 + progress * 360 + (seeded(cave.id, 100 + index) - 0.5) * 26;
        let bossY = laneAt(index);
        if (Math.abs(bossY - previousBoss.y) < 28) {
          bossY = clamp(bossY + (index % 2 === 0 ? 44 : -44), CAVE_BOUNDS.minY + 18, CAVE_BOUNDS.maxY - 18);
        }
        const boss = {
          x: clamp(naturalX, Math.min(CAVE_BOUNDS.maxX - 18, previousBoss.x + 72), CAVE_BOUNDS.maxX - 10),
          y: bossY
        };
        const branchFromTunnel = index > 2 && count > 4 && seeded(cave.id, 140 + index) < 0.14;
        const start = branchFromTunnel ? tunnels[index - 1].label : previousBoss;
        addTunnel(start, boss, difficulty, index, index + 1);
        previousBoss = boss;
      });
    } else if (cave.layout === 'Multi Cave') {
      const mouth = {
        x: 84 + seeded(cave.id, 201) * 28,
        y: 134 + seeded(cave.id, 202) * 32
      };
      addTunnel(entrance, mouth, null, -1, 0, true);
      cave.difficulties.forEach((difficulty, index) => {
        const lane = laneAt(index);
        const start = index === 0
          ? mouth
          : {
              x: clamp(mouth.x + seeded(cave.id, 220 + index) * 28, mouth.x, mouth.x + 34),
              y: clamp(mouth.y + (lane - mouth.y) * 0.18, CAVE_BOUNDS.minY + 18, CAVE_BOUNDS.maxY - 18)
            };
        const boss = {
          x: clamp(324 + seeded(cave.id, 260 + index) * 168, 292, CAVE_BOUNDS.maxX - 12),
          y: clamp(lane + (seeded(cave.id, 280 + index) - 0.5) * 12, CAVE_BOUNDS.minY + 18, CAVE_BOUNDS.maxY - 18)
        };
        addTunnel(start, boss, difficulty, index, 1 + seeded(cave.id, 300 + index));
      });
    } else {
      const root = {
        x: 84 + seeded(cave.id, 401) * 32,
        y: 132 + seeded(cave.id, 402) * 34
      };
      addTunnel(entrance, root, null, -1, 0, true);
      const sources: Array<{ point: CavePoint; depth: number }> = [{ point: root, depth: 0 }];
      cave.difficulties.forEach((difficulty, index) => {
        const lane = laneAt(index);
        const viableSources = sources
          .filter((source) => source.point.x < CAVE_BOUNDS.maxX - 122)
          .sort((a, b) => {
            const scoreA = Math.abs(a.point.y - lane) + a.depth * 13 + seeded(cave.id, 420 + index) * 8;
            const scoreB = Math.abs(b.point.y - lane) + b.depth * 13 + seeded(cave.id, 430 + index) * 8;
            return scoreA - scoreB;
          });
        const source = index === 0
          ? sources[0]
          : viableSources[Math.min(viableSources.length - 1, Math.floor(seeded(cave.id, 440 + index) * Math.min(3, viableSources.length)))] ?? sources[0];
        const start = source.point;
        const depth = source.depth + 1;
        let bossY = clamp(lane + (seeded(cave.id, 480 + index) - 0.5) * 14, CAVE_BOUNDS.minY + 18, CAVE_BOUNDS.maxY - 18);
        if (Math.abs(bossY - start.y) < 22) {
          bossY = clamp(bossY + (index % 2 === 0 ? 38 : -38), CAVE_BOUNDS.minY + 18, CAVE_BOUNDS.maxY - 18);
        }
        const boss = {
          x: clamp(start.x + 118 + seeded(cave.id, 460 + index) * Math.max(72, 112 - depth * 7), 222, CAVE_BOUNDS.maxX - 12),
          y: bossY
        };
        const tunnel = addTunnel(start, boss, difficulty, index, depth);
        sources.push({ point: tunnel.label, depth: tunnel.depth + 0.15 });
        sources.push({ point: tunnel.boss, depth: tunnel.depth + 0.4 });
      });
    }

    const realTunnels = tunnels.filter((entry) => !entry.synthetic);
    const anchors = [
      { point: entrance, depth: 0 },
      ...realTunnels.flatMap((tunnel) => [
        { point: tunnel.label, depth: tunnel.depth * 0.85 },
        { point: tunnel.boss, depth: tunnel.depth }
      ])
    ].sort((a, b) => a.depth - b.depth);

    const secrets = Array.from({ length: cave.secrets }, (_, index) => {
      const roll = seeded(cave.id, index + 1);
      const anchorIndex = roll < 0.1
        ? 0
        : Math.min(anchors.length - 1, Math.floor(Math.pow(seeded(cave.id, index + 31), 0.42) * anchors.length));
      const anchor = anchors[anchorIndex].point;
      const distance = 12 + seeded(cave.id, index + 61) * 24;
      const angle = seeded(cave.id, index + 91) * Math.PI * 2;
      return {
        x: clamp(anchor.x + Math.cos(angle) * distance, CAVE_BOUNDS.minX - 14, CAVE_BOUNDS.maxX + 14),
        y: clamp(anchor.y + Math.sin(angle) * distance, CAVE_BOUNDS.minY - 14, CAVE_BOUNDS.maxY + 14)
      };
    });

    return { entrance, tunnels, secrets };
  }, [cave]);

  const shownTunnels = layout.tunnels.filter((entry) => !entry.synthetic);

  return (
    <svg viewBox={`0 0 ${CAVE_BOUNDS.width} ${CAVE_BOUNDS.height}`} className="w-full rounded-xl border border-[#e0a64e2e] bg-[#160b05aa]" role="img" aria-label={`Generated layout for cave ${cave.id}`}>
      <defs>
        <filter id={`glow-${cave.id}`}><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>

      <g aria-hidden="true">
        {layout.tunnels.map((tunnel, index) => (
          <path key={index} d={tunnel.path} fill="none" stroke={tunnel.synthetic ? '#79502d' : '#93612f'} strokeWidth={tunnel.synthetic ? 10 : 12} strokeLinecap="round" />
        ))}
      </g>

      <g aria-label="Secret rooms">
        {layout.secrets.map((secret, index) => (
          <g key={index}>
            <circle cx={secret.x} cy={secret.y} r="9" fill="#7fa7b2" stroke="#c7f1ff" strokeWidth="2" filter={`url(#glow-${cave.id})`} />
            <text x={secret.x} y={secret.y + 3} textAnchor="middle" fontSize="7" fontWeight="900" fill="#18222a">S</text>
          </g>
        ))}
      </g>

      <circle cx={layout.entrance.x} cy={layout.entrance.y} r="11" fill="#9caf79" filter={`url(#glow-${cave.id})`} />
      <text x={layout.entrance.x} y={layout.entrance.y + 4} textAnchor="middle" fontSize="8" fontWeight="900" fill="#201006">IN</text>

      <g aria-label="Boss rooms">
        {shownTunnels.map((tunnel, index) => (
          <g key={index}>
            <circle cx={tunnel.boss.x} cy={tunnel.boss.y} r="17" fill="#3b2010" stroke="#d27358" strokeWidth="3.5" />
            <text x={tunnel.boss.x} y={tunnel.boss.y + 4} textAnchor="middle" fontSize="8" fontWeight="900" fill="#f3e5c7">B{index + 1}</text>
          </g>
        ))}
      </g>

      <g aria-label="Tunnel labels">
        {shownTunnels.map((tunnel, index) => (
          <g key={index}>
            <rect x={tunnel.label.x - 29} y={tunnel.label.y - 10} width="58" height="20" rx="9" fill="#160b05" stroke="#f0c66e" strokeWidth="1.5" />
            <text x={tunnel.label.x} y={tunnel.label.y + 3.5} textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff1d2">T{index + 1} · D{tunnel.difficulty ?? '?'}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

function CaveCard({ cave }: { cave: CavePlan }) {
  const [open, setOpen] = useState(false);
  return (
    <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="cave-card min-w-0 overflow-hidden rounded-xl border border-[#e0a64e2c] bg-black/15">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#e0a64e16] font-black text-[var(--brass)]">#{cave.id}</span>
        <span className="min-w-0 flex-1"><span className="block font-black">{cave.enemies} · {cave.layout}</span><span className="block text-xs text-[var(--muted)]">{cave.tunnels} tunnels · {cave.secrets} secret rooms{cave.terrain ? ` · ${cave.terrain}` : ''}</span></span>
        <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} size={17} />
      </summary>
      {open && (
        <div className="min-w-0 border-t border-[#e0a64e20] p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Tunnel difficulties</span>
            {cave.difficulties.map((difficulty, index) => <span key={index} className="flex items-center gap-1"><span className="text-[9px] text-[var(--muted)]">{index + 1}</span><DifficultyBadge value={difficulty} /></span>)}
          </div>
          <CaveDiagram cave={cave} />
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold text-[var(--muted)]"><span>T = tunnel · D = difficulty</span><span className="flex items-center gap-1"><Flag size={12} className="text-[var(--red)]" /> B = boss room</span><span className="flex items-center gap-1"><Eye size={12} className="text-[var(--blue)]" /> S = secret room</span></div>
        </div>
      )}
    </details>
  );
}

function EncounterTable({ rows }: { rows: EncounterRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="parchment-table min-w-[48rem]">
        <thead><tr><th>Difficulty</th><th>Cave Type</th><th>Wave Enemies</th><th>Boss Room</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.difficulty}><td><DifficultyBadge value={row.difficulty} /></td><td className="font-black">{row.name}</td><td>{row.waves}</td><td>{row.boss}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

function GuideTables({ tables }: { tables: GuideTable[] }) {
  return <div className="space-y-3">{tables.map((table) => (
    <details key={table.title} className="surface-soft rounded-xl">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3"><span className="flex-1 font-black">{table.title}</span><ChevronDown size={17} className="text-[var(--muted)]" /></summary>
      <div className="overflow-x-auto border-t border-[#e0a64e20] p-3">
        <table className="parchment-table min-w-[32rem]">
          <thead><tr>{table.columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{table.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </details>
  ))}</div>;
}

export default function ExplorationGuide() {
  const [caveSearch, setCaveSearch] = useState('');
  const [cavesOpen, setCavesOpen] = useState(false);
  const filteredCaves = CAVE_PLANS.filter((cave) => !caveSearch.trim() || String(cave.id) === caveSearch.trim() || `${cave.enemies} ${cave.layout}`.toLowerCase().includes(caveSearch.toLowerCase()));

  return (
    <section className="surface rounded-2xl p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-xl bg-[#e0a64e16] p-2.5 text-[var(--brass)]"><Compass size={20} /></span>
        <div><p className="eyebrow">DM adventure reference</p><h3 className="mt-1 text-2xl font-black">Exploration Cheat Sheet</h3></div>
      </div>

      <div className="space-y-3">
        <details open={cavesOpen} onToggle={(event) => setCavesOpen(event.currentTarget.open)} className="surface-soft rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4"><Mountain size={19} className="text-[var(--brass)]" /><span className="flex-1 text-lg font-black">Caves</span><span className="text-xs font-black text-[var(--muted)]">80 layouts</span><ChevronDown className={`transition ${cavesOpen ? 'rotate-180' : ''}`} size={18} /></summary>
          {cavesOpen && (
            <div className="space-y-4 border-t border-[#e0a64e22] p-3">
              <details className="rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer font-black">Goblin-infested cave difficulty table</summary><div className="mt-3"><EncounterTable rows={GOBLIN_CAVE_ENCOUNTERS} /></div></details>
              <details className="rounded-xl border border-[var(--line)] p-3"><summary className="cursor-pointer font-black">Beast cave difficulty table</summary><div className="mt-3"><EncounterTable rows={BEAST_CAVE_ENCOUNTERS} /></div></details>
              <label className="relative block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
                <input className="field pl-10" value={caveSearch} onChange={(event) => setCaveSearch(event.target.value)} placeholder="Find cave number, enemy type, or layout…" />
              </label>
              <div className="grid gap-2 lg:grid-cols-2">
                {filteredCaves.map((cave) => <CaveCard key={cave.id} cave={cave} />)}
              </div>
            </div>
          )}
        </details>

        <details className="surface-soft rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4"><Map size={19} className="text-[var(--brass)]" /><span className="flex-1 text-lg font-black">Bases</span><span className="text-xs font-black text-[var(--muted)]">Alarm & forces</span><ChevronDown size={18} /></summary>
          <div className="border-t border-[#e0a64e22] p-3"><GuideTables tables={BASE_GUIDES} /></div>
        </details>

        <details className="surface-soft rounded-2xl">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-4"><Map size={19} className="text-[var(--brass)]" /><span className="flex-1 text-lg font-black">Ruins</span><span className="text-xs font-black text-[var(--muted)]">Occupants & bosses</span><ChevronDown size={18} /></summary>
          <div className="border-t border-[#e0a64e22] p-3"><GuideTables tables={RUIN_GUIDES} /></div>
        </details>
      </div>
    </section>
  );
}
