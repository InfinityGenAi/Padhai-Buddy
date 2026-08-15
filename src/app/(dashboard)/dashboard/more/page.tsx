"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Squares2X2Icon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function MorePage() {
  const { preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const options = [
    {
      icon: LightBulbIcon,
      title: "Study Insights",
      desc: "View detailed analytics about your study patterns and performance.",
      href: "/dashboard/progress",
    },
    {
      icon: QuestionMarkCircleIcon,
      title: "Help & Support",
      desc: "Get help with using Padhai Buddy and report issues.",
      onClick: () => setHelpOpen(true),
    },
    {
      icon: InformationCircleIcon,
      title: "About Padhai Buddy",
      desc: "Version 1.0 — Built for Indian students.",
      onClick: () => setAboutOpen(true),
    },
  ];

  return (
    <motion.div initial={animationsEnabled ? { opacity: 0, y: 10 } : undefined} animate={animationsEnabled ? { opacity: 1, y: 0 } : undefined} className="space-y-5 w-full">
      <div className="flex items-center gap-2">
        <Squares2X2Icon className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-semibold">More</h1>
      </div>

      <div className="grid gap-3">
        {options.map((option) => (
          option.href ? (
            <Link key={option.title} href={option.href}>
              <motion.div
                className="subtle-card rounded-xl p-4 flex items-center gap-4 hover:bg-foreground/[0.02] transition-colors cursor-pointer"
                whileHover={{ y: -1 }}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <option.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold">{option.title}</h3>
                  <p className="text-xs text-foreground/50 mt-0.5">{option.desc}</p>
                </div>
                <ArrowTopRightOnSquareIcon className="w-4 h-4 text-foreground/30 flex-shrink-0" />
              </motion.div>
            </Link>
          ) : (
            <motion.button
              key={option.title}
              onClick={option.onClick || (() => {})}
              className="subtle-card rounded-xl p-4 flex items-center gap-4 hover:bg-foreground/[0.02] transition-colors text-left w-full"
              whileHover={{ y: -1 }}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <option.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold">{option.title}</h3>
                <p className="text-xs text-foreground/50 mt-0.5">{option.desc}</p>
              </div>
            </motion.button>
          )
        ))}
      </div>

      <AnimatePresence>
        {helpOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setHelpOpen(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Help & Support</h3>
                <button onClick={() => setHelpOpen(false)} className="p-1 rounded-lg hover:bg-foreground/5"><XMarkIcon className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4 text-sm text-foreground/70">
                <div>
                  <h4 className="font-semibold mb-1">FAQ</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use the Study Timer to track your focus sessions.</li>
                    <li>Create flashcards to memorize key concepts.</li>
                    <li>Take quizzes to test your knowledge.</li>
                    <li>Chat with the AI tutor for doubts.</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Basic Usage</h4>
                  <p>Complete your profile first, then explore Dashboard, Timer, Flashcards, Quiz, Notes, and Chat.</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-1">Contact</h4>
                  <p>For support, email us at support@padhaibuddy.example.com.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {aboutOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setAboutOpen(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="glass-strong rounded-2xl p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">About Padhai Buddy</h3>
                <button onClick={() => setAboutOpen(false)} className="p-1 rounded-lg hover:bg-foreground/5"><XMarkIcon className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3 text-sm text-foreground/70">
                <p><span className="font-semibold">Version:</span> 1.0.0</p>
                <p><span className="font-semibold">Purpose:</span> An all-in-one study companion for Indian students.</p>
                <p><span className="font-semibold">Supported Boards:</span> CBSE, ICSE, State Board</p>
                <p><span className="font-semibold">Privacy:</span> Your data stays with you. We do not share personal information.</p>
                <p><span className="font-semibold">Safety:</span> AI responses are filtered for educational use only.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
