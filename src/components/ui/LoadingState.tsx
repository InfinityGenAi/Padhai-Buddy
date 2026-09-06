"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";

export interface LoadingStateProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  className?: string;
  overlay?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-3",
  xl: "h-12 w-12 border-4",
};

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export function LoadingState({
  size = "md",
  text,
  className = "",
  overlay = false,
}: LoadingStateProps) {
  const content = (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        aria-hidden="true"
      />
      {text && (
        <p className={`${textSizeClasses[size]} text-foreground-muted`}>{text}</p>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="bg-card border border-card-border rounded-2xl p-6 shadow-xl">
          {content}
        </div>
      </div>
    );
  }

  return <div className="flex items-center justify-center">{content}</div>;
}

export interface SkeletonProps {
  variant?: "text" | "circular" | "rectangular" | "card";
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
  style?: React.CSSProperties;
}

export function Skeleton({
  variant = "text",
  width = "100%",
  height,
  className = "",
  lines = 1,
  style,
}: SkeletonProps) {
  const baseStyle = {
    width,
    height: height || (variant === "text" ? "1rem" : variant === "circular" ? "3rem" : "100%"),
    borderRadius: variant === "circular" ? "9999px" : variant === "card" ? "1rem" : "0.5rem",
    background: "linear-gradient(90deg, var(--background-tertiary) 25%, var(--background-elevated) 50%, var(--background-tertiary) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={className} style={{ width }}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
            className="h-4 rounded w-full mb-2"
            style={baseStyle}
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
      style={baseStyle}
      aria-hidden="true"
    />
  );
}

export function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`subtle-card p-5 ${className}`}>
      <Skeleton variant="rectangular" width="40%" height="1.25rem" className="mb-4" />
      <Skeleton variant="text" lines={3} className="mb-4" />
      <Skeleton variant="rectangular" width="60%" height="1rem" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 4, className = "" }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="text-left p-3">
                  <Skeleton variant="text" width="80%" height="0.875rem" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, row) => (
              <tr key={row}>
                {Array.from({ length: columns }).map((_, col) => (
                  <td key={col} className="p-3">
                    <Skeleton variant="text" width="90%" height="1rem" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ListSkeleton({ items = 5, className = "" }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} variant="card" className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  );
}