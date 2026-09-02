import { createContext, useContext, type ReactNode } from 'react';

import { getAppCapabilities, type AppCapabilities } from './capabilities';

const CapabilitiesContext = createContext<AppCapabilities | null>(null);

export function CapabilitiesProvider({
  value,
  children,
}: {
  value?: AppCapabilities;
  children: ReactNode;
}) {
  return (
    <CapabilitiesContext.Provider value={value ?? getAppCapabilities()}>
      {children}
    </CapabilitiesContext.Provider>
  );
}

export function useAppCapabilities(): AppCapabilities {
  return useContext(CapabilitiesContext) ?? getAppCapabilities();
}
