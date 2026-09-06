"use client";

import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "subtle" | "glass" | "glass-strong" | "elevated";
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
  animate?: boolean;
}

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

const variantClasses = {
  default: "bg-card border border-card-border shadow-sm rounded-2xl",
  subtle: "subtle-card",
  glass: "glass",
  "glass-strong": "glass-strong",
  elevated: "bg-card border border-card-border shadow-lg rounded-2xl",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      hover = false,
      padding = "md",
      children,
      animate = true,
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${hover ? "card-hover" : ""}
      ${className}
    `;

    if (animate) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
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

Card.displayName = "Card";

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  children,
  className = "",
  ...props
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`} {...props}>
      <div className="flex-1 min-w-0">
        {children ? (
          children
        ) : (
          <>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-foreground-muted mt-0.5">{description}</p>
            )}
          </>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardContent({ children, className = "", ...props }: CardContentProps) {
  return <div className={className} {...props}>{children}</div>;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CardFooter({ children, className = "", ...props }: CardFooterProps) {
  return (
    <div className={`flex items-center gap-2 mt-4 pt-4 border-t border-card-border ${className}`} {...props}>
      {children}
    </div>
  );
}