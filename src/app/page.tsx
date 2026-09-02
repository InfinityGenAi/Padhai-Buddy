"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { BellIcon, BookOpenIcon, ChartBarIcon, DocumentTextIcon, HomeIcon, SparklesIcon, PhotoIcon, ArrowRightIcon, PlayIcon } from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: SparklesIcon,
    title: "AI Tutor",
    desc: "Step-by-step explanations tailored to your class and board",
  },
  {
    icon: PhotoIcon,
    title: "Photo Doubt",
    desc: "Snap a photo of any problem and get instant solutions",
  },
  {
    icon: BookOpenIcon,
    title: "Quick Quiz",
    desc: "Practice with board-aligned quizzes for every subject",
  },
  {
    icon: DocumentTextIcon,
    title: "Notes",
    desc: "Organize your study notes with subjects and tags",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Ask a Question",
    desc: "Type your doubt or snap a photo of the problem",
  },
  {
    step: "02",
    title: "Get Explanation",
    desc: "Receive step-by-step solutions matched to your syllabus",
  },
  {
    step: "03",
    title: "Practice & Master",
    desc: "Take quizzes, create flashcards, and track progress",
  },
];

const CURRICULUM = [
  { subject: "Maths", classes: "Class 5–12", topics: "Algebra, Geometry, Calculus, Statistics" },
  { subject: "Physics", classes: "Class 9–12", topics: "Mechanics, Optics, Electromagnetism" },
  { subject: "Chemistry", classes: "Class 9–12", topics: "Organic, Inorganic, Physical Chemistry" },
  { subject: "Biology", classes: "Class 5–12", topics: "Cell Biology, Genetics, Ecology" },
  { subject: "English", classes: "Class 5–12", topics: "Grammar, Literature, Writing Skills" },
  { subject: "CS", classes: "Class 11–12", topics: "Programming, Data Structures, Networks" },
];

export default function Home() {
  const { firebaseUser, loading, preferences } = useAuth();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    if (!loading && firebaseUser) {
      router.replace("/dashboard");
    }
  }, [firebaseUser, loading, router]);

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
      {/* Header / Hero CTA */}
      <header className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto border-b border-border/50">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: -10 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <BrandLogo size={36} />
          <span className="text-xl font-bold text-foreground tracking-tight">Padhai Buddy</span>
        </motion.div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="#features" className="text-foreground/60 hover:text-foreground transition-colors">Features</Link>
          <Link href="#how-it-works" className="text-foreground/60 hover:text-foreground transition-colors">How It Works</Link>
          <Link href="#curriculum" className="text-foreground/60 hover:text-foreground transition-colors">Curriculum</Link>
          <Link href="/login" className="text-foreground/60 hover:text-foreground transition-colors">Login</Link>
          <motion.div whileHover={animationsEnabled ? { scale: 1.03 } : undefined} whileTap={animationsEnabled ? { scale: 0.97 } : undefined}>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              Get Started
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        {/* Hero Section */}
        <section className="mb-16">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center min-h-[480px]">
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
                Your AI study buddy
                for every subject.
              </h1>

              <p className="text-lg text-foreground/60 max-w-xl leading-relaxed">
                Get instant step-by-step explanations, solve doubts with photos, take board-aligned quizzes, and track your progress — all in one place built for Indian students.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                  onClick={() => router.push("/signup")}
                  className="px-8 py-3.5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 text-white bg-gradient-to-r from-primary to-primary-dark shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                >
                  Get Started Free
                  <ArrowRightIcon className="w-5 h-5" />
                </motion.button>
                <motion.button
                  whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                  whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                  className="px-8 py-3.5 rounded-2xl font-bold text-lg bg-background border border-border text-foreground hover:bg-foreground/5 transition-all flex items-center justify-center gap-2"
                >
                  <PlayIcon className="w-5 h-5 text-primary" />
                  <span>Watch Demo</span>
                </motion.button>
              </div>
            </motion.div>

            {/* Left: Polished AI Tutor Preview */}
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 30 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
              className="relative"
            >
              <div className="relative h-[460px] w-full rounded-2xl overflow-hidden border border-border bg-card backdrop-blur-sm shadow-sm">
                {/* Chat header */}
                <div className="h-12 bg-gradient-to-r from-primary/5 to-indigo/5 flex items-center justify-between px-4 border-b border-border/20">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div>
                      <span className="text-sm font-bold text-foreground block leading-tight">Padhai Buddy AI</span>
                      <span className="text-[10px] text-foreground/50 font-medium">Online · Class 10 CBSE</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">AI Tutor</span>
                </div>

                {/* Chat messages - compact, clean */}
                <div className="p-4 h-[calc(100%-4.5rem)] overflow-y-auto space-y-3">
                  {/* AI message example */}
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="bg-card border border-border rounded-tl-lg rounded-tr-sm px-3 py-2.5 text-sm leading-relaxed border-border">
                        Photosynthesis is how plants make food using sunlight. <br />
                        <span className="text-[10px] bg-card/5 px-1.5 py-1 rounded block text-center my-1 border border-border">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</span><br />
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
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                      <SparklesIcon className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                {/* Input area */}
                <div className="p-4 border-t border-border bg-card/70 backdrop-blur-md">
                  <div className="flex items-end gap-2 px-4 py-2.5">
                    <div className="flex-1 bg-card/5 rounded-2xl px-4 py-1.5 border border-border/30">
                      <span className="text-xs text-foreground/40 py-1.5">Type your question here...</span>
                    </div>
                    <button className="p-2 rounded-xl text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <PhotoIcon className="w-3.5 h-3.5" />
                    </button>
                    <motion.button
                      whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                      whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
                      className="p-2 rounded-xl bg-gradient-to-br from-primary to-indigo text-white shadow-sm shadow-primary/15 hover:shadow-md transition-all"
                    >
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
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
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                  className="group relative p-5 rounded-2xl border border-border hover:shadow-md hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1 bg-card"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                    <Icon />
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
            {HOW_IT_WORKS.map((step, index) => (
              <motion.div
                key={step.step}
                initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                transition={{ duration: 0.5, delay: 0.15 * index }}
                className="relative text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center text-primary text-2xl font-extrabold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed max-w-xs mx-auto">{step.desc}</p>
              </motion.div>
            ))}
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
                transition={{ duration: 0.5, delay: 0.08 * index }}
                className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary border border-primary/10">
                    <BookOpenIcon className="w-4 h-4" />
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
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/80 backdrop-blur-xl">
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
    </div>
  );
}