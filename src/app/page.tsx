"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { BellIcon, BookOpenIcon, ChartBarIcon, DocumentTextIcon, HomeIcon, SparklesIcon, PhotoIcon, ArrowRightIcon, PlayIcon, AcademicCapIcon, ClockIcon, LightBulbIcon, RectangleStackIcon, TrophyIcon, CheckBadgeIcon, ChatBubbleLeftRightIcon, CameraIcon, ClipboardDocumentCheckIcon, PencilSquareIcon, CalendarIcon, ChartBarSquareIcon, BoltIcon, FireIcon } from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";
import { DemoVideoModal } from "@/components/ui/DemoVideoModal";

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
  { icon: AcademicCapIcon, title: "Board-Aligned", desc: "CBSE, ICSE & State Boards" },
  { icon: BoltIcon, title: "Instant Answers", desc: "No waiting, no friction" },
  { icon: FireIcon, title: "Stay Consistent", desc: "Build your study streak" },
  { icon: CheckBadgeIcon, title: "Verified Quality", desc: "Reviewed by educators" },
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
  { value: "Class 5-12", label: "All Boards" },
  { value: "6+", label: "AI Tutor Modes" },
  { value: "100%", label: "Free to Start" },
  { value: "24/7", label: "Always Available" },
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
                Your AI Study Buddy,
                Whenever You Need It.
              </h1>

              <p className="text-lg text-foreground/60 max-w-xl leading-relaxed">
                Understand difficult concepts, clear doubts, practice smarter, and stay on track with one AI-powered study companion built for Indian students.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  onClick={() => navigateToAuth("/signup")}
                  className="px-8 py-3.5 rounded-full font-bold text-lg flex items-center justify-center gap-2 text-white bg-primary shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                >
                  Start Learning Free
                  <ArrowRightIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                  onClick={() => setDemoOpen(true)}
                  className="px-8 py-3.5 rounded-full font-bold text-lg bg-white border border-border text-foreground hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <PlayIcon className="w-5 h-5 text-primary" />
                  <span>See Padhai Buddy in Action</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Right: Real Product UI Demo */}
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

        {/* Features Section */}
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                  transition={{ duration: 0.5, delay: 0.08 * index }}
                  whileHover={animationsEnabled ? { y: -3 } : undefined}
                  className="group relative p-6 rounded-2xl border border-border bg-white hover:shadow-lg hover:border-primary/30 transition-all duration-300"
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

        {/* How It Works Section */}
        <section id="how-it-works" className="mb-16">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-3 tracking-tight">
              How It Works
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
              Start learning in three simple steps
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                  animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                  transition={{ duration: 0.5, delay: 0.15 * index }}
                  className="relative text-center"
                >
                  <div className="relative inline-flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-indigo/10 flex items-center justify-center text-primary">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-sm">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-foreground/60 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
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
                Join thousands of Indian students learning every day with Padhai Buddy.
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
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-foreground/55">
                <li><span className="hover:text-foreground transition-colors cursor-default">About</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Contact</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Privacy</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-foreground/55">
                <li><span className="hover:text-foreground transition-colors cursor-default">Terms</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Privacy</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Cookies</span></li>
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