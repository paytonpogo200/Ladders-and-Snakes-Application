'use client';

import { useEffect, useState } from 'react';

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> & {
  value: number;
  onValueChange: (value: number) => void;
  emptyFallback?: number;
};

export default function NumberInput({ value, onValueChange, emptyFallback = 0, onBlur, ...props }: Props) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  return (
    <input
      {...props}
      type="number"
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next !== '' && next !== '-' && Number.isFinite(Number(next))) onValueChange(Number(next));
      }}
      onBlur={(event) => {
        if (draft === '' || draft === '-' || !Number.isFinite(Number(draft))) {
          setDraft(String(emptyFallback));
          onValueChange(emptyFallback);
        }
        onBlur?.(event);
      }}
    />
  );
}
