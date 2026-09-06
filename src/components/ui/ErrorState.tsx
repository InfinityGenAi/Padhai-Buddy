"use client";

import { type ReactNode, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "./Button";
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  WifiIcon,
  ServerIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  variant?: "default" | "network" | "server" | "not-found" | "permission";
  onRetry?: () => void;
  retryText?: string;
  onDismiss?: () => void;
  className?: string;
  animate?: boolean;
}

const variantConfig = {
  default: {
    icon: ExclamationTriangleIcon,
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
  },
  network: {
    icon: WifiIcon,
    title: "Connection lost",
    message: "Please check your internet connection and try again.",
    color: "text-amber-500",
    bg: "bg-amber-50 border-amber-200",
  },
  server: {
    icon: ServerIcon,
    title: "Server error",
    message: "Our servers are having trouble. Please try again in a moment.",
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
  },
  "not-found": {
    icon: DocumentTextIcon,
    title: "Not found",
    message: "The requested resource could not be found.",
    color: "text-blue-500",
    bg: "bg-blue-50 border-blue-200",
  },
  permission: {
    icon: XCircleIcon,
    title: "Access denied",
    message: "You don't have permission to access this resource.",
    color: "text-red-500",
    bg: "bg-red-50 border-red-200",
  },
};

export function ErrorState({
  title,
  message,
  variant = "default",
  onRetry,
  retryText = "Try again",
  onDismiss,
  className = "",
  animate = true,
}: ErrorStateProps) {
  const config = variantConfig[variant];
  const displayTitle = title || config.title;
  const displayMessage = message || config.message;

  const content = (
    <div className={`flex flex-col items-center text-center p-6 rounded-2xl border ${config.bg} ${className}`}>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${config.color} bg-current/10`}>
        <config.icon className="w-7 h-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{displayTitle}</h3>
      <p className="text-sm text-foreground-muted max-w-sm mb-6">{displayMessage}</p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        {onRetry && (
          <Button variant="primary" onClick={onRetry} fullWidth>
            {retryText}
          </Button>
        )}
        {onDismiss && (
          <Button variant="secondary" onClick={onDismiss} fullWidth>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export interface InlineErrorProps {
  message: string;
  className?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function InlineError({ message, className = "", dismissible = false, onDismiss }: InlineErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -5, height: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl bg-error-light border border-error/20 text-error text-sm ${className}`}
      role="alert"
    >
      <XCircleIcon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <p className="flex-1">{message}</p>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-error/10 text-error/70 transition-colors flex-shrink-0"
          aria-label="Dismiss error"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

export interface ToastErrorProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export function ToastError({ message, onClose, duration = 5000 }: ToastErrorProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50 max-w-sm"
    >
      <div className="bg-card border border-error/20 rounded-xl p-4 shadow-xl flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center flex-shrink-0">
          <ExclamationTriangleIcon className="w-5 h-5 text-error" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Error</p>
          <p className="text-sm text-error mt-0.5">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-foreground/5 text-foreground-muted transition-colors flex-shrink-0"
          aria-label="Close"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}