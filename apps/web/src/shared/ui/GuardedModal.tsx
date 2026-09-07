import { useEffect, useState, type ReactNode } from 'react';

import { Button } from './Button';
import { Info } from './Info';
import { Modal } from './Modal';

export type GuardedModalCopy = {
  title?: string;
  message?: string;
  keepLabel?: string;
  discardLabel?: string;
};

type GuardedModalProps = {
  open: boolean;
  title: string;
  children: ReactNode | ((api: { requestClose: () => void }) => ReactNode);
  onClose: () => void;
  hasUnsavedChanges: boolean;
  isBusy?: boolean;
  size?: 'md' | 'lg';
  discardCopy?: GuardedModalCopy;
};

const DEFAULT_COPY = {
  title: '¿Descartar los cambios?',
  message: 'Si descarta, perderá lo que haya escrito en este formulario.',
  keepLabel: 'Seguir editando',
  discardLabel: 'Descartar',
};

export function isFormDirty(current: unknown, baseline: unknown): boolean {
  return JSON.stringify(current) !== JSON.stringify(baseline);
}

/**
 * Same close protection as inventory registration: Escape, backdrop, X, and
 * Cancel ask before discarding typed data, and cannot close while busy.
 */
export function GuardedModal({
  open,
  title,
  children,
  onClose,
  hasUnsavedChanges,
  isBusy = false,
  size = 'md',
  discardCopy,
}: GuardedModalProps) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const copy = { ...DEFAULT_COPY, ...discardCopy };

  useEffect(() => {
    if (!open) {
      setConfirmingDiscard(false);
    }
  }, [open]);

  function requestClose() {
    if (isBusy) {
      return;
    }
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    if (hasUnsavedChanges) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }

  const body = typeof children === 'function' ? children({ requestClose }) : children;

  return (
    <Modal
      open={open}
      title={confirmingDiscard ? copy.title : title}
      onClose={requestClose}
      dismissible={!isBusy}
      size={size}
      footer={
        confirmingDiscard ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmingDiscard(false)} autoFocus>
              {copy.keepLabel}
            </Button>
            <Button variant="danger" onClick={onClose}>
              {copy.discardLabel}
            </Button>
          </>
        ) : undefined
      }
    >
      {confirmingDiscard ? (
        <Info tone="warning" title="La información todavía no se ha guardado">
          {copy.message}
        </Info>
      ) : null}
      {/* Keep the form mounted so "keep editing" restores the same field values. */}
      <div hidden={confirmingDiscard}>{body}</div>
    </Modal>
  );
}
