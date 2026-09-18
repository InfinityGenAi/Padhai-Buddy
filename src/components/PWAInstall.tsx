"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDownTrayIcon, XMarkIcon, CheckCircleIcon, DevicePhoneMobileIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import { isApp, isIOS } from "@/lib/platform";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstall() {
  const { preferences } = useAuth();
  const [showInstall, setShowInstall] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installResult, setInstallResult] = useState<"idle" | "success" | "dismissed" | "error">("idle");
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Don't show if already in app
    if (isApp()) return;

    // Don't show on iOS (no programmatic install)
    if (isIOS()) {
      setShowInstall(true);
      setIsInstallable(false);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPrompt.current = promptEvent;
      setIsInstallable(true);
      setShowInstall(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setShowInstall(false);
      setInstallResult("success");
      localStorage.setItem("pwa-installed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check if already installed
    const installed = localStorage.getItem("pwa-installed");
    if (installed) {
      setShowInstall(false);
    }

    // Also check display-mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstall(false);
      localStorage.setItem("pwa-installed", "true");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;

    setIsInstalling(true);
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "accepted") {
        setInstallResult("success");
        localStorage.setItem("pwa-installed", "true");
      } else {
        setInstallResult("dismissed");
      }
      deferredPrompt.current = null;
      setIsInstallable(false);
    } catch {
      setInstallResult("error");
    } finally {
      setIsInstalling(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShowInstall(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  }, []);

  if (!showInstall) return null;

  const isIOSDevice = isIOS();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 rounded-2xl border border-border bg-card"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center flex-shrink-0">
            {isIOSDevice ? (
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
              {isIOSDevice
                ? "Add to Home Screen for quick access"
                : "Install as a native app for offline access & better performance"}
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>

      <div className="pt-4 border-t border-border">
        {isIOSDevice ? (
          <div className="space-y-3">
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-2 text-sm text-primary mb-2">
                <CheckCircleIcon className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">How to install on iOS</span>
              </div>
              <ol className="text-sm text-foreground/70 space-y-1 pl-4 list-decimal">
                <li>Tap the <strong>Share</strong> button (square with arrow up)</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                <li>Tap <strong>Add</strong> to confirm</li>
              </ol>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDismiss}
              className="w-full btn-primary py-2 rounded-xl text-sm font-medium flex-shrink-0"
            >
              Got it
            </motion.button>
          </div>
        ) : installResult === "success" ? (
          <div className="flex items-center gap-3 p-3 bg-green-950/30 border border-green-800/50 rounded-xl">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-400">Padhai Buddy installed successfully!</p>
          </div>
        ) : installResult === "dismissed" ? (
          <div className="flex items-center gap-3 p-3 bg-amber-950/30 border border-amber-800/50 rounded-xl">
            <XMarkIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-400">Installation cancelled. You can install later from browser menu.</p>
          </div>
        ) : installResult === "error" ? (
          <div className="flex items-center gap-3 p-3 bg-red-950/30 border border-red-800/50 rounded-xl">
            <XMarkIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">Installation failed. Please try from your browser's menu.</p>
          </div>
        ) : isInstallable ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <ArrowDownTrayIcon className="w-4 h-4 text-primary" />
              <span className="font-medium">Install Padhai Buddy</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-4 py-2 btn-primary rounded-xl text-sm font-medium flex-shrink-0"
            >
              {isInstalling ? "Installing..." : "Install"}
              <ArrowDownTrayIcon className="w-4 h-4 ml-1.5" />
            </motion.button>
          </div>
        ) : (
          <div className="p-3 bg-foreground/5 border border-border rounded-xl">
            <div className="flex items-center gap-2 text-sm text-foreground/70 mb-2">
              <XMarkIcon className="w-4 h-4 text-foreground/50 flex-shrink-0" />
              <span className="font-medium">Manual Installation</span>
            </div>
            <p className="text-sm text-foreground/60">
              Your browser doesn't support automatic installation. Open your browser menu and choose{" "}
              <strong>Install Padhai Buddy</strong> or <strong>Add to Home Screen</strong>.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}