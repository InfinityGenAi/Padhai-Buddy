"use client";

import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { DevicePhoneMobileIcon, CheckCircleIcon, GlobeAltIcon, ArrowDownTrayIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import BrandLogo from "@/components/BrandLogo";
import Link from "next/link";

interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: Array<{
    name: string;
    browser_download_url: string;
    size: number;
    content_type: string;
  }>;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function DownloadAndroidPage() {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallMessage("Padhai Buddy was installed successfully.");
    };
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      setInstallMessage("Automatic install is not available in this browser yet. In Chrome, open the ⋮ menu and choose Install app or Add to Home screen.");
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      setInstallMessage(choice.outcome === "accepted" ? "Installation started. Follow the browser's prompts to finish." : "Installation was cancelled. You can install later from the browser menu.");
    } catch {
      setInstallMessage("Automatic install failed. Open the Chrome ⋮ menu and choose Install app or Add to Home screen.");
    } finally {
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        // Fetch latest release from GitHub API
        const response = await fetch(
          "/api/releases/latest",
          { cache: "no-store" }
        );

        if (!response.ok) {
          if (response.status === 404) {
            // No releases yet
            setRelease(null);
            setLoading(false);
            return;
          }
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data: GitHubRelease = await response.json();
        setRelease(data);
      } catch (err) {
        console.error("Failed to fetch latest release:", err);
        setError("Unable to check for APK availability");
      } finally {
        setLoading(false);
      }
    }

    fetchLatestRelease();
  }, []);

  // Find APK asset in release
  const apkAsset = release?.assets.find(
    (asset) => asset.name.toLowerCase().endsWith(".apk")
  );

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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
            {/* APK Download Section - only shows when APK is available */}
            {loading ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 animate-pulse">
                    <ArrowDownTrayIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">Checking for APK...</p>
                    <p className="text-xs text-foreground/60">Fetching latest release info</p>
                  </div>
                </div>
              </motion.div>
            ) : apkAsset ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-950/20 border border-green-800/50 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="w-5 h-5 text-green-400" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-green-300">Android APK Available</p>
                    <p className="text-xs text-green-500 mt-0.5">
                      Version: {release?.tag_name} • {formatDate(release?.published_at || "")} • {formatBytes(apkAsset.size)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-800/30">
                  <a
                    href={apkAsset.browser_download_url}
                    className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
                    download
                  >
                    <ArrowDownTrayIcon className="w-5 h-5" />
                    Download APK ({formatBytes(apkAsset.size)})
                  </a>
                  <p className="text-xs text-green-500/80 mt-2 text-center">
                    Signed release build • <a href={release?.html_url} className="underline hover:text-green-300" target="_blank" rel="noopener noreferrer">View Release Notes</a>
                  </p>
                </div>
                <div className="mt-3 p-3 bg-black/20 rounded-lg text-left text-xs text-green-500/90">
                  <p className="font-medium mb-1">Installation Steps:</p>
                  <ol className="space-y-1 text-left">
                    <li>1. Tap "Download APK" above</li>
                    <li>2. Open the downloaded file</li>
                    <li>3. Allow "Install from unknown sources" if prompted</li>
                    <li>4. Tap "Install" to complete</li>
                  </ol>
                </div>
              </motion.div>
            ) : (
              // No APK available - show PWA option
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-primary/5 border border-primary/20 rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <CheckCircleIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">
                      No APK release published yet
                    </p>
                    <p className="text-xs text-foreground/60">
                      Install the phone app from your browser for now. A direct APK appears here after a signed release is published.
                    </p>
                    <a href="https://github.com/InfinityGenAi/Padhai-Buddy/releases" target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex text-xs font-semibold text-primary underline underline-offset-2">
                      Check official releases
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Clear platform-specific installation instructions */}
            <div className="bg-foreground/5 border border-border rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-foreground mb-2">Install Padhai Buddy</p>
              <p className="text-xs text-foreground/60 mb-3">
                The install prompt is controlled by your browser and appears only when PWA requirements are met.
              </p>
              <ol className="space-y-2 text-xs text-foreground/70">
                <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">1</span><span><strong>Android (Chrome):</strong> Open this page in Chrome, tap ⋮, then choose "Install app" or "Add to Home screen".</span></li>
                <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">2</span><span><strong>Computer (Chrome/Edge):</strong> Look for the install icon in the address bar, or open the browser menu and choose "Install Padhai Buddy".</span></li>
                <li className="flex items-start gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px]">3</span><span>If neither option appears, update the browser, stay online, reload this page, and check that the site is using HTTPS.</span></li>
              </ol>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInstall}
              className="w-full btn-primary py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <GlobeAltIcon className="w-5 h-5" />
              {installPrompt ? "Install Padhai Buddy" : "Show installation steps"}
            </motion.button>
            {installMessage && (
              <p role="status" className="text-xs text-foreground/70 bg-primary/5 border border-primary/20 rounded-lg p-3">
                {installMessage}
              </p>
            )}

            <p className="text-xs text-foreground/50 text-center">
              Padhai Buddy is a Progressive Web App. Install it directly from your browser.
              {apkAsset && " A native APK is also available above for offline installation."}
            </p>

            {/* Error message if any */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-amber-400 bg-amber-950/30 border border-amber-800/50 rounded-lg p-3"
              >
                {error}
              </motion.p>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 pt-6 border-t border-border"
          >
            <Link
              href="/download"
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