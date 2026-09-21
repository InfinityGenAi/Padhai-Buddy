"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  SparklesIcon,
  PhotoIcon,
  BookOpenIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  Squares2X2Icon,
  ChartBarIcon,
  FolderIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { motion, useReducedMotion } from "framer-motion";
import { playLogout, playSettings } from "@/lib/sounds";
import BrandLogo from "./BrandLogo";
import { useAnalytics } from "@/hooks/useAnalytics";

const navSections = [
  {
    label: "HOME",
    items: [
      { name: "Home", href: "/dashboard", icon: HomeIcon, available: true },
    ],
  },
  {
    label: "LEARN",
    items: [
      { name: "AI Tutor", href: "/dashboard/chat", icon: SparklesIcon, available: true },
      { name: "Notes", href: "/dashboard/notes", icon: DocumentTextIcon, available: true },
      { name: "Resources", href: "/dashboard/resources", icon: FolderIcon, available: true },
    ],
  },
  {
    label: "PRACTICE",
    items: [
      { name: "Quiz", href: "/dashboard/quiz", icon: BookOpenIcon, available: true },
      { name: "Flashcards", href: "/dashboard/flashcards", icon: ArrowPathIcon, available: true },
      { name: "Photo Doubt", href: "/dashboard/photo-doubt", icon: PhotoIcon, available: true },
    ],
  },
  {
    label: "ORGANIZE",
    items: [
      { name: "Planner", href: "/dashboard/planner", icon: CalendarIcon, available: true },
      { name: "Timer", href: "/dashboard/timer", icon: ClockIcon, available: true },
    ],
  },
  {
    label: "TRACK",
    items: [
      { name: "Progress", href: "/dashboard/progress", icon: ChartBarIcon, available: true },
      { name: "History", href: "/dashboard/history", icon: ClockIcon, available: true },
    ],
  },
];

const actionItems = [
  { name: "Profile", icon: UserIcon, href: "/dashboard/profile" },
  { name: "Settings", icon: Cog6ToothIcon, action: "settings" },
  { name: "Logout", icon: ArrowLeftOnRectangleIcon, action: "logout" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, preferences } = useAuth();
  const { open } = useSettingsModal();
  const { trackFeatureUse } = useAnalytics();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const handleNavClick = (feature: string, href: string) => {
    trackFeatureUse(feature);
    // Link will handle navigation
  };

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:border-r lg:border-border lg:shadow-sm lg:overflow-y-auto lg:overflow-x-hidden bg-sidebar relative z-20" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-5 border-b border-border/30">
          <BrandLogo size={36} />
          <h2 className="text-lg font-bold text-primary tracking-tight">Padhai Buddy</h2>
        </div>

        <nav className="flex-1 px-3 space-y-4 overflow-y-auto pb-4">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <h3 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/40 mb-2">
                {section.label}
              </h3>
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => handleNavClick(item.name, item.href)}
                  >
                    <motion.div
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative focus-ring ${
                        active
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary shadow-sm"
                          : "text-foreground/65 hover:bg-foreground/5 hover:text-foreground"
                      }`}
                      whileHover={animationsEnabled ? { x: active ? 0 : 2 } : undefined}
                    >
                      <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {active && (
                        <motion.div
                          layoutId="sidebar-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(99,102,241,0.45)]"
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ))}

          {/* Action items at bottom */}
          <div className="border-t border-border/30 pt-3 space-y-1">
            {actionItems.map((item) => (
              <motion.button
                key={item.name}
                onClick={() => {
                  trackFeatureUse(item.name);
                  if (item.action === "settings") {
                    playSettings();
                    open();
                  } else if (item.action === "logout") {
                    playLogout();
                    logout();
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative focus-ring text-foreground/65 hover:bg-foreground/5 hover:text-foreground`}
                whileHover={animationsEnabled ? { x: 2 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </motion.button>
            ))}
          </div>
        </nav>
      </div>
    </aside>
  );
}