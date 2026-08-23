"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  HomeIcon,
  ClockIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { motion, useReducedMotion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { name: "Home", href: "/dashboard", icon: HomeIcon },
  { name: "Chat", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon },
  { name: "Photo", href: "/dashboard/photo-doubt", icon: PhotoIcon },
  { name: "Timer", href: "/dashboard/timer", icon: ClockIcon },
  { name: "Profile", href: "/dashboard/profile", icon: UserIcon },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { preferences } = useAuth();
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 border-t border-border z-40 backdrop-blur-xl">
      <div className="flex py-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href} className="flex-1">
              <motion.div
className={`flex flex-col items-center justify-center h-14 rounded-xl text-[10px] font-medium transition-all ${
                    isActive
                      ? "text-primary bg-gradient-to-t from-primary/12 to-primary/5"
                      : "text-foreground/45 hover:text-foreground hover:bg-foreground/5"
                  }`}
                whileHover={animationsEnabled ? { scale: 1.05 } : undefined}
                whileTap={animationsEnabled ? { scale: 0.92 } : undefined}
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span>{item.name}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
