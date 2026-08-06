"use client";

import { useRef, useEffect, useState } from "react";
import Webcam from "react-webcam";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

const VIDEO_CONSTRAIN = {
  width: 360,
  height: 240,
  facingMode: "environment",
};

export default function HandGestureBackground({
  subtle = false,
}: { subtle?: boolean }) {
  const webcamRef = useRef<Webcam>(null);
  const [cameraAvailable, setCameraAvailable] = useState(false);

  const handX = useMotionValue(0.5);
  const handY = useMotionValue(0.5);
  const springX = useSpring(handX, { stiffness: 200, damping: 25, restDelta: 0.01 });
  const springY = useSpring(handY, { stiffness: 200, damping: 25, restDelta: 0.01 });

  const blob1X = useTransform(springX, [0, 1], [-120, 120]);
  const blob1Y = useTransform(springY, [0, 1], [-100, 100]);
  const blob2X = useTransform(springX, [0, 1], [-80, 140]);
  const blob2Y = useTransform(springY, [0, 1], [-140, 80]);
  const blob3X = useTransform(springX, [0, 1], [-60, 160]);
  const blob3Y = useTransform(springY, [0, 1], [-40, 120]);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number | undefined;
    let isMounted = true;
    let processing = false;
    let lastTimestamp = -1;
    const initializedRef = { current: false };

    const initHandLandmarker = async () => {
      if (initializedRef.current) return;
      initializedRef.current = true;

      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm"
        );

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        if (!isMounted) {
          handLandmarker.close();
          return;
        }

        setCameraAvailable(true);

        const detectHand = () => {
          if (!isMounted || !handLandmarker) return;

          if (document.hidden) {
            animationFrameId = requestAnimationFrame(detectHand);
            return;
          }

          if (!processing) {
            processing = true;
            const video = webcamRef.current?.video;
            if (video && video.readyState === 4) {
              const now = performance.now();
              if (now > lastTimestamp) {
                lastTimestamp = now;
                try {
                  const result = handLandmarker.detectForVideo(video, now);
                  if (result.landmarks && result.landmarks.length > 0) {
                    const landmarks = result.landmarks[0];
                    const wrist = landmarks[0];
                    handX.set(wrist.x);
                    handY.set(wrist.y);
                  }
                } catch {
                  // ignore detection errors
                }
              }
            }
            processing = false;
          }

          animationFrameId = requestAnimationFrame(detectHand);
        };

        detectHand();
      } catch {
        if (isMounted) setCameraAvailable(false);
      }
    };

    const timer = setTimeout(() => {
      if (isMounted) initHandLandmarker();
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opacity = subtle ? "opacity-25" : "opacity-40";
  const blur = subtle ? "blur-2xl" : "blur-3xl";

  const idleVariants = {
    idle: {
      x: [0, 30, -20, 0],
      y: [0, -20, 30, 0],
    },
  };

  const idleTransition = {
    duration: 25,
    repeat: Infinity,
    repeatType: "reverse" as const,
    ease: [0.4, 0, 0.2, 1] as const,
  };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100 dark:from-purple-950/30 dark:via-blue-950/30 dark:to-indigo-950/30" />

      <div className="absolute inset-0 overflow-hidden opacity-0">
        <Webcam
          ref={webcamRef}
          audio={false}
          muted
          playsInline
          width={360}
          height={240}
          videoConstraints={VIDEO_CONSTRAIN}
          onUserMediaError={() => setCameraAvailable(false)}
          style={{ display: "none" }}
        />
      </div>

      <div className="absolute -top-1/2 -left-1/2 w-96 h-96 rounded-full" />

      <motion.div
        className={`absolute top-1/4 left-1/4 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 ${blur} ${opacity} dark:from-purple-600/40 dark:to-indigo-700/50`}
        style={{
          width: 380,
          height: 380,
          x: cameraAvailable ? blob1X : undefined,
          y: cameraAvailable ? blob1Y : undefined,
        }}
        animate={cameraAvailable ? undefined : "idle"}
        variants={idleVariants}
        transition={cameraAvailable ? undefined : idleTransition}
      />

      <motion.div
        className={`absolute top-1/3 left-2/3 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 ${blur} ${opacity} dark:from-blue-600/40 dark:to-cyan-700/50`}
        style={{
          width: 340,
          height: 340,
          x: cameraAvailable ? blob2X : undefined,
          y: cameraAvailable ? blob2Y : undefined,
        }}
        animate={cameraAvailable ? undefined : "idle"}
        variants={idleVariants}
        transition={cameraAvailable ? undefined : idleTransition}
      />

      <motion.div
        className={`absolute bottom-1/4 left-1/3 rounded-full bg-gradient-to-br from-rose-400 to-orange-500 ${blur} ${opacity} dark:from-rose-600/40 dark:to-orange-700/50`}
        style={{
          width: 300,
          height: 300,
          x: cameraAvailable ? blob3X : undefined,
          y: cameraAvailable ? blob3Y : undefined,
        }}
        animate={cameraAvailable ? undefined : "idle"}
        variants={idleVariants}
        transition={cameraAvailable ? undefined : idleTransition}
      />

      {!cameraAvailable && subtle && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-100/10 via-blue-50/10 to-indigo-100/10 dark:from-purple-950/10 dark:via-blue-950/10 dark:to-indigo-950/10 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}
