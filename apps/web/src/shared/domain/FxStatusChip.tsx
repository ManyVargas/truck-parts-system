import { Chip } from '../ui';

export function FxStatusChip({ available }: { available: boolean }) {
  return (
    <Chip tone={available ? 'success' : 'amber'}>
      {available ? 'Tasa de cambio disponible' : 'Tasa de cambio no disponible'}
    </Chip>
  );
}
