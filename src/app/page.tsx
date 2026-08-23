"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  AcademicCapIcon,
  Squares2X2Icon,
  PlayIcon,
  SparklesIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ClockIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";
import LandingBackground from "@/components/LandingBackground";

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
      <div className="flex h-screen w-full items-center justify-center gap-3 bg-background dark:bg-dark">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-foreground/60">Loading…</span>
      </div>
    );
  }

  if (firebaseUser) {
    return null;
  }

  const features = [
    {
      icon: ChatBubbleLeftEllipsisIcon,
      title: "AI Tutor",
      desc: "Step-by-step explanations tailored to your class and board",
      color: "from-purple-500 to-indigo-600",
    },
    {
      icon: PhotoIcon,
      title: "Photo Doubt",
      desc: "Snap a photo of any problem and get instant solutions",
      color: "from-teal-500 to-cyan-600",
    },
    {
      icon: AcademicCapIcon,
      title: "Quick Quiz",
      desc: "Practice with board-aligned quizzes for every subject",
      color: "from-amber-500 to-orange-600",
    },
    {
      icon: Squares2X2Icon,
      title: "Flashcards",
      desc: "Smart spaced repetition to memorize concepts faster",
      color: "from-emerald-500 to-green-600",
    },
    {
      icon: DocumentTextIcon,
      title: "Notes",
      desc: "Organize your study notes with subjects and tags",
      color: "from-blue-500 to-indigo-600",
    },
    {
      icon: ClockIcon,
      title: "Study Timer",
      desc: "Pomodoro and custom timers to build focus habits",
      color: "from-pink-500 to-rose-600",
    },
  ];

  const howItWorks = [
    { step: "01", title: "Ask a Question", desc: "Type your doubt or snap a photo of the problem" },
    { step: "02", title: "Get Explanation", desc: "Receive step-by-step solutions matched to your syllabus" },
    { step: "03", title: "Practice & Master", desc: "Take quizzes, create flashcards, and track progress" },
  ];

  const curriculum = [
    { subject: "Maths", classes: "Class 5-12", color: "from-purple-500 to-indigo-600", topics: "Algebra, Geometry, Calculus, Statistics" },
    { subject: "Physics", classes: "Class 9-12", color: "from-blue-500 to-sky-600", topics: "Mechanics, Optics, Electromagnetism" },
    { subject: "Chemistry", classes: "Class 9-12", color: "from-teal-500 to-emerald-600", topics: "Organic, Inorganic, Physical Chemistry" },
    { subject: "Biology", classes: "Class 9-12", color: "from-emerald-500 to-green-600", topics: "Cell Biology, Genetics, Ecology" },
    { subject: "English", classes: "Class 5-12", color: "from-amber-500 to-orange-600", topics: "Grammar, Literature, Writing Skills" },
    { subject: "CS", classes: "Class 11-12", color: "from-indigo-500 to-purple-600", topics: "Programming, Data Structures, Networks" },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-background dark:bg-dark text-foreground">
      <LandingBackground enabled={animationsEnabled} />

      {/* Navbar */}
        <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto">
          <motion.div
            initial={animationsEnabled ? { opacity: 0, x: -20 } : false}
            animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-center gap-3"
          >
            <BrandLogo size={36} />
            <span className="text-xl font-bold text-foreground tracking-tight">Padhai Buddy</span>
          </motion.div>

          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-foreground/60">
            <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link>
            <Link href="#for-schools" className="hover:text-primary transition-colors">For Schools</Link>
            <Link href="#testimonials" className="hover:text-primary transition-colors">Testimonials</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-primary transition-colors">Login</Link>
            <Link href="/signup" className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
              Get Started
            </Link>
          </div>
        </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        {/* Badge */}
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: -10 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="inline-flex items-center gap-2 pill-badge mb-8"
        >
          <SparklesIcon className="w-4 h-4" />
          AI-Powered Learning
        </motion.div>

        {/* Hero */}
        <motion.div
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-24"
        >
          <div className="space-y-6">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-bold leading-[1.05] tracking-tight text-foreground">
              Your AI study buddy for every doubt, every subject, every board
            </h1>

            <p className="text-lg text-foreground/60 max-w-xl leading-relaxed">
              Get instant explanations, solve doubts, take quizzes, and track your progress - all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <motion.button
                whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
                onClick={() => router.push("/signup")}
                className="px-8 py-3.5 rounded-[14px] font-semibold text-lg flex items-center justify-center gap-2 text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow"
              >
                Get Started Free
                <ArrowRightIcon className="w-5 h-5" />
              </motion.button>
              <motion.button
                whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.98 } : undefined}
                className="px-8 py-3.5 rounded-[14px] font-semibold text-lg bg-white dark:bg-dark border border-primary/10 dark:border-primary/5 text-primary hover:text-primary/90 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                <PlayIcon className="w-5 h-5 text-primary dark:text-primary/80" />
                <span>Watch Demo</span>
              </motion.button>
            </div>

            <div className="grid grid-cols-3 divide-x divide-primary/5 dark:divide-primary/10 pt-4 max-w-md">
              {[
                { value: "2M+", label: "Students" },
                { value: "25M+", label: "Doubts Solved" },
                { value: "98%", label: "Satisfaction" },
              ].map((stat) => (
                <div key={stat.label} className="px-4 first:pl-0">
                  <p className="text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
                  <p className="text-xs text-foreground/50 font-medium mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side: AI Chat Preview */}
          <motion.div
            initial={animationsEnabled ? { opacity: 0, x: 20 } : false}
            animate={animationsEnabled ? { opacity: 1, x: 0 } : false}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.3 }}
            className="relative"
          >
            <div className="relative h-[480px] w-full rounded-2xl overflow-hidden glass-strong border border-primary/5">
              {/* Chat header */}
              <div className="h-14 bg-primary/5 flex items-center justify-between px-4 border-b border-primary/5">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a2 2 0 011.694 1.106l3.23 3.99a2 2 0 01.638 1.519l-1.22 5a2 2 0 01-1.87 1.35l-5-1.22a2 2 0 01-1.519-.638l3.99-3.23a2 2 0 011.106.165H19a2 2 0 012 2v3.5a2.5 2.5 0 01-2 2.5h-5l-6.5 6.5a2.5 2.5 0 01-2.5-2.5V5z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <span className="text-sm font-semibold text-primary/80">Padhai Buddy AI Tutor</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 ml-1"></span>
                  <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                </div>
                <span className="text-xs font-medium text-primary/60 bg-primary/10 px-2 py-1 rounded-lg">AI Tutor</span>
              </div>

              {/* Chat messages */}
              <div className="p-4 h-[calc(100%-3.5rem)] overflow-y-auto space-y-4">
                {/* User message */}
                <div className="flex gap-3 justify-end">
                  <div className="max-w-[80%]">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                      Explain Photosynthesis in short.
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                {/* AI message */}
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                    <SparklesIcon className="w-4 h-4 text-white" />
                  </div>
                  <div className="max-w-[80%]">
                    <div className="glass card-subtle text-foreground rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed">
                      Photosynthesis is the process used by plants to make their own food.
                      <br /><br />
                      <span className="font-mono text-xs bg-foreground/5 px-2 py-1 rounded block text-center my-2">6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂</span>
                      <br />
                      1. Plants absorb sunlight through chlorophyll
                      <br />
                      2. Carbon dioxide enters through stomata
                      <br />
                      3. Water is absorbed by roots
                      <br />
                      4. Glucose and oxygen are produced
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button className="p-1.5 rounded-md flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all">
                        <DocumentTextIcon className="w-3.5 h-3.5" />
                        <span className="font-medium">Copy</span>
                      </button>
                      <button className="p-1.5 rounded-md flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all">
                        <span className="font-medium">Good Answer</span>
                      </button>
                      <button className="p-1.5 rounded-md flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-all">
                        <span className="font-medium">Not Helpful</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs + Input */}
              <div className="absolute bottom-0 left-0 right-0 border-t border-primary/5 bg-white/50 dark:bg-dark/50 backdrop-blur-sm">
                {/* Tabs */}
                <div className="flex items-center gap-1 px-4 pt-2">
                  {["Photo Doubt", "Upload", "Voice"].map((tab) => (
                    <button key={tab} className="px-3 py-1.5 rounded-lg text-xs font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors">
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2 px-4 py-2">
                  <div className="flex-1 glass-strong rounded-2xl px-3 py-2">
                    <div className="text-xs text-foreground/40 py-2">Type your question here...</div>
                  </div>
                  <button className="p-2.5 rounded-xl text-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0">
                    <PhotoIcon className="w-5 h-5" />
                  </button>
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.08 } : undefined}
                    whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
                    className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 text-white hover:shadow-lg transition-shadow flex-shrink-0"
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Feature highlights on side */}
            <div className="absolute -bottom-6 left-6 right-4 grid grid-cols-2 gap-4">
              <div className="glass card-subtle rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-2">
                  <ChatBubbleLeftEllipsisIcon className="w-5 h-5" />
                </div>
                <p className="text-sm text-primary/80 font-medium">AI Tutor</p>
              </div>
              <div className="glass card-subtle rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 mx-auto mb-2">
                  <PhotoIcon className="w-5 h-5" />
                </div>
                <p className="text-sm text-teal-400 font-medium">Photo Doubt</p>
              </div>
              <div className="glass card-subtle rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 mx-auto mb-2">
                  <AcademicCapIcon className="w-5 h-5" />
                </div>
                <p className="text-sm text-amber-400 font-medium">Quick Quiz</p>
              </div>
              <div className="glass card-subtle rounded-xl p-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto mb-2">
                  <Squares2X2Icon className="w-5 h-5" />
                </div>
                <p className="text-sm text-emerald-400 font-medium">Flashcards</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Features Section */}
        <motion.section
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Everything you need to study smarter</h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Built for Indian students with board-aligned content and AI that understands your curriculum</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="subtle-card card-hover rounded-2xl p-6"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center text-white mb-4 shadow-md`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-foreground/60 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How It Works Section */}
        <motion.section
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Start learning in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="relative text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-foreground/60 text-sm">{step.desc}</p>
                {index < 2 && (
                  <div className="hidden lg:block absolute top-8 right-[-16px] w-[32px] h-0.5 bg-gradient-to-r from-primary to-transparent" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Curriculum Section */}
        <motion.section
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Curriculum Coverage</h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto">Complete coverage for CBSE, ICSE, and State Boards</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {curriculum.map((subject, index) => (
              <motion.div
                key={subject.subject}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 * index }}
                className="subtle-card card-hover rounded-2xl p-6"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-white mb-4 shadow-md`}>
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{subject.subject}</h3>
                <p className="text-xs text-foreground/50 font-medium mb-3">{subject.classes}</p>
                <p className="text-foreground/60 text-sm">{subject.topics}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={animationsEnabled ? { opacity: 0, y: 20 } : false}
          animate={animationsEnabled ? { opacity: 1, y: 0 } : false}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center"
        >
          <div className="subtle-card rounded-2xl p-8 md:p-12 max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">Ready to start your learning journey?</h2>
            <p className="text-foreground/60 text-lg mb-8">Join 50,000+ students who are already learning smarter with Padhai Buddy</p>
            <motion.button
              whileHover={animationsEnabled ? { scale: 1.02 } : undefined}
              whileTap={animationsEnabled ? { scale: 0.97 } : undefined}
              onClick={() => router.push("/signup")}
              className="px-8 py-3.5 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 text-white bg-gradient-to-r from-primary to-primary-dark shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-shadow mx-auto"
            >
              Get Started Free
              <ArrowRightIcon className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-primary/5 dark:border-primary/10 bg-white dark:bg-dark/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <BrandLogo size={32} />
              <span className="text-lg font-bold text-foreground tracking-tight">Padhai Buddy</span>
            </div>
            <p className="text-sm text-foreground/50 leading-relaxed">
              Your AI study buddy for every doubt, every subject, every board.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Product</h3>
            <ul className="space-y-2 text-sm text-foreground/55">
              <li><Link href="#features" className="hover:text-primary transition-colors">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
              <li><Link href="#resources" className="hover:text-primary transition-colors">Resources</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Company</h3>
            <ul className="space-y-2 text-sm text-foreground/55">
              <li><Link href="/login" className="hover:text-primary transition-colors">About</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Contact</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Connect</h3>
            <ul className="space-y-2 text-sm text-foreground/55">
              <li><a href="#" className="hover:text-primary transition-colors">Twitter</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-primary/5 dark:border-primary/10 py-6 text-center text-sm text-foreground/45">
          © {new Date().getFullYear()} Padhai Buddy. Made with ❤️ for Indian students.
        </div>
      </footer>
    </div>
  );
}