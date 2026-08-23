"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  HomeIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  BookOpenIcon,
  SparklesIcon,
  DocumentTextIcon,
  CalendarIcon,
  SpeakerWaveIcon,
  TrophyIcon,
  BoltIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { motion, useReducedMotion } from "framer-motion";
import { playLogout, playSettings } from "@/lib/sounds";
import BrandLogo from "./BrandLogo";

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon, available: true },
  { name: "AI Chat", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon, available: true },
  { name: "Photo Doubt", href: "/dashboard/photo-doubt", icon: PhotoIcon, available: true },
  { name: "Quiz", href: "/dashboard/quiz", icon: BookOpenIcon, available: true },
  { name: "Flashcards", href: "/dashboard/flashcards", icon: SparklesIcon, available: true },
  { name: "Notes", href: "/dashboard/notes", icon: DocumentTextIcon, available: true },
  { name: "Planner", href: "/dashboard/planner", icon: CalendarIcon, available: true },
  { name: "Timer", href: "/dashboard/timer", icon: BoltIcon, available: true },
  { name: "Resources", href: "/dashboard/resources", icon: SpeakerWaveIcon, available: true },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: TrophyIcon, available: true },
  { name: "Profile", href: "/dashboard/profile", icon: UserIcon, available: true },
  { name: "Settings", href: "#", icon: Cog6ToothIcon, available: true, isAction: true },
  { name: "Logout", href: "#", icon: ArrowLeftOnRectangleIcon, available: true, isAction: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, preferences } = useAuth();
  const { open } = useSettingsModal();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:shadow-sm lg:overflow-y-auto lg:overflow-x-hidden bg-sidebar relative z-20" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5">
          <BrandLogo size={36} />
          <h2 className="text-lg font-bold text-primary tracking-tight">Padhai Buddy</h2>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {mainNavItems.map((item) => {
            const isActive = !item.isAction && pathname === item.href;

            if (item.isAction) {
              return (
                <motion.button
                  key={item.name}
                  onClick={() => {
                    if (item.name === "Settings") {
                      playSettings();
                      open();
                    } else if (item.name === "Logout") {
                      playLogout();
                      logout();
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative focus-ring ${
                    "text-foreground/65 hover:bg-foreground-subtle-hover hover:text-foreground"
                  }`}
                  whileHover={animationsEnabled ? { x: 2 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                </motion.button>
              );
            }

            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative focus-ring ${
                    isActive
                      ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                      : "text-foreground/65 hover:bg-foreground-subtle-hover hover:text-foreground"
                  }`}
                  whileHover={animationsEnabled ? { x: isActive ? 0 : 2 } : undefined}
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span className="truncate">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(124,58,237,0.45)]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/50 pt-3 pb-4 px-3 space-y-0.5 mt-auto">
        </div>
      </div>
    </aside>
  );
}
