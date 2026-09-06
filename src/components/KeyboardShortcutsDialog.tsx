"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XMarkIcon, CommandLineIcon } from "@heroicons/react/24/outline";

interface ShortcutRow {
  keys: string[];
  description: string;
  scope?: string;
}

interface ShortcutGroup {
  label: string;
  shortcuts: ShortcutRow[];
}

const GROUPS: ShortcutGroup[] = [
  {
    label: "AI Chat",
    shortcuts: [
      { keys: ["Ctrl", "Enter"], description: "Send message", scope: "Chat input" },
      { keys: ["Shift", "Enter"], description: "New line in message", scope: "Chat input" },
      { keys: ["N"], description: "Start new chat", scope: "Chat page" },
    ],
  },
  {
    label: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "K"], description: "Focus global search (when available)" },
      { keys: ["Esc"], description: "Close any open modal or dialog" },
    ],
  },
  {
    label: "Editor",
    shortcuts: [
      { keys: ["Ctrl", "S"], description: "Save current note", scope: "Notes editor" },
    ],
  },
];

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform);
}

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md border border-border bg-foreground/[0.04] text-[11px] font-semibold text-foreground/80 shadow-sm">
      {children}
    </kbd>
  );
}

function ShortcutRow({ row, mac }: { row: ShortcutRow; mac: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm text-foreground/85">{row.description}</p>
        {row.scope && (
          <p className="text-[11px] text-foreground/45 mt-0.5">in {row.scope}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {row.keys.map((key, i) => {
          const label = key === "Ctrl" ? (mac ? "⌘" : "Ctrl") : key;
          return (
            <span key={`${key}-${i}`} className="flex items-center gap-1">
              <KeyCap>{label}</KeyCap>
              {i < row.keys.length - 1 && (
                <span className="text-foreground/30 text-xs">+</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsDialog({ isOpen, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const mac = isMac();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="kb-title"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between p-5 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <CommandLineIcon className="w-5 h-5 text-primary" />
                <h3 id="kb-title" className="text-lg font-semibold">
                  Keyboard Shortcuts
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-foreground/5"
                aria-label="Close keyboard shortcuts"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-5">
              {GROUPS.map((group) => (
                <div key={group.label}>
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/40 mb-1">
                    {group.label}
                  </h4>
                  <div className="divide-y divide-border/40">
                    {group.shortcuts.map((row) => (
                      <ShortcutRow key={row.description} row={row} mac={mac} />
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-foreground/45">
                We never hijack essential browser shortcuts like Ctrl+R, Ctrl+T, Ctrl+W, Ctrl+L, or Ctrl+F.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
