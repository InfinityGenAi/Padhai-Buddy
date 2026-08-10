"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
  HomeIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { motion, useReducedMotion } from "framer-motion";
import { playLogout, playSettings } from "@/lib/sounds";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Chat Doubt", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon },
  { name: "Photo Doubt", href: "/dashboard/photo-doubt", icon: PhotoIcon },
  { name: "History", href: "/dashboard/history", icon: ClockIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout, preferences } = useAuth();
  const { open } = useSettingsModal();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:shadow-sm lg:overflow-y-auto lg:overflow-x-hidden bg-sidebar relative z-20" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Padhai Buddy</h2>
        </div>

        {/* User mini profile */}
        {user && (
          <div className="px-4 pb-4">
            <div className="glass rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name || "Student"}
                </p>
                <p className="text-xs text-foreground/50 truncate">
                  Class {user.class} — {user.board}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                  whileHover={animationsEnabled ? { x: isActive ? 0 : 3 } : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 pt-3 pb-4 px-2 space-y-1">
          <motion.button
            onClick={() => {
              playSettings();
              open();
            }}
            whileHover={animationsEnabled ? { x: 3 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-all w-full"
          >
            <Cog6ToothIcon className="w-5 h-5 flex-shrink-0" />
            <span>Settings</span>
          </motion.button>
          <motion.button
            onClick={() => {
              playLogout();
              logout();
            }}
            whileHover={animationsEnabled ? { x: 3 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-all w-full"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
      <path d="M5 16l.5 2L8 19l-2 .5L5 22l-.5-2L2 19l2-.5L5 16z" />
    </svg>
  );
}
