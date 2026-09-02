import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-navy">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-navy-400">{hint}</p>}
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/30 ${className}`}
      {...props}
    />
  );
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select
      className={`w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/30 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy placeholder:text-navy-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand-light/30 ${className}`}
      {...props}
    />
  );
}
