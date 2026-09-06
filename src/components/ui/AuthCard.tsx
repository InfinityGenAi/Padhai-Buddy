"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface AuthCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  animate?: boolean;
  className?: string;
}

export const AuthCard = forwardRef<HTMLDivElement, AuthCardProps>(
  (
    {
      children,
      animate = true,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      bg-white border border-border rounded-2xl shadow-xl p-8 w-full max-w-md
      ${className}
    `;

    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={baseClasses}
          style={style as HTMLMotionProps<"div">["style"]}
          {...(props as HTMLMotionProps<"div">)}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={baseClasses} style={style} {...props}>
        {children}
      </div>
    );
  }
);

AuthCard.displayName = "AuthCard";

export interface AuthInputWrapperProps {
  children: ReactNode;
  className?: string;
}

export function AuthInputWrapper({ children, className = "" }: AuthInputWrapperProps) {
  return (
    <div className={`space-y-5 ${className}`}>
      {children}
    </div>
  );
}

export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function Divider({ label = "OR", className = "", ...props }: DividerProps) {
  return (
    <div className={`relative my-6 ${className}`} {...props}>
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs text-foreground/50">
        <span className="bg-white px-2">{label}</span>
      </div>
    </div>
  );
}