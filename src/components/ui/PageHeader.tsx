"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface PageHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function PageHeader({
  title,
  description,
  action,
  icon,
  className = "",
  animate = true,
  delay = 0,
}: PageHeaderProps) {
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center text-primary flex-shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-foreground-muted mt-1">{description}</p>
            )}
          </div>
        </div>
      </div>
      {action && <div className="flex-shrink-0 mt-1">{action}</div>}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay }}
        className={`mb-6 ${className}`}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={`mb-6 ${className}`}>{content}</div>;
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  animate?: boolean;
  delay?: number;
}

export function SectionHeader({
  title,
  description,
  action,
  className = "",
  animate = true,
  delay = 0,
}: SectionHeaderProps) {
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && (
          <p className="text-sm text-foreground-muted mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay }}
        className={`mb-4 ${className}`}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={`mb-4 ${className}`}>{content}</div>;
}

export interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "error" | "teal";
  size?: "sm" | "md" | "lg";
  className?: string;
  dot?: boolean;
}

const variantClasses = {
  default: "bg-foreground/5 text-foreground-muted border border-card-border",
  primary: "bg-primary-soft text-primary border border-primary/20",
  success: "bg-success-light text-success border border-success/20",
  warning: "bg-warning-light text-warning border border-warning/20",
  error: "bg-error-light text-error border border-error/20",
  teal: "bg-teal-soft text-teal border border-teal/20",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
  dot = false,
}: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" aria-hidden="true" />}
      {children}
    </span>
  );
}