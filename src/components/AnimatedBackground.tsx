"use client";

import { useReducedMotion, useMotionValue, useSpring, useTransform, motion } from "framer-motion";
import { useEffect } from "react";

const blobs = [
  {
    color: "from-purple-500 to-indigo-500",
    size: "min(500px, 70vmin)",
    position: { top: "5%", left: "10%" },
    animClass: "blob-drift-1",
    xRange: [-35, 35] as [number, number],
    yRange: [-25, 25] as [number, number],
    lightOpacity: "opacity-60",
    darkOpacity: "dark:opacity-65",
  },
  {
    color: "from-blue-500 to-cyan-500",
    size: "min(450px, 65vmin)",
    position: { top: "40%", left: "60%" },
    animClass: "blob-drift-2",
    xRange: [-25, 25] as [number, number],
    yRange: [-35, 35] as [number, number],
    lightOpacity: "opacity-55",
    darkOpacity: "dark:opacity-60",
  },
  {
    color: "from-pink-500 to-rose-500",
    size: "min(500px, 70vmin)",
    position: { bottom: "10%", left: "20%" },
    animClass: "blob-drift-3",
    xRange: [-45, 45] as [number, number],
    yRange: [-30, 30] as [number, number],
    lightOpacity: "opacity-60",
    darkOpacity: "dark:opacity-65",
  },
  {
    color: "from-violet-500 to-purple-600",
    size: "min(550px, 75vmin)",
    position: { top: "55%", left: "45%" },
    animClass: "blob-drift-4",
    xRange: [-30, 30] as [number, number],
    yRange: [-40, 40] as [number, number],
    lightOpacity: "opacity-60",
    darkOpacity: "dark:opacity-65",
  },
];

export default function AnimatedBackground({
  animate = true,
}: {
  animate?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = Boolean(animate) && !reducedMotion;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const smoothX = useSpring(mouseX, {
    stiffness: 50,
    damping: 35,
    mass: 1.0,
  });

  const smoothY = useSpring(mouseY, {
    stiffness: 50,
    damping: 35,
    mass: 1.0,
  });

  const x0 = useTransform(smoothX, [-1, 1], blobs[0].xRange);
  const y0 = useTransform(smoothY, [-1, 1], blobs[0].yRange);
  const x1 = useTransform(smoothX, [-1, 1], blobs[1].xRange);
  const y1 = useTransform(smoothY, [-1, 1], blobs[1].yRange);
  const x2 = useTransform(smoothX, [-1, 1], blobs[2].xRange);
  const y2 = useTransform(smoothY, [-1, 1], blobs[2].yRange);
  const x3 = useTransform(smoothX, [-1, 1], blobs[3].xRange);
  const y3 = useTransform(smoothY, [-1, 1], blobs[3].yRange);

  const transforms = [
    { x: x0, y: y0 },
    { x: x1, y: y1 },
    { x: x2, y: y2 },
    { x: x3, y: y3 },
  ];

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

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
      suppressHydrationWarning
    >
      <div
        className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-blue-50/80 to-indigo-100/80 dark:from-[#0f0a20] dark:via-[#0a0f1e] dark:to-[#120a2e]"
        aria-hidden="true"
      />

      {blobs.map((blob, i) => (
        <div
          key={`blob-${i}`}
          className={
            "absolute " +
            (shouldAnimate ? blob.animClass + " " : "") +
            blob.lightOpacity +
            " " +
            blob.darkOpacity
          }
          style={{
            ...blob.position,
            width: blob.size,
            height: blob.size,
            transform: "translate3d(0, 0, 0)",
            willChange: "transform",
          }}
          aria-hidden="true"
        >
          <motion.div
            className="w-full h-full"
            style={
              shouldAnimate
                ? {
                    x: transforms[i].x,
                    y: transforms[i].y,
                  }
                : undefined
            }
          >
            <div
              className={
                "absolute inset-0 rounded-full bg-gradient-to-br " +
                blob.color +
                " blur-[50px]"
              }
            />
          </motion.div>
        </div>
      ))}
    </div>
  );
}
