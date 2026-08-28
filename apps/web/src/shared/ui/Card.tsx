import type { HTMLAttributes, ReactNode } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  padding?: 'sm' | 'md' | 'lg';
};

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export function Card({ children, padding = 'md', className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-navy-100 bg-white shadow-sm ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
