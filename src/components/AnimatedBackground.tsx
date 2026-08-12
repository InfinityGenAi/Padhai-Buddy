"use client";

import { motion, useReducedMotion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

export type BackgroundVariant =
  | "home"
  | "auth"
  | "dashboard"
  | "chat"
  | "photo-doubt"
  | "history"
  | "default";

interface AnimatedBackgroundProps {
  animate?: boolean;
  variant?: BackgroundVariant;
}

function resolveVariant(pathname: string): BackgroundVariant {
  if (pathname === "/") return "home";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/onboarding")) {
    return "auth";
  }
  if (pathname === "/dashboard/chat") return "chat";
  if (pathname === "/dashboard/photo-doubt") return "photo-doubt";
  if (pathname === "/dashboard/history") return "history";
  if (pathname === "/dashboard") return "dashboard";
  return "default";
}

const VARIANT_INTENSITY: Record<BackgroundVariant, number> = {
  home: 1.0,
  dashboard: 1.0,
  history: 0.8,
  "photo-doubt": 0.65,
  chat: 0.35,
  auth: 0.3,
  default: 0.3,
};

const ANIMATION_CONFIG = {
  lightDuration: [24, 40],
  lightOpacity: { min: 0.025, max: 0.07 },
  textureDriftDuration: [40, 60],
  shapeDriftDuration: [30, 45],
  parallax: {
    bg: [-2, 2],
    mid: [-5, 5],
    texture: [-2, 2],
    fg: [-6, 6],
  },
  spring: { stiffness: 40, damping: 30, mass: 1 },
};

const AMBIENT_LIGHTS: {
  color: string;
  size: string;
  duration: number;
  delay: number;
  keyframe: string;
  top: string;
  left: string;
}[] = [
  {
    color: "rgba(247, 237, 222, 0.055)",
    size: "1000px",
    duration: 32,
    delay: 0,
    keyframe: "pb-light-warm",
    top: "8%",
    left: "12%",
  },
  {
    color: "rgba(237, 233, 255, 0.05)",
    size: "950px",
    duration: 36,
    delay: 4,
    keyframe: "pb-light-lavender",
    top: "55%",
    left: "65%",
  },
  {
    color: "rgba(240, 245, 255, 0.05)",
    size: "900px",
    duration: 40,
    delay: 8,
    keyframe: "pb-light-blue",
    top: "35%",
    left: "8%",
  },
  {
    color: "rgba(255, 243, 235, 0.04)",
    size: "850px",
    duration: 28,
    delay: 12,
    keyframe: "pb-light-peach",
    top: "75%",
    left: "35%",
  },
];

const FOREGROUND_SHAPES: {
  top: string;
  left: string;
  size: string;
  duration: number;
  delay: number;
  keyframe: string;
}[] = [
  { top: "10%", left: "4%", size: "260px", duration: 38, delay: 0, keyframe: "pb-shape-drift-1" },
  { top: "68%", left: "76%", size: "200px", duration: 42, delay: 3, keyframe: "pb-shape-drift-2" },
  { top: "38%", left: "82%", size: "160px", duration: 36, delay: 6, keyframe: "pb-shape-drift-3" },
];

