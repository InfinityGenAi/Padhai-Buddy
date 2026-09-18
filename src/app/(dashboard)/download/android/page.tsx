"use client";

import { motion } from "framer-motion";
import { DevicePhoneMobileIcon, CheckCircleIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";

export default function DownloadAndroidPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-xl text-center">
          <div className="flex justify-center mb-6">
            <BrandLogo size={64} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <DevicePhoneMobileIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Install on Android
            </h1>
            <p className="text-foreground/60">
              Add Padhai Buddy to your home screen for app-like experience
            </p>
          </motion.div>

          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <CheckCircleIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">
                    Progressive Web App (PWA)
                  </p>
                  <p className="text-xs text-foreground/60">
                    Works offline, no app store needed
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-foreground/5 border border-border rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-foreground mb-2">How to install:</p>
              <ol className="space-y-2 text-xs text-foreground/60">
                <li className="flex items-center gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span>Open this page in Chrome on Android</li>
                <li className="flex items-center gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span>Tap the menu (⋮) → "Add to Home screen" or "Install app"</li>
                <li className="flex items-center gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">3</span>Confirm to add the icon to your home screen</li>
              </ol>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                // Trigger PWA install prompt if available
                if ('serviceWorker' in navigator) {
                  window.dispatchEvent(new CustomEvent('pwa-install-prompt'));
                }
              }}
              className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <GlobeAltIcon className="w-5 h-5" />
              Open in Browser to Install
            </motion.button>

            <p className="text-xs text-foreground/50 text-center">
              Padhai Buddy is a Progressive Web App. Install it directly from your browser — no APK download needed.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 pt-6 border-t border-border"
          >
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
            >
              <motion.span
                whileHover={{ x: -4 }}
                className="inline-block"
              >
                ←
              </motion.span>
              Back to Dashboard
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}