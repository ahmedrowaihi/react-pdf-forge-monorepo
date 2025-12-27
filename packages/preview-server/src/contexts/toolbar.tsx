'use client';

import { createContext, use } from 'react';

const ToolbarContext = createContext<undefined>(undefined);

interface ToolbarProviderProps {
  children: React.ReactNode;
}

export function ToolbarProvider({ children }: ToolbarProviderProps) {
  return (
    <ToolbarContext.Provider value={undefined}>
      {children}
    </ToolbarContext.Provider>
  );
}

export const useToolbarContext = () => {
  const previewContext = use(ToolbarContext);
  return previewContext;
};
