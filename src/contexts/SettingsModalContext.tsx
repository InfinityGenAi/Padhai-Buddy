"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface SettingsModalContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | null>(null);

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <SettingsModalContext.Provider
      value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}
    >
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) throw new Error("useSettingsModal must be used within SettingsModalProvider");
  return ctx;
}
