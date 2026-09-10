"use client";

import { useState, useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { HomeIcon, ChartBarIcon, UserIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

/**
 * ADMIN ARCHITECTURE NOTE:
 *
 * This admin panel uses a SINGLE STABLE FIREBASE UID ("admin-stable-uid") for all admin sessions.
 *
 * CONSTRAINT: This architecture INTENTIONALLY SUPPORTS ONLY ONE ADMIN ACCOUNT.
 *
 * Implications:
 * - All admin logins share the same Firebase Auth identity (admin-stable-uid)
 * - Admin sessions cannot be individually tracked or revoked per admin user
 * - Audit trails will show all admin actions under the same UID
 * - If multiple people need admin access, they must share the ADMIN_SECRET
 * - Session revocation (logout) affects all admin sessions simultaneously
 *
 * If multiple distinct admin accounts are needed in the future, this must be redesigned to:
 * 1. Create individual Firebase Auth users for each admin
 * 2. Set custom claims (admin: true) on each admin user
 * 3. Use their actual Firebase UIDs for session tracking and audit logs
 * 4. Remove the ADMIN_UID constant and ADMIN_SECRET-based login
 *
 * SECURITY: ADMIN_SECRET must remain server-side only. Never expose to client.
 */

export default function AdminDashboard() {
  const { loading, isAdmin, authError, user } = useAuth();
  const [selectedSection, setSelectedSection] = useState<string>("overview");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (password: string) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = (await res.json()) as {
        success: boolean;
        error?: string;
        customToken?: string;
      };

      if (!data.success) {
        throw new Error(data.error || "Login failed");
      }

      const auth = getFirebaseAuth();
      if (!auth) throw new Error("Firebase auth not initialized");
      if (data.customToken) {
        const cred = await signInWithCustomToken(auth, data.customToken);
        await cred.user.getIdTokenResult(true);
      }
      setLoginError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setLoginError(errorMessage);
      console.error("Admin login error:", err);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle admin logout
  const handleLogout = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
    } catch (err) {
      console.error("Admin logout error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="p-8 bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Loading Admin Dashboard
          </h1>
        </div>
      </div>
    );
  }

  // Show login form if not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold text-foreground mb-8">
            Admin Login
          </h1>

          <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-xl max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-6">Admin Authentication</h2>

            <form onSubmit={(e) => {
              e.preventDefault();
              const elements = (e.target as HTMLFormElement).elements;
              const passwordInput = elements.namedItem("admin-password") as HTMLInputElement;
              handleLogin(passwordInput.value);
            }}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Admin Password
                </label>
                <input
                  type="password"
                  id="admin-password"
                  name="admin-password"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-border focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  placeholder="Enter admin password"
                />
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full px-4 py-3 rounded-xl text-white bg-primary font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loginLoading ? "Signing in..." : "Sign In as Admin"}
              </button>
            </form>

            {loginError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">
                {loginError}
              </div>
            )}
            {authError && !loginError && (
              <div className="mt-4 p-3 rounded-xl bg-red-500/10 text-red-400 text-sm">
                {authError}
              </div>
            )}
          </div>

          <div className="mt-8 text-center text-foreground/50">
            <p>Padhai Buddy Admin Panel</p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated as admin - show dashboard
  return (
    <div className="min-h-screen bg-background text-primary font-poppins">
      <nav className="border-b border-border bg-background/80 backdrop-blur-sticky sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-primary">Padhai Buddy Admin</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-foreground/60">
                {new Date().toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} {new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 transition-all">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Admin Dashboard</h1>

        <p className="text-foreground/60 mb-6">
          Professional analytics and user management terminal
        </p>

        {/* Section Navigation */}
        <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <button
              onClick={() => setSelectedSection("overview")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedSection === "overview"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              aria-pressed={selectedSection === "overview"}
            >
              <HomeIcon className="w-4 h-4 mr-2" /> Overview
            </button>
            <button
              onClick={() => setSelectedSection("analytics")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedSection === "analytics"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              aria-pressed={selectedSection === "analytics"}
            >
              <ChartBarIcon className="w-4 h-4 mr-2" /> Analytics
            </button>
            <button
              onClick={() => setSelectedSection("users")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedSection === "users"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              aria-pressed={selectedSection === "users"}
            >
              <UserIcon className="w-4 h-4 mr-2" /> Users
            </button>
            <button
              onClick={() => setSelectedSection("downloads")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedSection === "downloads"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              aria-pressed={selectedSection === "downloads"}
            >
              <DocumentTextIcon className="w-4 h-4 mr-2" /> Downloads
            </button>
            <button
              onClick={() => setSelectedSection("update")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                selectedSection === "update"
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              }`}
              aria-pressed={selectedSection === "update"}
            >
              Update
            </button>
          </div>
        </div>

        {/* Selected Section Content */}
        {selectedSection === "overview" && <OverviewSection />}
        {selectedSection === "analytics" && <AnalyticsSection />}
        {selectedSection === "users" && <UsersSection />}
        {selectedSection === "downloads" && <DownloadsSection />}
        {selectedSection === "update" && <UpdateSection />}
      </main>
    </div>
  );
}

/* --- Overview Section --- */
function OverviewSection() {
  const [stats, setStats] = useState({
    todayVisitors: 0,
    totalVisitors: 0,
    todaySignups: 0,
    totalSignups: 0,
    todayDownloads: 0,
    totalDownloads: 0,
    todayReturning: 0,
    totalReturning: 0,
    activeUsers: 0,
    totalRegistered: 0,
  });
  const [percentageChanges, setPercentageChanges] = useState({
    visitors: 0, signups: 0, downloads: 0, returning: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      const db = getFirestoreDb();
      if (!db) {
        setLoading(false);
        return;
      }

      const dailyRef = doc(db, "dailyAnalytics", "current");
      const snap = await getDoc(dailyRef);

      if (snap.exists()) {
        const data = snap.data();
        setStats({
          todayVisitors: data.todayVisitors ?? 0,
          totalVisitors: data.totalVisitors ?? 0,
          todaySignups: data.todaySignups ?? 0,
          totalSignups: data.totalSignups ?? 0,
          todayDownloads: data.todayDownloads ?? 0,
          totalDownloads: data.totalDownloads ?? 0,
          todayReturning: data.todayReturning ?? 0,
          totalReturning: data.totalReturning ?? 0,
          activeUsers: data.activeUsers ?? 0,
          totalRegistered: data.totalRegistered ?? 0,
        });

        const calculatePct = (current: number, previous: number) => {
          if (previous === 0 && current === 0) return 0;
          if (previous === 0) return 100;
          return ((current - previous) / previous) * 100;
        };

        setPercentageChanges({
          visitors: calculatePct((data.todayVisitors ?? 0), (data.prevVisitors ?? 0)),
          signups: calculatePct((data.todaySignups ?? 0), (data.prevSignups ?? 0)),
          downloads: calculatePct((data.todayDownloads ?? 0), (data.prevDownloads ?? 0)),
          returning: calculatePct((data.todayReturning ?? 0), (data.prevReturning ?? 0)),
        });
      } else {
        setStats({
          todayVisitors: 0, totalVisitors: 0, todaySignups: 0, totalSignups: 0,
          todayDownloads: 0, totalDownloads: 0, todayReturning: 0, totalReturning: 0,
          activeUsers: 0, totalRegistered: 0,
        });
        setPercentageChanges({ visitors: 0, signups: 0, downloads: 0, returning: 0 });
      }
      setLoading(false);
    };

    fetchAnalyticsData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
<h1 className="text-4xl font-bold text-foreground mb-8">
Today&apos;s Analytics
</h1>
          <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
            <p className="text-foreground/60">
              Loading analytics data from Firestore...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Visitors</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.visitors >= 0 ? "green" : "red" }}>
          {stats.todayVisitors.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.visitors))}% {percentageChanges.visitors >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Visitors</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalVisitors.toLocaleString()}</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Signups</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.signups >= 0 ? "green" : "red" }}>
          {stats.todaySignups.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.signups))}% {percentageChanges.signups >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Signups</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalSignups.toLocaleString()}</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Downloads</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.downloads >= 0 ? "green" : "red" }}>
          {stats.todayDownloads.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.downloads))}% {percentageChanges.downloads >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Returning</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.returning >= 0 ? "green" : "red" }}>
          {stats.todayReturning.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.returning))}% {percentageChanges.returning >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Active Users</p>
        <p className="text-5xl font-bold text-foreground">{stats.activeUsers.toLocaleString()}</p>
      </div>

      <div className="bg-card border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Registered</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalRegistered.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* --- Analytics Section --- */
function AnalyticsSection() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        Admin Analytics
      </h1>
      <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
        <p className="text-foreground/60">
          Analytics section - real Firestore data connection. Range controls coming soon.
        </p>
      </div>
    </div>
  );
}

/* --- Users Section --- */
function UsersSection() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        User Management
      </h1>
      <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
        <p className="text-foreground/60">
          User management section.
        </p>
      </div>
    </div>
  );
}

/* --- Downloads Section --- */
function DownloadsSection() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        App Download Analytics
      </h1>
      <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
        <p className="text-foreground/60">
          Download analytics section.
        </p>
      </div>
    </div>
  );
}

/* --- Update Section --- */
function UpdateSection() {
  return (
    <div className="min-h-screen bg-background">
      <h1 className="text-4xl font-bold text-foreground mb-8">
        App Update Management
      </h1>
      <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
        <p className="text-foreground/60">
          Update management - preserves existing UpdateAvailable.tsx system.
        </p>
      </div>
    </div>
  );
}
