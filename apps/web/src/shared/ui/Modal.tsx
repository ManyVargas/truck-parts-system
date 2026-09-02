import type { ReactNode } from 'react';
import { Button } from './Button';

export type ModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'md' | 'lg';
};

const sizeClasses = {
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

export function Modal({ open, title, children, onClose, size = 'md' }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-navy-100 px-5 py-4">
          <h2 id="modal-title" className="text-lg font-semibold text-navy">
            {title}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Cerrar">
            ✕
          </Button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