function layerStyle<T>(x: MotionValue<T>, y: MotionValue<T>, shouldAnimate: boolean) {
  return shouldAnimate ? { x, y, willChange: "transform" } : { transform: "none" };
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export default function AnimatedBackground({
  animate = true,
  variant: externalVariant,
}: AnimatedBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = Boolean(animate) && !reducedMotion;
  const pathname = usePathname();
  const resolvedVariant = externalVariant ?? resolveVariant(pathname);
  const intensity = VARIANT_INTENSITY[resolvedVariant];
  const touch = isTouchDevice();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, ANIMATION_CONFIG.spring);
  const smoothY = useSpring(mouseY, ANIMATION_CONFIG.spring);

  const layerBgX = useTransform(smoothX, [-1, 1], ANIMATION_CONFIG.parallax.bg as [number, number]);
  const layerBgY = useTransform(smoothY, [-1, 1], ANIMATION_CONFIG.parallax.bg as [number, number]);
  const layerMidX = useTransform(smoothX, [-1, 1], ANIMATION_CONFIG.parallax.mid as [number, number]);
  const layerMidY = useTransform(smoothY, [-1, 1], ANIMATION_CONFIG.parallax.mid as [number, number]);
  const layerFgX = useTransform(smoothX, [-1, 1], ANIMATION_CONFIG.parallax.fg as [number, number]);
  const layerFgY = useTransform(smoothY, [-1, 1], ANIMATION_CONFIG.parallax.fg as [number, number]);

  const enableParallax = shouldAnimate && !touch;

  useEffect(() => {
    if (!enableParallax) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;
      mouseX.set(x);
      mouseY.set(y);
    };

    const handlePointerLeave = () => {
      mouseX.set(0);
      mouseY.set(0);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      mouseX.set(0);
      mouseY.set(0);
    };
  }, [enableParallax, mouseX, mouseY]);

  const lightOpacity = 0.3 + 0.7 * intensity;

  return (
    <div
      data-pb="background"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      suppressHydrationWarning
      aria-hidden="true"
    >
      {/* BACKGROUND: paper texture (1-2px parallax) */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={layerStyle(layerBgX, layerBgY, enableParallax)}
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(139, 92, 246, 0.018) 0px, rgba(139, 92, 246, 0.018) 0.6px, transparent 0.6px, transparent 8px), repeating-linear-gradient(-45deg, rgba(139, 92, 246, 0.012) 0px, rgba(139, 92, 246, 0.012) 0.5px, transparent 0.5px, transparent 8px), radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.025) 0.4px, transparent 0.4px)",
            backgroundSize: "16px 16px, 16px 16px, 16px 16px",
            opacity: 0.4,
            animation: shouldAnimate ? "pb-texture-drift 50s ease-in-out 0s infinite both" : "none",
          }}
          data-pb="texture"
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.02) 0px, rgba(255, 255, 255, 0.02) 0.6px, transparent 0.6px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 0.5px, transparent 0.5px, transparent 8px), radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.025) 0.4px, transparent 0.4px)",
            backgroundSize: "16px 16px, 16px 16px, 16px 16px",
            opacity: 0.35,
            animation: shouldAnimate ? "pb-texture-drift 55s ease-in-out 5s infinite both" : "none",
          }}
          data-pb="texture"
        />
      </motion.div>

      {/* MIDDLE: ambient light fields (3-6px parallax) */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={layerStyle(layerMidX, layerMidY, enableParallax)}
      >
        {AMBIENT_LIGHTS.map((light) => (
          <div
            key={light.keyframe}
            data-pb="ambient-light"
            className="absolute rounded-full"
            style={{
              top: light.top,
              left: light.left,
              width: light.size,
              height: light.size,
              transform: "translate3d(0, 0, 0)",
              background: `radial-gradient(circle, ${light.color} 0%, transparent 70%)`,
              filter: "blur(90px)",
              opacity: lightOpacity,
              animation: shouldAnimate
                ? `${light.keyframe} ${light.duration}s ease-in-out ${light.delay}s infinite alternate`
                : "none",
              willChange: shouldAnimate ? "transform, opacity" : undefined,
            }}
          />
        ))}
      </motion.div>

      {/* FOREGROUND: subtle geometric shapes (5-8px parallax) */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={layerStyle(layerFgX, layerFgY, enableParallax)}
      >
        {FOREGROUND_SHAPES.map((shape, i) => (
          <div
            key={`shape-${i}`}
            data-pb="study-decoration"
            className="absolute rounded-2xl"
            style={{
              top: shape.top,
              left: shape.left,
              width: shape.size,
              height: shape.size,
              border: "1px solid rgba(216, 196, 169, 0.1)",
              opacity: shouldAnimate
                ? 0.02 * intensity + 0.025 + (i % 2 === 0 ? 0.005 : 0)
                : 0.015,
              animation: shouldAnimate
                ? `${shape.keyframe} ${shape.duration}s ease-in-out ${shape.delay}s infinite alternate`
                : "none",
              willChange: shouldAnimate ? "transform, opacity" : undefined,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
