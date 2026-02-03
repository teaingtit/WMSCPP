'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useGlobalShortcuts, ShortcutConfig } from '@/hooks/useGlobalShortcuts';
import ShortcutsHelpModal from '@/components/ui/ShortcutsHelpModal';

interface ShortcutsContextValue {
  showHelp: () => void;
  hideHelp: () => void;
  isHelpOpen: boolean;
  shortcuts: ShortcutConfig[];
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export function useShortcutsContext() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within ShortcutsProvider');
  }
  return context;
}

interface ShortcutsProviderProps {
  children: ReactNode;
}

export default function ShortcutsProvider({ children }: ShortcutsProviderProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const showHelp = useCallback(() => setIsHelpOpen(true), []);
  const hideHelp = useCallback(() => setIsHelpOpen(false), []);

  const { shortcuts } = useGlobalShortcuts({
    onShowHelp: showHelp,
    enabled,
  });

  const value: ShortcutsContextValue = {
    showHelp,
    hideHelp,
    isHelpOpen,
    shortcuts,
    enabled,
    setEnabled,
  };

  return (
    <ShortcutsContext.Provider value={value}>
      {children}
      <ShortcutsHelpModal isOpen={isHelpOpen} onClose={hideHelp} shortcuts={shortcuts} />
    </ShortcutsContext.Provider>
  );
}
