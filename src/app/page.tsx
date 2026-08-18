"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  AcademicCapIcon,
  SparklesIcon,
  CheckIcon,
  BookOpenIcon,
  LightBulbIcon,
  UserPlusIcon,
  QuestionMarkCircleIcon,
  BeakerIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";

const VANTA_FOG_MOUSE_LINE = "vec2 st = gl_FragCoord.xy / iResolution.xy*3.;";
const VANTA_FOG_MOUSE_PATCH = `${VANTA_FOG_MOUSE_LINE}\n  st += (iMouse - 0.5 * iResolution.xy) / iResolution.y * 0.8;`;

function installVantaFogMouseShaderPatch(): void {
  if (typeof WebGLRenderingContext === "undefined") return;
  const proto = WebGLRenderingContext.prototype as WebGLRenderingContext & {
    shaderSource?: ((shader: WebGLShader, source: string) => void) & { __padhaiPatched?: boolean };
  };
  const original = proto.shaderSource;
  if (!original || original.__padhaiPatched) return;
  proto.shaderSource = function (this: WebGLRenderingContext, shader: WebGLShader, source: string) {
    if (
      typeof source === "string" &&
      source.includes("uniform vec2 iMouse") &&
      source.includes(VANTA_FOG_MOUSE_LINE) &&
      !source.includes("iMouse - 0.5 * iResolution.xy")
    ) {
      source = source.replace(VANTA_FOG_MOUSE_LINE, VANTA_FOG_MOUSE_PATCH);
    }
    return original.call(this, shader, source);
  };
  proto.shaderSource.__padhaiPatched = true;
}

