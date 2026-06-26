'use client';

import { Beaker, Dices, FlaskConical } from 'lucide-react';

const results = [
  ['1–5', 'Failed brew', 'Ingredients are wasted'],
  ['6–10', 'Shoddy potion', 'Weak or unreliable result'],
  ['11–15', 'Basic potion', 'Standard result'],
  ['16–20', 'Fine potion', 'Improved result'],
  ['21–24', 'Strong potion', 'Powerful result'],
  ['25+', 'Enriched potion', 'Exceptional result']
];

export default function BrewingGuide() {
  return (
    <details className="rounded-xl border border-[#9caf7940] bg-[#9caf790b]">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3">
        <FlaskConical size={18} className="text-[var(--teal)]" />
        <span className="flex-1 font-black">How to brew a potion</span>
        <span className="text-xs font-black text-[var(--muted)]">Recipe card</span>
      </summary>
      <div className="border-t border-[#9caf7928] p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            ['1', 'Property ingredient', 'Determines the potion’s effect.'],
            ['2', 'Stabilizer', 'Makes the potion safe and usable.'],
            ['3', 'Optional catalyst', 'Improves strength, duration, or quality.']
          ].map(([step, title, description]) => (
            <div key={step} className="surface-soft rounded-xl p-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brass)] text-xs font-black text-[#241207]">{step}</span>
              <p className="mt-2 font-black">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{description}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-xl bg-black/20 p-3">
          <p className="flex items-center gap-2 font-black"><Dices size={17} className="text-[var(--brass)]" /> Roll d20 + Alchemy</p>
          <p className="mt-1 text-xs text-[var(--red)]">Brewing away from a proper setup applies −10 Alchemy.</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="parchment-table min-w-[30rem]">
            <thead><tr><th>Roll</th><th>Quality</th><th>Outcome</th></tr></thead>
            <tbody>{results.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="mt-3 flex gap-2 rounded-xl border border-[#e0a64e30] bg-[#e0a64e09] p-3 text-xs leading-5 text-[var(--muted)]">
          <Beaker size={17} className="shrink-0 text-[var(--brass)]" />
          <span>Example: Acer Root + Yarrow makes a Strength Potion. Adding a catalyst raises its potential quality.</span>
        </div>
      </div>
    </details>
  );
}
