"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  animate?: boolean;
  delay?: number;
}

export function Section({ children, className = "", id, animate = true, delay = 0 }: SectionProps) {
  if (animate) {
    return (
      <motion.section
        id={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay }}
        className={className}
      >
        {children}
      </motion.section>
    );
  }

  return <section id={id} className={className}>{children}</section>;
}

export interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-full",
};

export function Container({ children, className = "", size = "xl" }: ContainerProps) {
  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
}

export interface DividerProps {
  className?: string;
  text?: string;
}

export function Divider({ className = "", text }: DividerProps) {
  if (text) {
    return (
      <div className={`relative my-6 ${className}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-card-border" />
        </div>
        <div className="relative flex justify-center text-xs text-foreground-subtle">
          <span className="bg-background px-2">{text}</span>
        </div>
      </div>
    );
  }

  return <hr className={`border-card-border my-6 ${className}`} />;
}

export interface GridProps {
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4 | 5;
  gap?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const columnsClasses = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
};

const gapClasses = {
  sm: "gap-3",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

export function Grid({ children, columns = 3, gap = "md", className = "" }: GridProps) {
  return (
    <div className={`grid ${columnsClasses[columns]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}

export interface StackProps {
  children: ReactNode;
  direction?: "vertical" | "horizontal";
  gap?: "sm" | "md" | "lg" | "xl";
  className?: string;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
}

const gapClassesStack = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const directionClasses = {
  vertical: "flex-col",
  horizontal: "flex-row",
};

const alignClasses = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyClasses = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export function Stack({
  children,
  direction = "vertical",
  gap = "md",
  className = "",
  align = "stretch",
  justify = "start",
}: StackProps) {
  return (
    <div className={`flex ${directionClasses[direction]} ${gapClassesStack[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  );
}

export interface CenterProps {
  children: ReactNode;
  className?: string;
}

export function Center({ children, className = "" }: CenterProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}