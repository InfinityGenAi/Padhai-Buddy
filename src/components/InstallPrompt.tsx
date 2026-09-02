"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownTrayIcon, XMarkIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { isAndroid, isWindows, isApp, shouldShowInstallPrompt } from "@/lib/platform";

interface InstallPromptProps {
  onDismiss?: () => void;
}

export default function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Don't show if already in app
    if (isApp()) return;

    // Check if user has dismissed before
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    if (dismissed) return;

    // Check if we should show
    if (!shouldShowInstallPrompt()) return;

    // Show after a short delay
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('install-prompt-dismissed', 'true');
    onDismiss?.();
  };

  const handleInstall = () => {
    const platform = typeof window !== 'undefined' ? 
      (navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'windows') : 'web';
    
    // Navigate to download page or trigger native install
    if (platform === 'android') {
      window.location.href = '/download/android';
    } else {
      window.location.href = '/download/windows';
    }
  };

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6 md:w-96 z-50"
    >
      <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center flex-shrink-0">
                {isAndroid() ? (
                  <DevicePhoneMobileIcon className="w-6 h-6 text-white" />
                ) : (
                  <ComputerDesktopIcon className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground truncate">
                  Install Padhai Buddy
                </h3>
                <p className="text-sm text-foreground/60 truncate">
                  {isAndroid() 
                    ? "Get the native Android app with offline support & notifications"
                    : "Get the native Windows app with desktop integration"}
                  </p>
              </div>
            </div>
            <button
              onClick={() => setShow(false)}
              className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors flex-shrink-0"
              aria-label="Dismiss"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-foreground/70">
                <ArrowDownTrayIcon className="w-4 h-4 text-primary" />
                <span className="font-medium">Install Padhai Buddy</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstall}
                className="px-4 py-2 btn-primary rounded-xl text-sm font-medium flex-shrink-0"
              >
                Install
                <ArrowDownTrayIcon className="w-4 h-4 ml-1.5" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}