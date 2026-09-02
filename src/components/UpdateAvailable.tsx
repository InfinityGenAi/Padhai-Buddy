"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { detectPlatform, isApp } from "@/lib/platform";

interface UpdateAvailableProps {
  onDismiss?: () => void;
}

export function UpdateAvailable({ onDismiss }: UpdateAvailableProps = {}) {
  const [showUpdate, setShowUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { preferences } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentVersion = searchParams.get("v") || "1.0.0";
  const reducedMotion = useReducedMotion();
  const animationsEnabled = preferences.animationsEnabled && !reducedMotion;

  useEffect(() => {
    // Check if update should be shown
    const shown = localStorage.getItem('update-prompt-dismissed');
    if (shown) return;

    // Show update after delay if user is on dashboard and not already on update page
    const timer = setTimeout(() => setShowUpdate(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowUpdate(false);
    localStorage.setItem('update-prompt-dismissed', 'true');
    onDismiss?.();
  };

  const handleUpdateClick = () => {
    setIsUpdating(true);
    const platform = detectPlatform();

    // Redirect to the appropriate download page based on platform
    if (platform === 'android') {
      router.push('/download/android');
    } else if (platform === 'windows') {
      router.push('/download/windows');
    } else {
      router.push('/');
    }
  };

  if (!showUpdate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 md:w-96 z-50"
    >
      <div className="bg-card border border-rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <BrandLogo size={32} />
            <div>
              <h3 className="font-semibold text-updateAvailable">Update Available</h3>
              <p className="text-sm text-foreground/60">There is a new version of Padhai Buddy available</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-foreground/50">Current Version</p>
              <p className="font-medium text-foreground">{currentVersion}</p>
            </div>
            <div>
              <p className="text-xs text-foreground/50">Latest Version</p>
              <p className="font-medium text-primary">1.1.0</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-xs text-foreground/50">What&apos; New</p>
            <p className="text-sm text-foreground/60">
              &bull; Improved AI tutor responses with better formatting<br />
              &bull; Redesigned More page with organized categories<br />
              &bull; Enhanced Photo Doubt with clearer preview<br />
              &bull; Fixed landing page background and typography
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleUpdateClick}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-all focus-ring"
            disabled={isUpdating}
          >
            {isUpdating ? "Updating..." : "Update Now"}
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </motion.div>
  );
}