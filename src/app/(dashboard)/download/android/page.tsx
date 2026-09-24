"use client";

import { motion, useEffect, useState } from "react";
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

export default function DownloadAndroidPage() {
  const [release, setRelease] = useState<GitHubRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        // Fetch latest release from GitHub API
        const response = await fetch(
          "https://api.github.com/repos/InfinityGenAi/Padhai-Buddy/releases/latest",
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
            next: { revalidate: 3600 }, // Cache for 1 hour
          }
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
    (asset) => asset.name.endsWith(".apk") && asset.content_type === "application/vnd.android.package-archive"
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
                      Progressive Web App (PWA)
                    </p>
                    <p className="text-xs text-foreground/60">
                      Works offline, no app store needed
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PWA Install Instructions - always available */}
            <div className="bg-foreground/5 border border-border rounded-xl p-4 text-left">
              <p className="text-sm font-medium text-foreground mb-2">How to install (PWA):</p>
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
              Open in Browser to Install PWA
            </motion.button>

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