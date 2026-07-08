export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function signed(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function percent(value: number, max: number) {
  if (max <= 0) return 0;
  return clamp((value / max) * 100, 0, 100);
}

export function formatCurrency(
  baseAmount: number,
  denominations: Array<{ name: string; base_value: number; sort_order: number }>
) {
  let remaining = Math.max(0, Math.floor(baseAmount));
  const parts: string[] = [];
  const sorted = [...denominations].sort((a, b) => b.base_value - a.base_value);
  sorted.forEach((denomination) => {
      const amount = Math.floor(remaining / denomination.base_value);
      if (amount > 0) {
        parts.push(`${amount} ${denomination.name}`);
        remaining -= amount * denomination.base_value;
      }
    });
  const smallest = [...denominations].sort((a, b) => a.sort_order - b.sort_order)[0];
  return parts.length > 0 ? parts.join(' · ') : `0 ${smallest?.name ?? 'Coin'}`;
}
