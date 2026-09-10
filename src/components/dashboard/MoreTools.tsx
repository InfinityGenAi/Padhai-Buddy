"use client";

import { motion } from "framer-motion";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { playSettings } from "@/lib/sounds";

export function MoreTools() {
  const { open } = useSettingsModal();

  return (
    <motion.div className="rounded-xl overflow-hidden bg-card border border-card-border shadow-sm">
      <div className="p-4 border-b border-card-border">
        <h2 className="font-semibold text-foreground">More Tools</h2>
        <p className="text-xs text-foreground/60">Additional study resources</p>
      </div>
      <div className="p-3 space-y-2">
        <motion.button
          onClick={() => {
            playSettings();
            open();
          }}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-foreground/70 hover:text-primary transition-all border border-card-border"
          whileHover={{ x: 2 }}
          whileTap={{ scale: 0.97 }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2.25 2.25 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 5 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.67 15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 0-2.83 2.25 2.25 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H10a1.65 1.65 0 0 0 1-1.51 1.65 1.65 0 0 0-1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82.33l.06.06a2 2 0 0 1 2.83 0 2.25 2.25 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1 1.51v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2.25 2.25 0 0 1-2.83 0z" />
          </svg>
          Settings
        </motion.button>
      </div>
    </motion.div>
  );
}