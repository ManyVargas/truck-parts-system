import type { HTMLAttributes, ReactNode } from 'react';

export type MonoProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
};

export function Mono({ children, className = '', ...props }: MonoProps) {
  return (
    <span className={`font-mono text-sm ${className}`} {...props}>
      {children}
    </span>
  );
}
