import type { ReactNode } from 'react';

import { Button, type ButtonProps } from './Button';
import { Modal } from './Modal';

type ConfirmActionModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmVariant?: Extract<ButtonProps['variant'], 'primary' | 'danger'>;
  cancelLabel?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Explicit yes/no gate for irreversible or access-changing commands.
 * Form-based flows keep their own submit button; this is for one-click actions.
 */
export function ConfirmActionModal({
  open,
  title,
  children,
  confirmLabel,
  confirmVariant = 'primary',
  cancelLabel = 'Cancelar',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel} dismissible={!busy}>
      <div className="space-y-4">
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} busy={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
