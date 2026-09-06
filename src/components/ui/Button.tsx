"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "pill-primary" | "pill-secondary" | "pill-ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  animate?: boolean;
}

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

const variantClasses = {
  primary: "btn-primary rounded-xl",
  secondary: "btn-secondary rounded-xl",
  ghost: "btn-ghost rounded-lg",
  outline: "btn-secondary border-card-border hover:border-primary/50 rounded-xl",
  "pill-primary": "btn-primary rounded-full",
  "pill-secondary": "btn-secondary rounded-full",
  "pill-ghost": "btn-ghost rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      leftIcon,
      rightIcon,
      fullWidth = false,
      animate = true,
      className = "",
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center gap-2 font-medium
      transition-all duration-200 ease-out
      focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/30
      disabled:opacity-50 disabled:cursor-not-allowed
      ${fullWidth ? "w-full" : ""}
      ${sizeClasses[size]}
      ${variantClasses[variant]}
    `;

    const content = (
      <>
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </>
    );

    if (animate) {
      return (
        <motion.button
          ref={ref}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className={baseClasses}
          disabled={disabled || isLoading}
          style={style as HTMLMotionProps<"button">["style"]}
          {...(props as HTMLMotionProps<"button">)}
        >
          {content}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={baseClasses}
        disabled={disabled || isLoading}
        style={style}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";