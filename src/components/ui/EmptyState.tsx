"use client";

import { type ReactNode, type ComponentType } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import {
  MagnifyingGlassIcon,
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  BookOpenIcon,
  DocumentTextIcon,
  CalendarIcon,
  ClockIcon,
  SparklesIcon,
  PlusIcon,
  InboxIcon,
  UserIcon,
  ShieldExclamationIcon,
} from "@heroicons/react/24/outline";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  variant?: "default" | "search" | "chat" | "photo" | "quiz" | "notes" | "planner" | "timer" | "flashcards" | "progress" | "history" | "resources" | "notifications" | "profile";
  className?: string;
  animate?: boolean;
  illustration?: boolean;
  children?: ReactNode;
}

const variantConfig = {
  default: {
    icon: InboxIcon,
    title: "Nothing here yet",
    description: "Get started by creating your first item.",
  },
  search: {
    icon: MagnifyingGlassIcon,
    title: "No results found",
    description: "Try adjusting your search or filter criteria.",
  },
  chat: {
    icon: ChatBubbleLeftEllipsisIcon,
    title: "Start a new conversation",
    description: "Ask Padhai Buddy any study question — we'll explain it step by step, tailored to your class and board.",
  },
  photo: {
    icon: PhotoIcon,
    title: "No photo doubts yet",
    description: "Snap a photo of any problem and get instant AI-powered solutions.",
  },
  quiz: {
    icon: BookOpenIcon,
    title: "No quizzes taken yet",
    description: "Test your knowledge with board-aligned practice quizzes.",
  },
  notes: {
    icon: DocumentTextIcon,
    title: "No notes yet",
    description: "Create your first study note to organize your learning.",
  },
  planner: {
    icon: CalendarIcon,
    title: "No study plans yet",
    description: "Add your first task to start organizing your study schedule.",
  },
  timer: {
    icon: ClockIcon,
    title: "No timer sessions yet",
    description: "Start a Pomodoro, stopwatch, or custom timer to track your focus time.",
  },
  flashcards: {
    icon: SparklesIcon,
    title: "No flashcard decks yet",
    description: "Create a deck and add cards to start spaced repetition learning.",
  },
  progress: {
    icon: SparklesIcon,
    title: "No progress data yet",
    description: "Start studying to see your progress analytics here.",
  },
  history: {
    icon: ClockIcon,
    title: "No history yet",
    description: "Your solved doubts and chat conversations will appear here.",
  },
  resources: {
    icon: BookOpenIcon,
    title: "No resources yet",
    description: "Add your first learning resource to build your personal library.",
  },
  notifications: {
    icon: ShieldExclamationIcon,
    title: "No notifications",
    description: "You're all caught up! New notifications will appear here.",
  },
  profile: {
    icon: UserIcon,
    title: "Profile incomplete",
    description: "Complete your profile to get personalized study recommendations.",
  },
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  variant = "default",
  className = "",
  animate = true,
  illustration = true,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const displayTitle = title || config.title;
  const displayDescription = description || config.description;
  const displayIcon = icon || config.icon;

  const content = (
    <div className={`flex flex-col items-center text-center py-12 px-4 ${className}`}>
      {illustration && (
        <motion.div
          className="relative mb-6"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-24 h-24 rounded-2xl bg-primary-soft flex items-center justify-center shadow-md mx-auto">
            {typeof displayIcon === "function" ? (
              (() => {
                const IconComponent = displayIcon as ComponentType<{ className?: string }>;
                return <IconComponent className="w-12 h-12 text-primary" />;
              })()
            ) : (
              <span className="text-4xl">{displayIcon}</span>
            )}
          </div>
          <motion.div
            className="absolute -inset-2 rounded-2xl bg-primary-soft opacity-20 blur-xl"
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        </motion.div>
      )}
      <h3 className="text-lg font-semibold text-foreground mb-1">{displayTitle}</h3>
      {displayDescription && (
        <p className="text-sm text-foreground-muted max-w-sm mb-6">{displayDescription}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          {action && <div className="flex-1">{action}</div>}
          {secondaryAction && <div className="flex-1">{secondaryAction}</div>}
        </div>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export function ChatEmptyState({
  studyModes = [],
  onStartChat,
}: {
  studyModes?: { id: string; label: string; icon: ReactNode }[];
  onStartChat?: () => void;
}) {
  return (
    <EmptyState
      variant="chat"
      action={onStartChat ? (
        <Button variant="primary" onClick={onStartChat} fullWidth leftIcon={<PlusIcon className="w-4 h-4" />}>
          Start Chatting
        </Button>
      ) : undefined}
    >
      {studyModes.length > 0 && (
        <div className="mt-6 w-full max-w-sm text-left">
          <p className="text-xs font-medium text-foreground-muted mb-3">Try asking:</p>
          <ul className="space-y-2 text-sm text-foreground-muted" role="list">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
              &ldquo;Explain photosynthesis for Class 10&rdquo;
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
              &ldquo;Help me solve this quadratic equation&rdquo;
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/30 flex-shrink-0" />
              &ldquo;Quiz me on periodic table trends&rdquo;
            </li>
          </ul>
          {studyModes.length > 0 && (
            <div className="mt-4 pt-4 border-t border-card-border">
              <p className="text-xs font-medium text-foreground-muted mb-2">Choose a Study Mode:</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {studyModes.slice(0, 4).map((mode) => (
                  <button
                    key={mode.id}
                    className="px-2 py-1 text-[10px] bg-card border border-card-border rounded-full text-foreground-muted hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {typeof mode.icon === "function" ? (() => {
                      const IconComponent = mode.icon as ComponentType<{ className?: string }>;
                      return <IconComponent className="w-3 h-3 inline mr-1" />;
                    })() : mode.icon}
                    {mode.label}
                  </button>
                ))}
                {studyModes.length > 4 && (
                  <span className="px-2 py-1 text-[10px] bg-card border border-card-border rounded-full text-foreground-subtle">
                    +{studyModes.length - 4} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </EmptyState>
  );
}