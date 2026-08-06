"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChatBubbleLeftEllipsisIcon,
  PhotoIcon,
  ClockIcon,
  HomeIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: HomeIcon },
  { name: "Chat Doubt", href: "/dashboard/chat", icon: ChatBubbleLeftEllipsisIcon },
  { name: "Photo Doubt", href: "/dashboard/photo-doubt", icon: PhotoIcon },
  { name: "History", href: "/dashboard/history", icon: ClockIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:bg-card lg:border-r lg:border-border lg:shadow-sm lg:overflow-y-auto">
      <div className="flex flex-col h-full pt-6">
        <div className="px-6 pb-6 border-b border-border">
          <h2 className="text-xl font-bold text-primary">Padhai Buddy</h2>
        </div>

        <nav className="flex-1 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  className={`flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  }`}
                  whileHover={{ x: isActive ? 0 : 4 }}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-2.5 mx-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-all w-full"
          >
            <ArrowLeftOnRectangleIcon className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
