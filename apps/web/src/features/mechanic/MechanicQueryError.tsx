import { Button, Info } from '../../shared/ui';
import type { AppError } from '../../shared/auth/types';
import { toMechanicUserMessage } from './mechanic-copy';

export type MechanicQueryErrorProps = {
  title: string;
  error: AppError;
  onRetry: () => void;
};

export function MechanicQueryError({ title, error, onRetry }: MechanicQueryErrorProps) {
  return (
    <div className="space-y-3">
      <Info tone="error" title={title}>
        {toMechanicUserMessage(error)}
      </Info>
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
