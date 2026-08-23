"use client";

import { motion, useReducedMotion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface LandingBackgroundProps {
  enabled: boolean;
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export default function LandingBackground({ enabled }: LandingBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = Boolean(enabled) && !reducedMotion;
  const touch = isTouchDevice();

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 30, mass: 1 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 30, mass: 1 });

  const layerBgX = useTransform(smoothX, [-1, 1], [-15, 15]);
  const layerBgY = useTransform(smoothY, [-1, 1], [-15, 15]);
  const layerMidX = useTransform(smoothX, [-1, 1], [-30, 30]);
  const layerMidY = useTransform(smoothY, [-1, 1], [-30, 30]);
  const layerFgX = useTransform(smoothX, [-1, 1], [-50, 50]);
  const layerFgY = useTransform(smoothY, [-1, 1], [-50, 50]);

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

  const ambientLights = [
    { top: "8%", left: "12%", size: "600px", duration: 32, delay: 0, keyframe: "pb-light-warm", color: "rgba(247, 237, 222, 0.055)" },
    { top: "55%", left: "65%", size: "550px", duration: 36, delay: 4, keyframe: "pb-light-lavender", color: "rgba(237, 233, 255, 0.05)" },
    { top: "35%", left: "8%", size: "500px", duration: 40, delay: 8, keyframe: "pb-light-blue", color: "rgba(240, 245, 255, 0.05)" },
    { top: "75%", left: "35%", size: "450px", duration: 28, delay: 12, keyframe: "pb-light-peach", color: "rgba(255, 243, 235, 0.04)" },
  ];

  const foregroundShapes = [
    { top: "10%", left: "4%", size: "200px", duration: 38, delay: 0, keyframe: "pb-shape-drift-1" },
    { top: "68%", left: "76%", size: "150px", duration: 42, delay: 3, keyframe: "pb-shape-drift-2" },
    { top: "38%", left: "82%", size: "120px", duration: 36, delay: 6, keyframe: "pb-shape-drift-3" },
  ];

  if (!enabled) return null;

  return (
    <div
      data-pb="background"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
      suppressHydrationWarning
    >
      {/* Base gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#f5f3ff_0%,#fafaf0_55%,#fafaf0_100%)] dark:bg-[radial-gradient(ellipse_at_top,#1a1a3a_0%,#0f0f1a_55%,#0f0f1a_100%)]" />

      {/* Paper texture */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={{ x: layerBgX, y: layerBgY, willChange: enableParallax ? "transform" : undefined }}
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(139, 92, 246, 0.015) 0px, rgba(139, 92, 246, 0.015) 0.5px, transparent 0.5px, transparent 8px), repeating-linear-gradient(-45deg, rgba(139, 92, 246, 0.01) 0px, rgba(139, 92, 246, 0.01) 0.5px, transparent 0.5px, transparent 8px), radial-gradient(circle at 2px 2px, rgba(139, 92, 246, 0.02) 0.4px, transparent 0.4px)",
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
              "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 0.5px, transparent 0.5px, transparent 8px), repeating-linear-gradient(-45deg, rgba(255, 255, 255, 0.01) 0px, rgba(255, 255, 255, 0.01) 0.5px, transparent 0.5px, transparent 8px), radial-gradient(circle at 2px 2px, rgba(255, 255, 255, 0.02) 0.4px, transparent 0.4px)",
            backgroundSize: "16px 16px, 16px 16px, 16px 16px",
            opacity: 0.35,
            animation: shouldAnimate ? "pb-texture-drift 55s ease-in-out 5s infinite both" : "none",
          }}
          data-pb="texture"
        />
      </motion.div>

      {/* Ambient light fields */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={{ x: layerMidX, y: layerMidY, willChange: enableParallax ? "transform" : undefined }}
      >
        {ambientLights.map((light) => (
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
              opacity: 0.5,
              animation: shouldAnimate
                ? `${light.keyframe} ${light.duration}s ease-in-out ${light.delay}s infinite alternate`
                : "none",
              willChange: shouldAnimate ? "transform, opacity" : undefined,
            }}
          />
        ))}
      </motion.div>

      {/* Foreground geometric shapes */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={{ x: layerFgX, y: layerFgY, willChange: enableParallax ? "transform" : undefined }}
      >
        {foregroundShapes.map((shape, i) => (
          <div
            key={`shape-${i}`}
            data-pb="study-decoration"
            className="absolute rounded-2xl"
            style={{
              top: shape.top,
              left: shape.left,
              width: shape.size,
              height: shape.size,
              border: "1px solid rgba(139, 92, 246, 0.08)",
              opacity: shouldAnimate ? 0.03 + (i % 2 === 0 ? 0.005 : 0) : 0.02,
              animation: shouldAnimate
                ? `${shape.keyframe} ${shape.duration}s ease-in-out ${shape.delay}s infinite alternate`
                : "none",
              willChange: shouldAnimate ? "transform, opacity" : undefined,
            }}
          />
        ))}
      </motion.div>

      {/* Subtle floating orbs */}
      <motion.div
        data-pb="parallax"
        className="absolute inset-0"
        style={{ x: layerFgX, y: layerFgY, willChange: enableParallax ? "transform" : undefined }}
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={`orb-${i}`}
            className="absolute rounded-full bg-primary/5"
            style={{
              width: `${20 + i * 8}px`,
              height: `${20 + i * 8}px`,
              top: `${15 + i * 15}%`,
              left: `${10 + i * 12}%`,
            }}
            animate={shouldAnimate ? {
              y: [0, -10, 0],
              x: [0, 5, 0],
            } : undefined}
            transition={shouldAnimate ? {
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            } : undefined}
          />
        ))}
      </motion.div>
    </div>
  );
}