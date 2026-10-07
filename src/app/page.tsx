"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import { DemoVideoModal } from "@/components/ui/DemoVideoModal";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section, Container } from "@/components/ui/Section";
import { AnimatedContainer, StaggeredReveal } from "@/components/ui/AnimatedContainer";

import {
  ArrowRightIcon,
  AcademicCapIcon,
  SparklesIcon,
  CameraIcon,
  ClipboardDocumentCheckIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  CalendarIcon,
  BoltIcon,
  LightBulbIcon,
  BookOpenIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  ChartBarSquareIcon,
  CheckIcon,
  ShieldCheckIcon,
  UsersIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";

const studyModes = [
  { id: "explain", label: "Explain", icon: LightBulbIcon, desc: "Step-by-step concept breakdown" },
  { id: "teach", label: "Teach Me", icon: AcademicCapIcon, desc: "Interactive guided learning" },
  { id: "quiz", label: "Quiz Me", icon: ClipboardDocumentCheckIcon, desc: "Test your understanding" },
  { id: "hint", label: "Hint", icon: MagnifyingGlassIcon, desc: "Gentle nudges to help you think" },
  { id: "simplify", label: "Simplify", icon: SparklesIcon, desc: "Plain language & analogies" },
  { id: "deep", label: "Deep Dive", icon: BookOpenIcon, desc: "Comprehensive detailed explanation" },
  { id: "exam", label: "Exam Mode", icon: TrophyIcon, desc: "Exam-style questions & practice" },
];

const features = [
  {
    icon: SparklesIcon,
    title: "AI Tutor",
    desc: "Step-by-step explanations tailored to your class and board",
    href: "/dashboard/chat",
  },
  {
    icon: CameraIcon,
    title: "Photo Doubt",
    desc: "Snap a photo of any problem and get instant solutions",
    href: "/dashboard/photo-doubt",
  },
  {
    icon: ClipboardDocumentCheckIcon,
    title: "Quick Quiz",
    desc: "Practice with board-aligned quizzes for every subject",
    href: "/dashboard/quiz",
  },
  {
    icon: PencilSquareIcon,
    title: "Notes",
    desc: "Organize your study notes with subjects and tags",
    href: "/dashboard/notes",
  },
  {
    icon: RectangleStackIcon,
    title: "Flashcards",
    desc: "Master any topic with smart, spaced-repetition flashcards",
    href: "/dashboard/flashcards",
  },
  {
    icon: CalendarIcon,
    title: "Study Planner",
    desc: "Plan your day and build a focused study schedule",
    href: "/dashboard/planner",
  },
];

const studyLoop = [
  { step: "01", title: "Learn", desc: "Understand concepts with AI explanations tailored to your class and board", icon: LightBulbIcon },
  { step: "02", title: "Practice", desc: "Test yourself with quizzes and flashcards on the topic you just learned", icon: ClipboardDocumentCheckIcon },
  { step: "03", title: "Identify Gaps", desc: "Pinpoint weak areas and concepts you need to revisit", icon: ExclamationTriangleIcon },
  { step: "04", title: "Revise", desc: "Review flagged topics with spaced repetition and simplified explanations", icon: ArrowPathIcon },
  { step: "05", title: "Track Progress", desc: "Monitor your improvement with real insights on your learning journey", icon: ChartBarSquareIcon },
  { step: "06", title: "Next Action", desc: "Get AI-suggested next topics based on your study history", icon: BoltIcon },
];

const trustSignals = [
  { icon: ShieldCheckIcon, title: "Board-Aligned", desc: "CBSE, ICSE & State Board curriculum" },
  { icon: ClockIcon, title: "24/7 Availability", desc: "Study anytime, anywhere" },
  { icon: DevicePhoneMobileIcon, title: "Works Everywhere", desc: "Web, mobile, and PWA" },
  { icon: GlobeAltIcon, title: "Multi-Language", desc: "English, Hindi, and more" },
];

const demoChatMessages = [
  {
    role: "ai",
    content: (
      <>
        <p className="font-medium text-foreground mb-2">Photosynthesis — Class 10 Science</p>
        <p className="text-foreground/80 mb-3">Photosynthesis is how plants make food using sunlight, carbon dioxide, and water.</p>
        <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/10 text-sm font-mono text-primary">
          6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂
        </div>
        <ul className="space-y-1.5 text-foreground/70 text-sm">
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span>Plants absorb sunlight through chlorophyll</li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span>CO₂ enters through stomata</li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span>Water absorbed by roots</li>
          <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-primary"></span>Glucose and oxygen produced</li>
        </ul>
      </>
    ),
  },
  {
    role: "user",
    content: "Explain Photosynthesis for Class 10",
  },
];

export default function Home() {
  const { firebaseUser, loading, preferences } = useAuth();
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
      <header className="relative z-20 sticky top-0 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: -10 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex items-center gap-3"
        >
          <BrandLogo size={36} />
          <span className="text-xl font-bold text-foreground tracking-tight">Padhai Buddy</span>
        </motion.div>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link href="#features" className="text-foreground/60 hover:text-foreground transition-colors">Features</Link>
          <Link href="#how-it-works" className="text-foreground/60 hover:text-foreground transition-colors">How It Works</Link>
          <Link href="#trust" className="text-foreground/60 hover:text-foreground transition-colors">Why Choose Us</Link>
          <button
            type="button"
            onClick={() => navigateToAuth("/login")}
            className="text-foreground/60 hover:text-foreground transition-colors focus-ring"
          >
            Login
          </button>
          <Button
            variant="pill-primary"
            size="sm"
            onClick={() => navigateToAuth("/signup")}
            rightIcon={<ArrowRightIcon className="w-4 h-4" />}
          >
            Get Started
          </Button>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <Section className="pt-16 sm:pt-24 pb-20 lg:pb-28" animate={animationsEnabled}>
          <Container size="xl">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Hero Content */}
              <AnimatedContainer variant="slide-up" delay={0.1} animate={animationsEnabled}>
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                    <SparklesIcon className="w-4 h-4" />
                    AI-Powered Learning for Indian Students
                  </div>

                  <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground">
                    Study Smarter with{' '}
                    <span className="text-gradient-primary">Padhai Buddy</span>
                  </h1>

                  <p className="text-lg sm:text-xl text-foreground/60 max-w-xl leading-relaxed">
                    Your AI study buddy helps you understand concepts, clear doubts, practice with quizzes, and track your progress — tailored to your class and board.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <Button
                      size="lg"
                      variant="pill-primary"
                      onClick={() => navigateToAuth("/signup")}
                      rightIcon={<ArrowRightIcon className="w-5 h-5" />}
                      className="shadow-primary-sm hover:shadow-primary-md"
                    >
                      Start Learning Free
                    </Button>
                    <Button
                      size="lg"
                      variant="pill-secondary"
                      onClick={() => router.push("/dashboard/chat")}
                      leftIcon={<AcademicCapIcon className="w-5 h-5 text-primary" />}
                      className="bg-white border-border text-foreground hover:bg-background-tertiary"
                    >
                      Try AI Tutor
                    </Button>
                  </div>

                  {/* Trust indicators */}
                  <div className="flex flex-wrap items-center gap-6 text-sm text-foreground/50 pt-6 border-t border-border/50">
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4 text-success" />
                      CBSE, ICSE & State Boards
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4 text-success" />
                      Classes 5–12
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4 text-success" />
                      Free to start
                    </span>
                  </div>
                </div>
              </AnimatedContainer>

              {/* AI Chat Preview */}
              <AnimatedContainer variant="slide-up" delay={0.2} animate={animationsEnabled}>
                <div className="relative rounded-3xl overflow-hidden border border-border bg-card backdrop-blur-sm shadow-xl">
                  {/* Chat header */}
                  <div className="h-14 bg-gradient-to-r from-primary/5 to-indigo/5 flex items-center justify-between px-6 border-b border-border/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md">
                        <SparklesIcon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-foreground block leading-tight">Padhai Buddy AI</span>
                        <span className="text-[10px] text-foreground/50 font-medium">Online · Class 10 CBSE</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-lg">AI Tutor</span>
                  </div>

                  {/* Chat messages */}
                  <div className="p-6 h-[480px] overflow-y-auto space-y-6">
                    {demoChatMessages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={animationsEnabled ? { opacity: 0, y: 10 } : false}
                        animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                        transition={{ duration: 0.4, delay: 0.3 + idx * 0.15 }}
                        className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                      >
                        {msg.role === "ai" && (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md flex-shrink-0">
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 max-w-[320px]">
                          <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "ai" ? "bg-white border border-border rounded-tr-md" : "bg-primary text-white rounded-tl-md"}`}>
                            {msg.content}
                          </div>
                        </div>
                        {msg.role === "user" && (
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-indigo flex items-center justify-center shadow-md flex-shrink-0">
                            <SparklesIcon className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </motion.div>
                    ))}

                    {/* Study mode chips */}
                    <motion.div
                      initial={animationsEnabled ? { opacity: 0, y: 10 } : false}
                      animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                      transition={{ duration: 0.4, delay: 0.6 }}
                      className="flex flex-wrap gap-2 pt-2"
                    >
                      {studyModes.slice(0, 4).map((mode) => (
                        <button
                          key={mode.id}
                          className="px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20 hover:bg-primary/20 transition-colors"
                          title={mode.desc}
                        >
                          <mode.icon className="w-3.5 h-3.5 inline mr-1.5" />
                          {mode.label}
                        </button>
                      ))}
                      <span className="px-3 py-1.5 text-xs font-medium bg-foreground/5 text-foreground/50 rounded-full border border-border/50">+3 more modes</span>
                    </motion.div>
                  </div>

                  {/* Input area */}
                  <div className="p-5 border-t border-border bg-white/70 backdrop-blur-md">
                    <div className="flex items-end gap-2 px-4 py-2">
                      <div className="flex-1 bg-white/5 rounded-full px-4 py-2 border border-border/30">
                        <span className="text-xs text-foreground/40">Type your question here...</span>
                      </div>
                      <button className="p-2.5 rounded-full text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors" aria-label="Add photo">
                        <CameraIcon className="w-4 h-4" />
                      </button>
                      <Button variant="pill-primary" size="sm" className="shadow-primary-sm">
                        <ArrowRightIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AnimatedContainer>
            </div>
          </Container>
        </Section>

        {/* AI Tutor Showcase */}
        <Section id="ai-tutor" className="py-16 lg:py-24" animate={animationsEnabled}>
          <Container size="xl">
            <AnimatedContainer variant="slide-up" delay={0.1} animate={animationsEnabled} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
                AI Tutor — Your Personal Study Companion
              </h2>
              <p className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                Choose how you want to learn — explain, teach, quiz, or get hints — all tailored to your class and board.
              </p>
            </AnimatedContainer>

            <Card variant="subtle" hover={false} padding="lg" className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row gap-3 mb-8 overflow-x-auto pb-4">
                {studyModes.map((mode) => {
                  const Icon = mode.icon;
                  return (
                    <motion.button
                      key={mode.id}
                      whileHover={animationsEnabled ? { scale: 1.02, y: -2 } : undefined}
                      whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                      className="flex-shrink-0 flex flex-col items-center gap-2 px-5 py-4 rounded-xl text-sm font-medium transition-all text-center bg-card-subtle text-foreground/70 hover:bg-primary/10 hover:text-primary border border-border/50 min-w-[96px]"
                      title={mode.desc}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{mode.label}</span>
                    </motion.button>
                  );
                })}
              </div>
              <div className="text-center">
                <Button
                  size="lg"
                  variant="pill-primary"
                  onClick={() => router.push("/dashboard/chat")}
                  rightIcon={<ArrowRightIcon className="w-5 h-5" />}
                  className="shadow-primary-sm hover:shadow-primary-md"
                >
                  Try AI Tutor Now
                </Button>
              </div>
            </Card>
          </Container>
        </Section>

        {/* Features Section */}
        <Section id="features" className="py-16 lg:py-24" animate={animationsEnabled}>
          <Container size="xl">
            <AnimatedContainer variant="slide-up" delay={0.1} animate={animationsEnabled} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
                Everything You Need to Study Smarter
              </h2>
              <p className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                Built for Indian students with board-aligned content and AI that understands your curriculum.
              </p>
            </AnimatedContainer>

            <StaggeredReveal staggerDelay={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  variant="subtle"
                  hover
                  padding="lg"
                  className="group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-sm group-hover:bg-primary/20 group-hover:text-primary transition-all duration-300">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-foreground/60 text-sm leading-relaxed mb-4">{feature.desc}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateToAuth(feature.href)}
                    rightIcon={<ArrowRightIcon className="w-4 h-4" />}
                    className="text-primary hover:text-primary-dark hover:bg-primary/5"
                  >
                    Explore
                  </Button>
                </Card>
              ))}
            </StaggeredReveal>
          </Container>
        </Section>

        {/* How It Works Section */}
        <Section id="how-it-works" className="py-16 lg:py-24 bg-background-secondary" animate={animationsEnabled}>
          <Container size="xl">
            <AnimatedContainer variant="slide-up" delay={0.1} animate={animationsEnabled} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
                How the Study Loop Works
              </h2>
              <p className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                A continuous learning cycle that adapts to your progress and helps you improve every day.
              </p>
            </AnimatedContainer>

            <div className="relative">
              {/* Connecting line for desktop */}
              <div className="hidden lg:block absolute top-20 left-1/2 -translate-x-1/2 w-0.5 h-[calc(100%-8rem)] bg-primary/20 pointer-events-none" />

              <StaggeredReveal staggerDelay={0.1} className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-6">
                {studyLoop.map((stage, index) => {
                  const Icon = stage.icon;
                  return (
                    <motion.div
                      key={stage.step}
                      initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
                      animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
                      transition={{ duration: 0.5, delay: 0.1 * index }}
                      className="relative text-center"
                    >
                      <div className="relative flex justify-center mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary relative z-10 shadow-sm bg-white border border-primary/20">
                          <Icon className="w-7 h-7" />
                        </div>
                      </div>
                      <div className="absolute -top-2 -right-2 lg:-right-1/2 w-7 h-7 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                        {stage.step}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{stage.title}</h3>
                      <p className="text-foreground/60 text-sm leading-relaxed max-w-xs mx-auto">{stage.desc}</p>
                    </motion.div>
                  );
                })}
              </StaggeredReveal>
            </div>
          </Container>
        </Section>

        {/* Trust/Value Section */}
        <Section id="trust" className="py-16 lg:py-24" animate={animationsEnabled}>
          <Container size="xl">
            <AnimatedContainer variant="slide-up" delay={0.1} animate={animationsEnabled} className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 tracking-tight">
                Why Students Choose Padhai Buddy
              </h2>
              <p className="text-lg sm:text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                Built with care for Indian students — reliable, accessible, and always improving.
              </p>
            </AnimatedContainer>

            <StaggeredReveal staggerDelay={0.08} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {trustSignals.map((signal) => (
                <Card key={signal.title} variant="subtle" hover padding="lg" className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-primary">
                    <signal.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{signal.title}</h3>
                  <p className="text-foreground/60 text-sm leading-relaxed">{signal.desc}</p>
                </Card>
              ))}
            </StaggeredReveal>
          </Container>
        </Section>

        {/* Final CTA */}
        <Section className="py-16 lg:py-24" animate={animationsEnabled}>
          <Container size="xl">
            <motion.div
              initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
              animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-indigo to-violet-600 p-10 sm:p-16 lg:p-20 text-center"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.12),transparent_50%)]" />
              <div className="relative z-10 space-y-6 max-w-2xl mx-auto">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
                  Ready to Study Smarter?
                </h2>
                <p className="text-lg sm:text-xl text-white/85 leading-relaxed">
                  Start studying smarter with AI-powered tools built for your curriculum.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
                  <Button
                    size="lg"
                    variant="pill-secondary"
                    onClick={() => navigateToAuth("/signup")}
                    className="bg-white text-primary hover:bg-white/95 shadow-lg hover:shadow-xl"
                    rightIcon={<ArrowRightIcon className="w-5 h-5" />}
                  >
                    Start Learning Free
                  </Button>
                  <Button
                    size="lg"
                    variant="pill-ghost"
                    onClick={() => setDemoOpen(true)}
                    className="bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm"
                  >
                    See It in Action
                  </Button>
                </div>
                <p className="text-sm text-white/60 pt-4">
                  No credit card required • Cancel anytime • Free tier available
                </p>
              </div>
            </motion.div>
          </Container>
        </Section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-white/80 backdrop-blur-xl">
        <Container size="xl" className="py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <BrandLogo size={32} />
                <span className="text-lg font-bold text-foreground tracking-tight">Padhai Buddy</span>
              </div>
              <p className="text-sm text-foreground/50 leading-relaxed max-w-xs">
                Your AI study buddy for every doubt, every subject, every board.
              </p>
              <div className="flex items-center gap-4 mt-6 text-sm text-foreground/50">
                <span>Made with ❤️ for Indian students</span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Product</h3>
              <ul className="space-y-3 text-sm text-foreground/55">
                <li><Link href="#features" className="hover:text-foreground transition-colors">Features</Link></li>
                <li><Link href="#ai-tutor" className="hover:text-foreground transition-colors">AI Tutor</Link></li>
                <li><Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link></li>
                <li><Link href="#trust" className="hover:text-foreground transition-colors">Why Choose Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Company</h3>
              <ul className="space-y-3 text-sm text-foreground/55">
                <li><span className="hover:text-foreground transition-colors cursor-default">About Us</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Contact</span></li>
                <li><span className="hover:text-foreground transition-colors cursor-default">Careers</span></li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider">Legal</h3>
              <ul className="space-y-3 text-sm text-foreground/55">
                <li><Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 mt-10 pt-8 text-center text-sm text-foreground/45">
            © {new Date().getFullYear()} Padhai Buddy. All rights reserved.
          </div>
        </Container>
      </footer>

      <DemoVideoModal isOpen={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}