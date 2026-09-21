"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import { DemoVideoModal } from "@/components/ui/DemoVideoModal";

import { BellIcon, BookOpenIcon, ChartBarIcon, DocumentTextIcon, HomeIcon, SparklesIcon, PhotoIcon, ArrowRightIcon, PlayIcon, AcademicCapIcon, ClockIcon, LightBulbIcon, ExclamationTriangleIcon, RectangleStackIcon, ArrowPathIcon, TrophyIcon, ChatBubbleLeftRightIcon, CameraIcon, ClipboardDocumentCheckIcon, PencilSquareIcon, CalendarIcon, ChartBarSquareIcon, BoltIcon, FireIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  accent: string;
};

const FEATURES: Feature[] = [
  {
    icon: SparklesIcon,
    title: "AI Tutor",
    desc: "Step-by-step explanations tailored to your class and board",
    accent: "from-primary to-indigo",
  },
  {
    icon: CameraIcon,
    title: "Photo Doubt",
    desc: "Snap a photo of any problem and get instant solutions",
    accent: "from-teal to-emerald",
  },
  {
    icon: ClipboardDocumentCheckIcon,
    title: "Quick Quiz",
    desc: "Practice with board-aligned quizzes for every subject",
    accent: "from-amber-500 to-orange",
  },
  {
    icon: PencilSquareIcon,
    title: "Notes",
    desc: "Organize your study notes with subjects and tags",
    accent: "from-rose-500 to-pink-500",
  },
  {
    icon: RectangleStackIcon,
    title: "Flashcards",
    desc: "Master any topic with smart, spaced-repetition flashcards",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    icon: CalendarIcon,
    title: "Study Planner",
    desc: "Plan your day and build a focused study schedule",
    accent: "from-violet-500 to-purple-500",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Ask a Question",
    desc: "Type your doubt or snap a photo of the problem",
    icon: ChatBubbleLeftRightIcon,
  },
  {
    step: "02",
    title: "Get Explanation",
    desc: "Receive step-by-step solutions matched to your syllabus",
    icon: LightBulbIcon,
  },
  {
    step: "03",
    title: "Practice & Master",
    desc: "Take quizzes, create flashcards, and track progress",
    icon: TrophyIcon,
  },
];

const BENEFITS = [
  { icon: AcademicCapIcon, title: "CBSE, ICSE & State Boards", desc: "Curriculum-aligned content" },
  { icon: BoltIcon, title: "Instant Answers", desc: "No waiting, no friction" },
  { icon: FireIcon, title: "Stay Consistent", desc: "Build your study streak" },
  { icon: SparklesIcon, title: "AI-Powered", desc: "Smart explanations & practice" },
];

const CURRICULUM = [
  { subject: "Maths", classes: "Class 5–12", topics: "Algebra, Geometry, Calculus, Statistics", icon: "📐" },
  { subject: "Physics", classes: "Class 9–12", topics: "Mechanics, Optics, Electromagnetism", icon: "⚛️" },
  { subject: "Chemistry", classes: "Class 9–12", topics: "Organic, Inorganic, Physical Chemistry", icon: "🧪" },
  { subject: "Biology", classes: "Class 5–12", topics: "Cell Biology, Genetics, Ecology", icon: "🧬" },
  { subject: "English", classes: "Class 5–12", topics: "Grammar, Literature, Writing Skills", icon: "📖" },
  { subject: "CS", classes: "Class 11–12", topics: "Programming, Data Structures, Networks", icon: "💻" },
];

const STATS = [
  { value: "6", label: "Study Modes" },
  { value: "7", label: "AI Tools" },
  { value: "5-12", label: "Classes" },
  { value: "3", label: "Boards" },
];

