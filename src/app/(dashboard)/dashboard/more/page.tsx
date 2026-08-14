"use client";

import { useAuth } from "@/contexts/AuthContext";
import { motion, useReducedMotion } from "framer-motion";
import {
  Squares2X2Icon,
  LightBulbIcon,
  QuestionMarkCircleIcon,
  InformationCircleIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

export default function MorePage() {
  const { preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

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
      href: "#",
      external: true,
    },
    {
      icon: InformationCircleIcon,
      title: "About Padhai Buddy",
      desc: "Version 1.0 — Built for Indian students.",
      href: "#",
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
          <motion.a
            key={option.title}
            href={option.href}
            target={option.external ? "_blank" : undefined}
            rel={option.external ? "noopener noreferrer" : undefined}
            className="subtle-card rounded-xl p-4 flex items-center gap-4 hover:bg-foreground/[0.02] transition-colors"
            whileHover={{ y: -1 }}
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <option.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold">{option.title}</h3>
              <p className="text-xs text-foreground/50 mt-0.5">{option.desc}</p>
            </div>
            {option.external && <ArrowTopRightOnSquareIcon className="w-4 h-4 text-foreground/30 flex-shrink-0" />}
          </motion.a>
        ))}
      </div>
    </motion.div>
  );
}
