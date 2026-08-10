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

const AMBIENT_LIGHTS = [
  {
    base: { top: "10%", left: "15%", width: "600px", height: "600px" },
    color: "rgba(139, 92, 246, 0.12)",
    duration: 38,
    xRange: 60,
    yRange: 40,
    delay: 0,
  },
  {
    base: { top: "55%", left: "60%", width: "700px", height: "500px" },
    color: "rgba(59, 130, 246, 0.10)",
    duration: 45,
    xRange: 50,
    yRange: 35,
    delay: 4,
  },
  {
    base: { top: "25%", left: "45%", width: "500px", height: "500px" },
    color: "rgba(236, 72, 153, 0.08)",
    duration: 32,
    xRange: 45,
    yRange: 55,
    delay: 8,
  },
  {
    base: { top: "65%", left: "20%", width: "550px", height: "400px" },
    color: "rgba(99, 102, 241, 0.09)",
    duration: 42,
    xRange: 55,
    yRange: 45,
    delay: 12,
  },
];

const STUDY_DECORATIONS: {
  type: "card" | "progress" | "checklist" | "sparkle" | "scan";
  top: string;
  left: string;
  size?: string;
}[] = [
  {
    type: "card",
    top: "18%",
    left: "8%",
    size: "140px",
  },
  {
    type: "progress",
    top: "72%",
    left: "78%",
    size: "120px",
  },
  {
    type: "checklist",
    top: "28%",
    left: "82%",
    size: "110px",
  },
  {
    type: "sparkle",
    top: "60%",
    left: "12%",
    size: "40px",
  },
];

const VARIANTS: Record<BackgroundVariant, { ambientCount: number; decorations: number }> = {
  home: { ambientCount: 4, decorations: 3 },
  auth: { ambientCount: 2, decorations: 0 },
  dashboard: { ambientCount: 3, decorations: 2 },
  chat: { ambientCount: 2, decorations: 0 },
  "photo-doubt": { ambientCount: 2, decorations: 1 },
  history: { ambientCount: 3, decorations: 2 },
  default: { ambientCount: 3, decorations: 2 },
};

function MiniStudyCard() {
  return (
    <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2.5 backdrop-blur-sm">
      <div className="text-[10px] font-medium text-foreground/40 mb-1.5 tracking-wide uppercase">
        Today&apos;s Goal
      </div>
      <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
        <div className="h-full w-[70%] rounded-full bg-primary/40" />
      </div>
      <div className="text-[9px] text-foreground/30 mt-1 font-mono">70% complete</div>
    </div>
  );
}

