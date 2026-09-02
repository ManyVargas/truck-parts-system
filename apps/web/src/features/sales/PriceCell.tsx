import { useEffect, useState } from 'react';

import { Input } from '../../shared/ui';

type PriceCellProps = {
  lineId: string;
  value: number;
  pending: boolean;
  disabled: boolean;
  onCommit: (lineId: string, unitPrice: number) => void;
};

export function PriceCell({ lineId, value, pending, disabled, onCommit }: PriceCellProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  function commit() {
    const parsed = Number(text);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setText(String(value));
      return;
    }
    if (pending || parsed !== value) {
      onCommit(lineId, parsed);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        aria-label={`Precio de ${lineId}`}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur();
          }
        }}
      />
      {pending && <span className="text-xs text-amber-700">Precio pendiente</span>}
    </div>
  );
}
