"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
  HomeIcon,
} from "@heroicons/react/24/outline";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Chat", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon },
  { name: "Photo", href: "/dashboard/photo-doubt", icon: PhotoIcon },
  { name: "History", href: "/dashboard/history", icon: ClockIcon },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-40">
      <div className="flex justify-around py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.name} href={item.href}>
              <motion.div
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-foreground/50 hover:text-foreground hover:bg-foreground/5"
                }`}
                whileTap={{ scale: 0.9 }}
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