export default function Home() {
  const { firebaseUser, loading, preferences } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

  const navigateToAuth = (path: string) => {
    try {
      sessionStorage.setItem("pb-internal-nav", "1");
    } catch {
      // ignore
    }
    router.push(path);
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs text-foreground/60">Loading…</span>
      </div>
    );
  }

  if (firebaseUser) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Header / Nav Bar */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto border-b border-border/50 bg-white/80 backdrop-blur-sm">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: -10 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <BrandLogo size={36} />
          <span className="text-xl font-bold text-foreground tracking-tight">Padhai Buddy</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="text-foreground/60 hover:text-foreground transition-colors">Features</Link>
          <Link href="#how-it-works" className="text-foreground/60 hover:text-foreground transition-colors">How It Works</Link>
          <Link href="#curriculum" className="text-foreground/60 hover:text-foreground transition-colors">Curriculum</Link>
          <button
            type="button"
            onClick={() => navigateToAuth("/login")}
            className="text-foreground/60 hover:text-foreground transition-colors focus-ring"
          >
            Login
          </button>
          <motion.div whileHover={animationsEnabled ? { scale: 1.03 } : undefined} whileTap={animationsEnabled ? { scale: 0.97 } : undefined}>
            <button
              type="button"
              onClick={() => navigateToAuth("/signup")}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium text-sm hover:bg-primary/20 hover:text-primary transition-all focus-ring"
            >
              Get Started
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </motion.div>
        </nav>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-24">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center min-h-[520px]">
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary/60 text-xs font-semibold">
                <SparklesIcon className="w-3.5 h-3.5" />
                AI-Powered Learning
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight text-foreground">
                Study Smarter with Padhai Buddy
              </h1>

              <p className="text-lg text-foreground/60 max-w-xl leading-relaxed">
                Your AI study buddy helps you understand concepts, clear doubts, practice with quizzes, and track your progress — tailored to your class and board.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  onClick={() => router.push("/signup")}
                  className="px-8 py-3.5 rounded-full font-bold text-lg flex items-center justify-center gap-2 text-white bg-primary shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                  aria-label="Start Learning"
                >
                  Start Learning
                  <ArrowRightIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                  onClick={() => router.push("/dashboard/chat")}
                  className="px-8 py-3.5 rounded-full font-bold text-lg bg-white border border-border text-foreground hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 shadow-sm"
                  aria-label="Try AI Tutor"
                >
                  <AcademicCapIcon className="w-5 h-5 text-primary" />
                  <span>Try AI Tutor</span>
                </motion.button>
              </div>
            </motion.div>

            
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 30 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative"
            >
              <div className="relative h-[520px] w-full rounded-full overflow-hidden border border-border bg-card backdrop-blur-sm shadow-sm">
                {/* Chat header */}
                <div className="h-12 bg-gradient-to-r from-primary/5 to-indigo/5 flex items-center justify-between px-6 border-b border-border/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground block leading-tight">Padhai Buddy AI</span>
                      <span className="text-[10px] text-foreground/50 font-medium">Online · Class 10 CBSE</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">AI Tutor</span>
                </div>

                {/* Chat messages */}
                <div className="p-6 h-[calc(100%-10rem)] overflow-y-auto space-y-4">
                  {/* AI message example */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-white border border-border rounded-tl-lg rounded-tr-sm px-4 py-3 text-sm leading-relaxed border-border">
                        Photosynthesis is how plants make food using sunlight. <br />
                        <span className="text-[10px] bg-white/5 px-1.5 py-1 rounded block text-center my-1 border border-border">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</span><br />
                        1. Plants absorb sunlight through chlorophyll<br />
                        2. CO₂ enters through stomata<br />
                        3. Water absorbed by roots<br />
                        4. Glucose and oxygen produced
                      </div>
                    </div>
                  </div>

                  {/* User message example */}
                  <div className="flex gap-3 justify-end">
                    <div className="flex-1 min-w-0">
                      <div className="bg-primary/5 text-primary rounded-tr-lg rounded-bl-sm px-3 py-2.5 text-sm font-medium border border-primary/20">
                        Explain Photosynthesis in short.
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Input area */}
                <div className="p-6 border-t border-border bg-white/70 backdrop-blur-md">
                  <div className="flex items-end gap-2 px-6 py-3">
                    <div className="flex-1 bg-white/5 rounded-full px-4 py-1.5 border border-border/30">
                      <span className="text-xs text-foreground/40 py-1.5">Type your question here...</span>
                    </div>
                    <button className="p-2 rounded-full text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <PhotoIcon className="w-3.5 h-3.5" />
                    </button>
                    <motion.button
                      whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                      whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
                      className="p-2 rounded-full bg-gradient-to-br from-primary to-indigo text-white shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                    >
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Benefits Bar */}
        <section className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="bg-white border border-border rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-foreground text-sm mb-0.5">{b.title}</h3>
                  <p className="text-xs text-foreground/60">{b.desc}</p>
                </div>
              );
            })}
          </motion.div>
        </section>

        {/* Photo Doubt Section */}
        <section id="photo-doubt" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              Snap a Question, Get Instant Solutions
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              Take a photo of any doubt and let Padhai Buddy's AI provide step-by-step explanations tailored to your class and board.
            </p>
          </motion.div>

          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 30 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            className="relative rounded-3xl overflow-hidden border border-border bg-card backdrop-blur-sm shadow-sm"
          >
            <div className="h-12 bg-gradient-to-r from-teal/5 to-emerald/5 flex items-center justify-between px-6 border-b border-border/20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-emerald flex items-center justify-center shadow-md">
                  <CameraIcon className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <div>
                  <span className="text-sm font-bold text-foreground block leading-tight">Padhai Buddy AI</span>
                  <span className="text-[10px] text-foreground/50 font-medium">Online · Class 10 CBSE</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-teal-500 bg-teal/10 px-2 py-0.5 rounded-lg">Photo Doubt</span>
            </div>

            <div className="p-8 h-[calc(100%-11rem)] overflow-y-auto space-y-6">
              {/* Example AI message */}
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-emerald flex items-center justify-center shadow-md">
                  <CameraIcon className="w-3.5 h-3.5 text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white border border-border rounded-tl-lg rounded-tr-sm px-4 py-3 text-sm leading-relaxed border-border">
                    Explain photosynthesis for Class 10.
                  </div>
                </div>
              </div>

              {/* Example user message */}
              <div className="flex gap-3 justify-end">
                <div className="flex-1 min-w-0">
                  <div className="bg-teal/5 text-teal rounded-tr-lg rounded-bl-sm px-3 py-2.5 text-sm font-medium border border-teal/20">
                    Explain photosynthesis in short.
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal to-emerald flex items-center justify-center shadow-md">
                  <CameraIcon className="w-3.5 h-3.5 text-teal-500" />
                </div>
              </div>
            </div>

            {/* Input area */}
            <div className="p-6 border-t border-border bg-white/70 backdrop-blur-md">
              <div className="flex items-end gap-2 px-6 py-3">
                <div className="flex-1 bg-white/5 rounded-full px-4 py-1.5 border border-border/30">
                  <span className="text-xs text-foreground/40 py-1.5">Type your question here...</span>
                </div>
                <button className="p-2 rounded-full text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                  <PhotoIcon className="w-3.5 h-3.5" />
                </button>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
                  className="p-2 rounded-full bg-gradient-to-br from-primary to-indigo text-white shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                >
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </motion.button>
              </div>
          </div>
        </motion.div>
      </section>

        <section id="features" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              Everything you need to study smarter
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              Built for Indian students with board-aligned content and AI that understands your curriculum
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                  transition={{ duration: 0.5, delay: 0.08 * index }}
                  whileHover={animationsEnabled ? { y: -3 } : undefined}
                  className="group relative p-6 rounded-2xl border border-border bg-white hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-default"
                >
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-4 shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-foreground/60 text-sm leading-relaxed">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* How the Study Loop Works */}
        <section id="study-loop" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              How the Study Loop Works
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              A continuous learning cycle that adapts to your progress
            </p>
          </motion.div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-primary/20 pointer-events-none" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
              {[
                { step: "01", title: "LEARN", desc: "Understand a concept with AI explanations tailored to your class and board", icon: LightBulbIcon },
                { step: "02", title: "PRACTICE", desc: "Test yourself with quizzes and flashcards on the topic you just learned", icon: ClipboardDocumentCheckIcon },
                { step: "03", title: "MISTAKES", desc: "Identify weak areas and concepts you need to revisit", icon: ExclamationTriangleIcon },
                { step: "04", title: "REVISION", desc: "Review flagged topics with spaced repetition and simplified explanations", icon: ArrowPathIcon },
                { step: "05", title: "PROGRESS", desc: "Track your improvement with real insights on your learning journey", icon: ChartBarSquareIcon },
                { step: "06", title: "NEXT ACTION", desc: "Get AI-suggested next topics based on your study history", icon: BoltIcon },
              ].map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <motion.div
                    key={stage.step}
                    initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                    animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                    className="text-center relative"
                  >
                    <div className="relative flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary relative z-10 shadow-md bg-white border-2 border-primary/20">
                        <Icon className="w-6 h-6" />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                      {stage.step}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{stage.title}</h3>
                    <p className="text-foreground/60 text-sm leading-relaxed max-w-xs mx-auto">{stage.desc}</p>
                    {index < 5 && (
                      <motion.div
                        initial={animationsEnabled ? { opacity: 0, scale: 0.5 } : false}
                        animate={animationsEnabled ? { opacity: 1, scale: 1 } : false}
                        transition={{ duration: 0.4, delay: 0.15 * index }}
                        className="hidden lg:block absolute top-[34px] right-[-50%] w-full h-0.5 bg-primary/20"
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Tutor Showcase */}
        <section id="ai-tutor" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              AI Tutor — Your Personal Study Companion
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              Choose how you want to learn — explain, teach, quiz, or get hints — all tailored to your class and board
            </p>
          </motion.div>

          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-white border border-border rounded-2xl p-4 sm:p-6 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {[
                { id: "explain", label: "Explain", icon: LightBulbIcon, desc: "Step-by-step concept breakdown" },
                { id: "teach", label: "Teach Me", icon: AcademicCapIcon, desc: "Interactive guided learning" },
                { id: "quiz", label: "Quiz Me", icon: ClipboardDocumentCheckIcon, desc: "Test your understanding" },
                { id: "hint", label: "Hint", icon: MagnifyingGlassIcon, desc: "Gentle nudges to help you think" },
                { id: "simplify", label: "Simplify", icon: SparklesIcon, desc: "Plain language & analogies" },
                { id: "deep", label: "Deep Dive", icon: BookOpenIcon, desc: "Comprehensive detailed explanation" },
                { id: "exam", label: "Exam Mode", icon: TrophyIcon, desc: "Exam-style questions & practice" },
              ].map((mode) => {
                const Icon = mode.icon;
                return (
                  <motion.button
                    key={mode.id}
                    whileHover={animationsEnabled ? { scale: 1.02, y: -1 } : undefined}
                    whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                    className="flex-shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-medium transition-all text-center bg-card-subtle text-foreground/70 hover:bg-primary/10 hover:text-primary border border-border/50 min-w-[80px]"
                    title={mode.desc}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{mode.label}</span>
                  </motion.button>
                );
              })}
            </div>
            <motion.button
              whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
              onClick={() => router.push("/dashboard/chat")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-base bg-primary text-white shadow-sm shadow-primary/15 hover:shadow-md transition-all mx-auto"
              aria-label="Try AI Tutor"
            >
              Try AI Tutor
              <ArrowRightIcon className="w-5 h-5" />
            </motion.button>
          </motion.div>
        </section>

        {/* Curriculum Section */}
        <section id="curriculum" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              Complete Curriculum Coverage
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              CBSE, ICSE, and State Boards — from Class 5 to 12
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CURRICULUM.map((subject, index) => (
              <motion.div
                key={subject.subject}
                initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.5, delay: 0.06 * index }}
                whileHover={animationsEnabled ? { y: -2 } : undefined}
                className="bg-white border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-xl bg-primary/5 flex items-center justify-center text-2xl border border-primary/10">
                    {subject.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{subject.subject}</h3>
                    <p className="text-xs text-foreground/50 font-medium">{subject.classes}</p>
                  </div>
                </div>
                <p className="text-sm text-foreground/60 leading-relaxed">{subject.topics}</p>
              </motion.div>
            ))}
          </div>
        </section>
        {/* Final CTA */}
        <section className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-indigo to-violet-600 p-10 sm:p-16 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.12),transparent_50%)]" />
            <div className="relative z-10 space-y-5">
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                Ready to study smarter?
              </h2>
