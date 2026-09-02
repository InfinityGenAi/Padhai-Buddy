"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import {
  Squares2X2Icon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  FolderIcon,
  UserIcon,
  Cog6ToothIcon,
  BookOpenIcon,
  PhotoIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";

export default function MorePage() {
  const { preferences } = useAuth();
  const { open } = useSettingsModal();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const studyOptions = [
    {
      icon: ChatBubbleLeftEllipsisIcon,
      title: "AI Chat",
      href: "/dashboard/chat",
    },
    {
      icon: PhotoIcon,
      title: "Photo Doubt",
      href: "/dashboard/photo-doubt",
    },
    {
      icon: BookOpenIcon,
      title: "Quiz",
      href: "/dashboard/quiz",
    },
    {
      icon: Squares2X2Icon,
      title: "Flashcards",
      href: "/dashboard/flashcards",
    },
    {
      icon: DocumentTextIcon,
      title: "Notes",
      href: "/dashboard/notes",
    },
    {
      icon: CalendarIcon,
      title: "Planner",
      href: "/dashboard/planner",
    },
    {
      icon: ClockIcon,
      title: "Timer",
      href: "/dashboard/timer",
    },
  ];

  const resourcesOptions = [
    {
      icon: FolderIcon,
      title: "Resources",
      href: "/dashboard/resources",
    },
    {
      icon: DocumentTextIcon,
      title: "History",
      href: "/dashboard/history",
    },
  ];

  const accountOptions = [
    {
      icon: UserIcon,
      title: "Profile",
      href: "/dashboard/profile",
    },
    {
      icon: Cog6ToothIcon,
      title: "Settings",
      onClick: () => open(),
    },
  ];

  return (
    <motion.div
      initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
      animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
      className="space-y-6 w-full"
    >
      <div className="flex items-center gap-2">
        <Squares2X2Icon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">More</h1>
      </div>

      <div className="grid gap-6">
        <div>
          <h2 className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4">Learn & Practice</h2>
          <div className="space-y-3">
            {studyOptions.map((option) => (
              <Link
                key={option.title}
                href={option.href}
                className="flex items-center gap-3 rounded-lg border-border/50 p-3 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
              >
                <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">{option.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4">Organize & Track</h2>
          <div className="space-y-3">
            {resourcesOptions.map((option) => (
              <Link
                key={option.title}
                href={option.href}
                className="flex items-center gap-3 rounded-lg border-border/50 p-3 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
              >
                <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="font-medium text-foreground">{option.title}</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4">Account</h2>
          <div className="space-y-3">
            {accountOptions.map((option) => {
              if (option.onClick) {
                return (
                  <button
                    key={option.title}
                    onClick={option.onClick}
                    className="flex items-center gap-3 rounded-lg border-border/50 p-3 hover:bg-foreground/[0.02] transition-colors cursor-pointer w-full text-left"
                  >
                    <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="font-medium text-foreground">{option.title}</span>
                  </button>
                );
              }
              return (
                <Link
                  key={option.title}
                  href={option.href}
                  className="flex items-center gap-3 rounded-lg border-border/50 p-3 hover:bg-foreground/[0.02] transition-colors cursor-pointer w-full text-left"
                >
                  <option.icon className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="font-medium text-foreground">{option.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}