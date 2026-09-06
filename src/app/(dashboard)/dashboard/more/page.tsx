"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import { useSettingsModal } from "@/contexts/SettingsModalContext";
import { useState } from "react";
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
  BellAlertIcon,
  ChartBarIcon,
  TrophyIcon,
  ArrowTopRightOnSquareIcon,
  CommandLineIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import KeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog";

interface NavLink {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc?: string;
  href?: string;
  onClick?: () => void;
}

export default function MorePage() {
  const { preferences } = useAuth();
  const { open } = useSettingsModal();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const learn: NavLink[] = [
    {
      icon: ChatBubbleLeftEllipsisIcon,
      title: "AI Tutor",
      desc: "Ask any study question and get step-by-step help",
      href: "/dashboard/chat",
    },
    {
      icon: PhotoIcon,
      title: "Photo Doubt",
      desc: "Snap a problem and get instant solutions",
      href: "/dashboard/photo-doubt",
    },
    {
      icon: BookOpenIcon,
      title: "Practice Quiz",
      desc: "Board-aligned quizzes for every subject",
      href: "/dashboard/quiz",
    },
    {
      icon: Squares2X2Icon,
      title: "Flashcards",
      desc: "Spaced repetition for any topic",
      href: "/dashboard/flashcards",
    },
  ];

  const organize: NavLink[] = [
    {
      icon: DocumentTextIcon,
      title: "Notes",
      desc: "Organize study notes with subjects and tags",
      href: "/dashboard/notes",
    },
    {
      icon: FolderIcon,
      title: "Resources",
      desc: "Save videos, articles, PDFs and links",
      href: "/dashboard/resources",
    },
    {
      icon: CalendarIcon,
      title: "Study Planner",
      desc: "Plan your day and build a focused schedule",
      href: "/dashboard/planner",
    },
    {
      icon: ClockIcon,
      title: "Focus Timer",
      desc: "Pomodoro and stopwatch for deep focus",
      href: "/dashboard/timer",
    },
  ];

  const track: NavLink[] = [
    {
      icon: ChartBarIcon,
      title: "Progress",
      desc: "Charts and insights on your study time",
      href: "/dashboard/progress",
    },
    {
      icon: TrophyIcon,
      title: "Leaderboard",
      desc: "See how you compare with other learners",
      href: "/dashboard/leaderboard",
    },
    {
      icon: FolderIcon,
      title: "History",
      desc: "Past doubts, chats, and study sessions",
      href: "/dashboard/history",
    },
  ];

  const account: NavLink[] = [
    {
      icon: UserIcon,
      title: "Profile",
      desc: "Manage your personal information",
      href: "/dashboard/profile",
    },
    {
      icon: BellAlertIcon,
      title: "Notifications",
      desc: "Recent updates and alerts",
      href: "/dashboard/notes",
    },
    {
      icon: Cog6ToothIcon,
      title: "Settings",
      desc: "Animations, sound, privacy and more",
      onClick: () => open(),
    },
  ];

  const help: NavLink[] = [
    {
      icon: CommandLineIcon,
      title: "Keyboard Shortcuts",
      desc: "Work faster with these shortcuts",
      onClick: () => setShortcutsOpen(true),
    },
  ];

  const sections: { label: string; items: NavLink[] }[] = [
    { label: "LEARN", items: learn },
    { label: "ORGANIZE", items: organize },
    { label: "TRACK", items: track },
    { label: "ACCOUNT", items: account },
    { label: "HELP", items: help },
  ];

  return (
    <>
      <motion.div
        initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined}
        animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined}
        className="space-y-6 w-full"
      >
        <div className="flex items-center gap-2">
          <Squares2X2Icon className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-semibold">More</h1>
        </div>

        {sections.map((section) => (
          <section key={section.label}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-foreground/45 mb-3">
              {section.label}
            </h2>
            <div className="space-y-2">
              {section.items.map((item) => {
                const body = (
                  <>
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{item.title}</p>
                      {item.desc && (
                        <p className="text-xs text-foreground/55 mt-0.5">{item.desc}</p>
                      )}
                    </div>
                    {item.href?.startsWith("http") ? (
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-foreground/30 flex-shrink-0" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-foreground/30 flex-shrink-0" />
                    )}
                  </>
                );
                const className =
                  "flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 hover:bg-foreground/[0.02] hover:border-primary/30 transition-colors cursor-pointer w-full text-left focus-ring";

                if (item.onClick) {
                  return (
                    <button
                      key={item.title}
                      onClick={item.onClick}
                      className={className}
                    >
                      {body}
                    </button>
                  );
                }
                if (item.href) {
                  return (
                    <Link key={item.title} href={item.href} className={className}>
                      {body}
                    </Link>
                  );
                }
                return null;
              })}
            </div>
          </section>
        ))}
      </motion.div>

      <KeyboardShortcutsDialog
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </>
  );
}
