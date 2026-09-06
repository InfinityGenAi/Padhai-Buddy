"use client";

import React, { type ReactNode, Children, isValidElement, cloneElement, useState, useRef, useEffect, type ReactElement } from "react";
import { motion, type Variants, HTMLMotionProps } from "framer-motion";

export interface AnimatedContainerProps extends Omit<HTMLMotionProps<"div">, "initial" | "animate" | "exit" | "transition" | "variants"> {
  children: ReactNode;
  variant?: "fade" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "scale" | "stagger";
  delay?: number;
  duration?: number;
  staggerDelay?: number;
  animate?: boolean;
  className?: string;
}

const variants: Record<string, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-down": {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  },
  stagger: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
};

const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export function AnimatedContainer({
  children,
  variant = "fade",
  delay = 0,
  duration = 0.4,
  staggerDelay = 0.08,
  animate = true,
  className = "",
  style,
  ...props
}: AnimatedContainerProps) {
  const containerVariants = variants[variant] || variants.fade;

  if (!animate) {
    return <div className={className} style={style as React.CSSProperties} {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  if (variant === "stagger") {
    return (
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay,
              delayChildren: delay,
            },
          },
        }}
        className={className}
        style={style}
        {...props}
      >
        {Children.map(children, (child, index) =>
          isValidElement(child)
            ? cloneElement(child as ReactElement<Record<string, unknown>>, {
                key: child.key || index,
                variants: staggerItem,
              })
            : child
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps {
  children: ReactNode;
  variant?: "fade" | "slide-up" | "slide-down" | "scale";
  delay?: number;
  staggerDelay?: number;
  animate?: boolean;
  className?: string;
}

export function AnimatedList({
  children,
  variant = "slide-up",
  delay = 0,
  staggerDelay = 0.08,
  animate = true,
  className = "",
}: AnimatedListProps) {
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  if (!animate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}
    >
      {Children.map(children, (child, index) =>
        isValidElement(child)
          ? cloneElement(child as ReactElement<Record<string, unknown>>, {
              key: child.key || index,
              variants: itemVariants,
            })
          : child
      )}
    </motion.div>
  );
}

export interface RevealProps {
  children: ReactNode;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  className?: string;
}

export function Reveal({
  children,
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  once = true,
  className = "",
}: RevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return (
    <div ref={ref} className={className}>
      <AnimatedContainer animate={isVisible} variant="slide-up" duration={0.6}>
        {children}
      </AnimatedContainer>
    </div>
  );
}

export function StaggeredReveal({
  children,
  threshold = 0.1,
  rootMargin = "0px 0px -50px 0px",
  staggerDelay = 0.08,
  className = "",
}: Omit<RevealProps, "once"> & { staggerDelay?: number }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={className}>
      <AnimatedList animate={isVisible} staggerDelay={staggerDelay} variant="slide-up">
        {children}
      </AnimatedList>
    </div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
