import type { InputHTMLAttributes } from 'react';

import { Input } from './Field';

export type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
};

/**
 * Labeled search field for directory screens (customers now; inventory in WM5).
 */
export function SearchInput({
  id = 'search',
  label = 'Buscar',
  className = '',
  ...props
}: SearchInputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <label htmlFor={id} className="text-sm font-medium text-navy">
        {label}
      </label>
      <Input id={id} type="search" autoComplete="off" {...props} />
    </div>
  );
}
