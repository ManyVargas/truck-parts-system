import type { ItemCondition } from '../../api/contracts/entities';

export const ITEM_CONDITIONS: { value: ItemCondition; label: string }[] = [
  { value: 'USED', label: 'Usado' },
  { value: 'NEW', label: 'Nuevo' },
  { value: 'REMANUFACTURED', label: 'Remanufacturado' },
];