function MiniProgressCard() {
  return (
    <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2.5 backdrop-blur-sm">
      <div className="text-[10px] font-medium text-foreground/40 mb-1.5 tracking-wide uppercase">
        Focus
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-lg font-semibold text-foreground/50 font-mono">42</span>
        <span className="text-[9px] text-foreground/30">min</span>
      </div>
      <div className="flex gap-0.5 mt-1.5">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className="h-3 flex-1 rounded-sm bg-foreground/10"
          >
            <div
              className="h-full rounded-sm bg-primary/35"
              style={{ width: bar <= 3 ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChecklistCard() {
  return (
    <div className="rounded-lg border border-foreground/[0.06] bg-foreground/[0.02] p-2.5 backdrop-blur-sm">
      <div className="text-[10px] font-medium text-foreground/40 mb-1.5 tracking-wide uppercase">
        Completed
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-[3px] border border-green-500/40 bg-green-500/15 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-green-600/70">
            <path d="M1.5 4L3 5.5L6.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-[10px] text-foreground/40">Doubt solved</span>
      </div>
    </div>
  );
}

function AiSparkle({ size = "40px" }: { size?: string }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full text-primary/25"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3L13.8 10.2L21 12L13.8 13.8L12 21L10.2 13.8L3 12L10.2 10.2L12 3Z" />
      </svg>
    </div>
  );
}

function ScanFrame() {
  return (
    <div className="relative">
      <div
        className="rounded-md border border-foreground/[0.06] bg-foreground/[0.01] backdrop-blur-sm"
        style={{ width: "160px", height: "120px" }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-primary/40">
              <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1" />
              <path d="M7 1v2M7 11v2M1 7h2M11 7h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function LightRibbon({
  color,
  top,
  left,
  width,
  height,
  rotate,
  duration,
  delay,
}: {
  color: string;
  top: string;
  left: string;
  width: string;
  height: string;
  rotate: number;
  duration: number;
  delay: number;
}) {
  return (
    <div
      className="absolute rounded-full blur-[80px]"
      style={{
        top,
        left,
        width,
        height,
        background: color,
        transform: `rotate(${rotate}deg)`,
        animation: `pb-ribbon-drift ${duration}s ease-in-out ${delay}s infinite both`,
        willChange: "transform",
      }}
    />
  );
}

export default function AnimatedBackground({
  animate = true,
  variant: externalVariant,
}: AnimatedBackgroundProps) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = Boolean(animate) && !reducedMotion;
  const pathname = usePathname();
  const resolvedVariant = externalVariant ?? resolveVariant(pathname);
  const config = VARIANTS[resolvedVariant];

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, { stiffness: 120, damping: 28, mass: 0.8 });
  const smoothY = useSpring(mouseY, { stiffness: 120, damping: 28, mass: 0.8 });

  const layer1X = useTransform(smoothX, [-1, 1], [-4, 4]);
  const layer1Y = useTransform(smoothY, [-1, 1], [-4, 4]);
  const layer2X = useTransform(smoothX, [-1, 1], [-10, 10]);
  const layer2Y = useTransform(smoothY, [-1, 1], [-10, 10]);
  const layer3X = useTransform(smoothX, [-1, 1], [-18, 18]);
  const layer3Y = useTransform(smoothY, [-1, 1], [-18, 18]);
  const layer4X = useTransform(smoothX, [-1, 1], [-28, 28]);
  const layer4Y = useTransform(smoothY, [-1, 1], [-28, 28]);

  useEffect(() => {
    if (!shouldAnimate) return;

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
  }, [shouldAnimate, mouseX, mouseY]);

  const activeAmbients = AMBIENT_LIGHTS.slice(0, config.ambientCount);
  const activeDecorations = STUDY_DECORATIONS.slice(0, config.decorations);
  const showScan = resolvedVariant === "photo-doubt";

  function layerStyle<T>(x: MotionValue<T>, y: MotionValue<T>) {
    return shouldAnimate ? { x, y, willChange: "transform" } : undefined;
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      data-pb="background"
      suppressHydrationWarning
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: resolvedVariant === "auth"
            ? "linear-gradient(135deg, #fafaf9 0%, #f5f3ff 50%, #eff6ff 100%)"
            : "linear-gradient(135deg, #fafaf9 0%, #f5f3ff 30%, #eff6ff 70%, #fdf2f8 100%)",
        }}
        data-pb="base-gradient"
      />
      <div
        className="dark:hidden absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(59, 130, 246, 0.03) 0%, transparent 60%)",
        }}
      />
      <div
        className="hidden dark:block absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(59, 130, 246, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(124, 58, 237, 0.04) 0%, transparent 50%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.25] dark:opacity-[0.3]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 0.5px, transparent 0.5px)",
          backgroundSize: "24px 24px",
          color: resolvedVariant === "auth" ? "#c7d2fe" : "#e0e7ff",
        }}
      />

      {activeAmbients.length > 0 && (
        <motion.div
          className="absolute inset-0"
          data-pb="parallax"
          style={layerStyle(layer1X, layer1Y)}
        >
          {activeAmbients.map((light, i) => {
            return (
              <div
                key={`ambient-${i}`}
                data-pb="ambient-light"
                className="absolute rounded-full"
                style={{
                  top: light.base.top,
                  left: light.base.left,
                  width: light.base.width,
                  height: light.base.height,
                  background: `radial-gradient(circle, ${light.color} 0%, transparent 70%)`,
                  filter: "blur(60px)",
                  animation: shouldAnimate
                    ? `pb-ambient-drift-${i} ${light.duration}s ease-in-out ${light.delay}s infinite both`
                    : undefined,
                  willChange: "transform",
                }}
              >
                <style jsx>{`
                  @keyframes pb-ambient-drift-${i} {
                    0% { transform: translate3d(0px, 0px, 0px); opacity: 0.6; }
                    25% { transform: translate3d(${light.xRange * 0.4}px, ${-light.yRange * 0.3}px, 0px); opacity: 0.8; }
                    50% { transform: translate3d(${-light.xRange * 0.2}px, ${light.yRange * 0.4}px, 0px); opacity: 0.7; }
                    75% { transform: translate3d(${light.xRange * 0.3}px, ${light.yRange * 0.2}px, 0px); opacity: 0.9; }
                    100% { transform: translate3d(0px, 0px, 0px); opacity: 0.6; }
                  }
                `}</style>
              </div>
            );
          })}
        </motion.div>
      )}

      {activeDecorations.length > 0 && (
        <motion.div
          className="absolute inset-0"
          data-pb="parallax"
          style={layerStyle(layer2X, layer2Y)}
        >
          {activeDecorations.map((dec, i) => {
            const floatDuration = 22 + i * 5;
            const floatDelay = i * 3;
            return (
              <div
                key={`decoration-${i}`}
                data-pb="study-decoration"
                className="absolute"
                style={{
                  top: dec.top,
                  left: dec.left,
                  width: dec.size,
                  opacity: resolvedVariant === "auth" ? 0.03 : 0.05,
                  animation: shouldAnimate
                    ? `pb-decoration-float-${i} ${floatDuration}s ease-in-out ${floatDelay}s infinite both`
                    : undefined,
                  willChange: "transform",
                }}
              >
                <style jsx>{`
                  @keyframes pb-decoration-float-${i} {
                    0%, 100% { transform: translate3d(0px, 0px, 0px) rotate(0deg); }
                    25% { transform: translate3d(${6 + i * 2}px, ${-8 - i * 2}px, 0px) rotate(${0.5 + i * 0.2}deg); }
                    50% { transform: translate3d(${-4 - i}px, ${-14 - i * 2}px, 0px) rotate(${-0.3 - i * 0.1}deg); }
                    75% { transform: translate3d(${3 + i}px, ${-6 - i}px, 0px) rotate(${0.2 + i * 0.15}deg); }
                  }
                `}</style>
                {dec.type === "card" && <MiniStudyCard />}
                {dec.type === "progress" && <MiniProgressCard />}
                {dec.type === "checklist" && <MiniChecklistCard />}
                {dec.type === "sparkle" && <AiSparkle size={dec.size} />}
                {dec.type === "scan" && <ScanFrame />}
              </div>
            );
          })}
        </motion.div>
      )}

      {showScan && (
        <motion.div
          className="absolute inset-0"
          data-pb="parallax"
          style={layerStyle(layer3X, layer3Y)}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[200px] sm:w-[360px] sm:h-[240px] pointer-events-none overflow-hidden"
            style={{ borderRadius: "8px" }}
            data-pb="scan-line"
          >
            <div
              className="absolute inset-0 w-full h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
              style={{
                animation: shouldAnimate
                  ? "pb-scan 12s ease-in-out infinite both"
                  : undefined,
                opacity: shouldAnimate ? 0.3 : 0,
              }}
            />
          </div>
        </motion.div>
      )}

      <motion.div
        className="absolute inset-0"
        data-pb="parallax"
        style={layerStyle(layer4X, layer4Y)}
      >
        <LightRibbon
          color={resolvedVariant === "auth" ? "rgba(139, 92, 246, 0.06)" : "rgba(139, 92, 246, 0.07)"}
          top="20%"
          left="10%"
          width="800px"
          height="300px"
          rotate={15}
          duration={50}
          delay={0}
        />
        <LightRibbon
          color={resolvedVariant === "auth" ? "rgba(59, 130, 246, 0.05)" : "rgba(59, 130, 246, 0.06)"}
          top="60%"
          left="50%"
          width="700px"
          height="250px"
          rotate={-20}
          duration={55}
          delay={6}
        />
      </motion.div>
    </div>
  );
}
