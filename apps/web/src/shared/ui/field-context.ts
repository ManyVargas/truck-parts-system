import { createContext, useContext } from 'react';

export type FieldControlContextValue = {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
};

export const FieldControlContext = createContext<FieldControlContextValue | null>(null);

export function useFieldControl(): FieldControlContextValue | null {
  return useContext(FieldControlContext);
}

export function mergeDescribedBy(...ids: Array<string | undefined>): string | undefined {
  const merged = ids.filter((id): id is string => Boolean(id)).join(' ');
  return merged === '' ? undefined : merged;
}
