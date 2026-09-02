"use client";

import { motion } from "framer-motion";
import { ArrowDownTrayIcon, ComputerDesktopIcon, CheckCircleIcon, ArrowRightIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@/contexts/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";

export default function DownloadWindowsPage() {
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
              <ComputerDesktopIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Download Windows App
            </h1>
            <p className="text-foreground/60">
              Install the native Padhai Buddy app on your Windows PC
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
                    Native Windows App
                  </p>
                  <p className="text-xs text-foreground/60">
                    MSIX installer for Windows 10/11
                  </p>
                </div>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              Download Installer
            </motion.button>

            <p className="text-xs text-foreground/50 text-center">
              Run the installer and follow the setup wizard. The app will be available from Start menu.
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