<p className="text-lg text-white/85 max-w-xl mx-auto">
            Start studying smarter with AI-powered tools built for your curriculum.
          </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.04 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  onClick={() => navigateToAuth("/signup")}
                  className="px-8 py-3.5 rounded-full font-bold text-lg bg-white text-primary hover:bg-white/95 transition-all shadow-lg"
                >
                  Start Learning Free
                </motion.button>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.04 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-3.5 rounded-full font-bold text-lg bg-white/10 text-white border border-white/30 hover:bg-white/20 transition-all backdrop-blur-sm"
                >
                  See it in Action
                </motion.button>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-white/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-3">
                <BrandLogo size={30} />
                <span className="text-lg font-bold text-foreground tracking-tight">Padhai Buddy</span>
              </div>
              <p className="text-sm text-foreground/50 leading-relaxed">
                Your AI study buddy for every doubt, every subject, every board.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-foreground/55">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="#curriculum" className="hover:text-foreground transition-colors">Curriculum</Link></li>
                <li><Link href="#photo-doubt" className="hover:text-foreground transition-colors">Photo Doubt</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-foreground/55">
                <li><span className="hover:text-foreground transition-colors cursor-default">About</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Contact</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-foreground/55">
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-6 text-center text-sm text-foreground/45">
            © {new Date().getFullYear()} Padhai Buddy. Made with ❤️ for Indian students.
          </div>
        </div>
      </footer>

      <DemoVideoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}