export default function Home() {
  const { firebaseUser, loading, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaInstanceRef = useRef<{ destroy: () => void } | null>(null);
  const isMountedRef = useRef(false);

  const webglAvailable = useMemo(() => {
    if (typeof window === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
      );
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (vantaInstanceRef.current && typeof vantaInstanceRef.current.destroy === "function") {
        vantaInstanceRef.current.destroy();
        vantaInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!vantaRef.current || !webglAvailable || !animationsEnabled) {
      if (vantaInstanceRef.current && typeof vantaInstanceRef.current.destroy === "function") {
        vantaInstanceRef.current.destroy();
        vantaInstanceRef.current = null;
      }
      return;
    }
    if (typeof window === "undefined") return;

    let cancelled = false;

    (async () => {
      try {
        const THREE = await import("three");
        await import("vanta/dist/vanta.fog.min.js");
        if (cancelled) return;
        const VANTA = (window as Window & { VANTA?: { FOG?: (opts: Record<string, unknown>) => { destroy: () => void } } }).VANTA;
        if (!VANTA?.FOG) return;

        installVantaFogMouseShaderPatch();

        if (vantaInstanceRef.current && typeof vantaInstanceRef.current.destroy === "function") {
          vantaInstanceRef.current.destroy();
          vantaInstanceRef.current = null;
        }

        const isDark = document.documentElement.classList.contains("dark");
        vantaInstanceRef.current = VANTA.FOG({
          el: vantaRef.current,
          THREE,
          highlightColor: isDark ? 0xc4b5fd : 0x8b5cf6,
          midtoneColor: isDark ? 0x818cf8 : 0xa5b4fc,
          lowlightColor: isDark ? 0x2dd4bf : 0x6ee7d0,
          baseColor: isDark ? 0x1e1b3a : 0xfffbeb,
          blurFactor: 0.42,
          speed: 0.4,
          mouseControls: true,
          mouseEase: false,
          touchControls: false,
          gyroControls: false,
          scale: 1,
          scaleMobile: 1,
          zoom: 0.6,
        });
      } catch (e) {
        console.warn("[VANTA] Failed to initialize", e);
      }
    })();

    return () => {
      cancelled = true;
      if (vantaInstanceRef.current && typeof vantaInstanceRef.current.destroy === "function") {
        vantaInstanceRef.current.destroy();
        vantaInstanceRef.current = null;
      }
    };
  }, [webglAvailable, animationsEnabled, preferences.theme, loading]);

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  if (firebaseUser) {
    return null;
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.15,
      },
    },
  };

  const staggerItem = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const features = [
    {
      icon: ChatBubbleLeftEllipsisIcon,
      title: "Ask Anything",
      desc: "Get instant answers to your doubts with step-by-step explanations.",
      color: "from-purple-500 to-indigo-500",
    },
    {
      icon: PhotoIcon,
      title: "Photo Doubts",
      desc: "Upload photos of your study material and get instant solutions.",
      color: "from-blue-500 to-cyan-500",
    },
    {
      icon: BookOpenIcon,
      title: "All Boards Covered",
      desc: "CBSE, ICSE, and State Board curriculum-aligned answers.",
      color: "from-emerald-500 to-teal-500",
    },
    {
      icon: LightBulbIcon,
      title: "Step-by-Step",
      desc: "Explanations designed to make concepts click, not just give answers.",
      color: "from-amber-500 to-orange-500",
    },
  ];

  const steps = [
    {
      number: 1,
      icon: UserPlusIcon,
      title: "Sign up for free",
      desc: "Create your account and set your class and board — CBSE, ICSE, or State Board — in under a minute.",
    },
    {
      number: 2,
      icon: QuestionMarkCircleIcon,
      title: "Ask your doubt",
      desc: "Type your question in Chat Doubt or snap a photo in Photo Doubt. Any subject, any chapter.",
    },
    {
      number: 3,
      icon: BeakerIcon,
      title: "Get step-by-step help",
      desc: "Receive clear, curriculum-aware explanations tailored to your class and board.",
    },
    {
      number: 4,
      icon: TrophyIcon,
      title: "Practice & track",
      desc: "Lock it in with quizzes, flashcards, study timers, and progress insights.",
    },
  ];

  const showVanta = animationsEnabled && webglAvailable;

  return (
    <div className="min-h-screen relative overflow-hidden">
      {showVanta && (
        <>
          <div ref={vantaRef} className="fixed inset-0 z-0 pointer-events-none" data-pb="background" />
          <div className="fixed inset-0 z-[1] bg-white/[0.03] dark:bg-black/[0.05] pointer-events-none" />
        </>
      )}

      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, x: -20 } : false}
          animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <BrandLogo size={32} />
          <h1 className="text-2xl font-bold text-primary">Padhai Buddy</h1>
        </motion.div>

        <motion.div
          className="flex items-center gap-3"
          initial={animationsEnabled ? { opacity: 0, x: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
        >
          <Link href="/login">
            <motion.button
              className="px-5 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors rounded-xl"
              whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            >
              Login
            </motion.button>
          </Link>
          <Link href="/signup">
            <motion.button
              className="px-6 py-2.5 btn-primary rounded-xl font-medium text-sm"
              whileHover={animationsEnabled ? { scale: 1.03 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
            >
              Get Started
            </motion.button>
          </Link>
        </motion.div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-24">
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="grid lg:grid-cols-2 gap-16 items-center"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
              <SparklesIcon className="w-4 h-4" />
              <span>AI-powered, curriculum-aware for Indian students</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              <span className="text-foreground">Your AI study buddy for </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-indigo-600">
                every doubt, every subject, every board
              </span>
            </h2>

            <p className="text-lg text-foreground/70 max-w-md leading-relaxed">
              Stuck on a math problem? Need help with a science concept? Padhai Buddy explains everything step by step, tailored to your class and board — CBSE, ICSE, or State Board.
            </p>

            <motion.div
              variants={animationsEnabled ? staggerItem : undefined}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <Link href="/signup">
                <motion.button
                  className="px-8 py-3.5 btn-primary rounded-xl font-semibold text-lg flex items-center justify-center gap-2"
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                >
                  <AcademicCapIcon className="w-5 h-5" />
                  Get Started
                </motion.button>
              </Link>
              <Link href="/login">
                <motion.button
                  className="px-8 py-3.5 border border-border rounded-xl font-semibold text-lg hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2"
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                >
                  Already have an account? Login
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="relative"
          >
            <motion.div
              animate={animationsEnabled ? { y: [0, -14, 0] } : undefined}
              transition={animationsEnabled ? { duration: 6, repeat: Infinity, ease: "easeInOut" } : undefined}
              className="glass card-subtle rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto"
            >
              <div className="p-4 border-b border-border/50 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 bg-red-400 rounded-full" />
                  <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                  <div className="w-3 h-3 bg-green-400 rounded-full" />
                </div>
                <span className="text-xs text-foreground/50 ml-auto">AI Tutor</span>
              </div>
              <div className="p-6 space-y-4">
                <motion.div
                  initial={animationsEnabled ? { opacity: 0, x: -10 } : false}
                  animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
                  transition={animationsEnabled ? { delay: 0.7, duration: 0.5 } : undefined}
                  className="bg-background rounded-xl p-3 text-sm"
                >
                  <p className="font-medium mb-1 text-foreground/70">You:</p>
                  <p className="text-foreground">
                    What is the Pythagorean theorem? Class 10 CBSE
                  </p>
                </motion.div>
                <motion.div
                  initial={animationsEnabled ? { opacity: 0, x: 10 } : false}
                  animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
                  transition={animationsEnabled ? { delay: 0.9, duration: 0.5 } : undefined}
                  className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-primary/20 rounded-xl p-4 text-sm"
                >
                  <p className="font-medium text-primary mb-2">Padhai Buddy:</p>
                  <p className="text-foreground/90 leading-relaxed">
                    The Pythagorean theorem states that in a right-angled triangle, the square of the hypotenuse (the longest side) equals the sum of squares of the other two sides.
                  </p>
                  <p className="text-foreground/90 mt-2 leading-relaxed">
                    Formula: a² + b² = c², where c is the hypotenuse.
                  </p>
                  <p className="text-foreground/70 mt-2 text-xs">
                    — Explained for Class 10 CBSE Mathematics
                  </p>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={animationsEnabled ? { delay: 1.1, duration: 0.5 } : undefined}
              className="absolute -bottom-6 -right-6 glass card-subtle border border-border rounded-xl p-4 shadow-lg"
            >
              <div className="flex gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <PhotoIcon className="w-5 h-5 text-blue-500" />
                </div>
              </div>
              <p className="text-xs text-foreground/50 mt-1">Text & Photo Doubts</p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="mt-20 sm:mt-28"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="text-center mb-10"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2">
              Everything you need to study smarter
            </h3>
            <p className="text-foreground/60 text-sm max-w-md mx-auto">
              One AI study buddy for all your subjects, classes, and boards.
            </p>
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerContainer : undefined}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={animationsEnabled ? staggerItem : undefined}
                className="glass card-subtle rounded-2xl p-6 text-center"
                whileHover={animationsEnabled ? { y: -6, scale: 1.02 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="flex justify-center mb-4">
                  <div
                    className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-md`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-foreground/60 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="mt-12 text-center"
          >
            <div className="flex items-center justify-center gap-6 text-sm text-foreground/50">
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                No signup fees
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                CBSE, ICSE, State Board
              </span>
              <span className="flex items-center gap-1">
                <CheckIcon className="w-4 h-4 text-green-500" />
                Instant answers
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          variants={animationsEnabled ? staggerContainer : undefined}
          initial={animationsEnabled ? "hidden" : false}
          animate={animationsEnabled ? "visible" : false}
          className="mt-20 sm:mt-28"
        >
          <motion.div
            variants={animationsEnabled ? staggerItem : undefined}
            className="text-center mb-10"
          >
            <h3 className="text-2xl font-bold text-foreground mb-2">
              How It Works
            </h3>
            <p className="text-foreground/60 text-sm max-w-md mx-auto">
              From your first doubt to exam day — Padhai Buddy has your back.
            </p>
          </motion.div>

          <motion.div
            variants={animationsEnabled ? staggerContainer : undefined}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {steps.map((step) => (
              <motion.div
                key={step.number}
                variants={animationsEnabled ? staggerItem : undefined}
                className="glass card-subtle rounded-2xl p-6 relative"
                whileHover={animationsEnabled ? { y: -6, scale: 1.02 } : undefined}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div className="absolute -top-4 left-6 w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shadow-md">
                  {step.number}
                </div>
                <div className="flex justify-center mb-4 mt-2">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h4 className="font-semibold text-foreground mb-2 text-center">
                  {step.title}
                </h4>
                <p className="text-sm text-foreground/60 leading-relaxed text-center">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </main>

      <footer className="relative z-10 text-center py-8 text-sm text-foreground/50 border-t border-border/30">
        <p>© {new Date().getFullYear()} Padhai Buddy. Made with ❤️ for Indian students.</p>
      </footer>
    </div>
  );
}
