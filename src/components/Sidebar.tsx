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
  BookOpenIcon,
  SparklesIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  SpeakerWaveIcon,
  TrophyIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { motion, useReducedMotion } from "framer-motion";
import { playLogout, playSettings } from "@/lib/sounds";

const mainNavItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon, available: true },
  { name: "Chat Doubt", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon, available: true },
  { name: "Photo Doubt", href: "/dashboard/photo-doubt", icon: PhotoIcon, available: true },
  { name: "Quick Quiz", href: "/dashboard/quiz", icon: BookOpenIcon, available: true },
  { name: "Flashcards", href: "/dashboard/flashcards", icon: SparklesIcon, available: true },
  { name: "Notes", href: "/dashboard/notes", icon: DocumentTextIcon, available: true },
  { name: "Study Planner", href: "/dashboard/planner", icon: CalendarIcon, available: true },
  { name: "Study Timer", href: "/dashboard/timer", icon: ClockIcon, available: true },
  { name: "Progress", href: "/dashboard/progress", icon: ChartBarIcon, available: true },
  { name: "History", href: "/dashboard/history", icon: ClockIcon, available: true },
  { name: "Resources", href: "/dashboard/resources", icon: SpeakerWaveIcon, available: true },
  { name: "Leaderboard", href: "/dashboard/leaderboard", icon: TrophyIcon, available: true },
  { name: "More", href: "/dashboard/more", icon: Squares2X2Icon, available: true },
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
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
            <LogoIcon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-bold text-primary tracking-tight">Padhai Buddy</h2>
        </div>

        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative focus-ring ${
                    isActive
                      ? "bg-primary/10 text-primary"
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
          <motion.button
            onClick={() => {
              playSettings();
              open();
            }}
            whileHover={animationsEnabled ? { x: 2 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/65 hover:bg-foreground-subtle-hover hover:text-foreground transition-all w-full focus-ring"
          >
            <Cog6ToothIcon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>Settings</span>
          </motion.button>
          <motion.button
            onClick={() => {
              playLogout();
              logout();
            }}
            whileHover={animationsEnabled ? { x: 2 } : undefined}
            whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground/65 hover:bg-foreground-subtle-hover hover:text-foreground transition-all w-full focus-ring"
          >
            <ArrowLeftOnRectangleIcon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </aside>
  );
}

function LogoIcon({ className }: { className?: string }) {
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
