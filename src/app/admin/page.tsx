"use client";

import { useState, useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, setDoc } from "firebase/firestore";
import { HomeIcon, ChartBarIcon, UserIcon, DocumentTextIcon, ArrowRightIcon, Cog6ToothIcon, ArrowPathIcon, EyeIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const [analytics, setAnalytics] = useState<{
    dailyActiveUsers: { date: string; activeUsers?: number; signups?: number }[];
    weeklySignups: { date: string; count: number }[];
    featureUsage: { feature: string; count: number }[];
    loading: boolean;
  }>({
    dailyActiveUsers: [],
    weeklySignups: [],
    featureUsage: [],
    loading: true,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) return;

        // Fetch daily active users from dailyAnalytics collection
        const analyticsRef = collection(db, "dailyAnalytics");
        const analyticsSnap = await getDocs(query(analyticsRef, orderBy("date", "desc"), limit(30)));
        const dailyData = analyticsSnap.docs.map(d => ({ date: d.id, ...d.data() })) as { date: string; activeUsers?: number; signups?: number }[];

        // Fetch feature usage
        const featureRef = collection(db, "featureUsage");
        const featureSnap = await getDocs(query(featureRef, orderBy("count", "desc"), limit(10)));
        const featureData = featureSnap.docs.map(d => ({ feature: d.id, ...d.data() })) as { feature: string; count: number }[];

        setAnalytics({
          dailyActiveUsers: dailyData,
          weeklySignups: [],
          featureUsage: featureData,
          loading: false,
        });
      } catch (error) {
        console.error("Analytics fetch error:", error);
        setAnalytics(prev => ({ ...prev, loading: false }));
      }
    };

    fetchAnalytics();
  }, []);

  if (analytics.loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Admin Analytics</h1>
        <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
          <p className="text-foreground/60">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-foreground mb-8">Admin Analytics</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Daily Active Users (Last 30 Days)</h2>
        {analytics.dailyActiveUsers.length > 0 ? (
          <div className="bg-card border rounded-xl p-6 shadow-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-medium text-foreground/60">Date</th>
                  <th className="text-right py-2 px-4 font-medium text-foreground/60">Active Users</th>
                  <th className="text-right py-2 px-4 font-medium text-foreground/60">Signups</th>
                </tr>
              </thead>
              <tbody>
                {analytics.dailyActiveUsers.map((day, i) => (
                  <tr key={day.date} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-foreground/5" : ""}`}>
                    <td className="py-2 px-4 font-mono">{day.date}</td>
                    <td className="py-2 px-4 text-right font-medium">{day.activeUsers ?? 0}</td>
                    <td className="py-2 px-4 text-right">{day.signups ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 shadow-xl text-center">
            <p className="text-foreground/60">No analytics data available yet.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Feature Usage</h2>
        {analytics.featureUsage.length > 0 ? (
          <div className="bg-card border rounded-xl p-6 shadow-xl">
            <div className="space-y-3">
              {analytics.featureUsage.map((feature) => (
                <div key={feature.feature} className="flex items-center justify-between p-3 bg-foreground/5 rounded-lg">
                  <span className="font-medium capitalize">{feature.feature.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="font-mono text-lg font-bold text-primary">{feature.count ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 shadow-xl text-center">
            <p className="text-foreground/60">No feature usage data available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* --- Users Section --- */
function UsersSection() {
  interface UserDoc {
    uid: string;
    email: string;
    displayName: string | null;
    class?: number;
    board?: string;
    createdAt: number;
    lastLogin?: number;
  }

  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) return;

        const usersRef = collection(db, "users");
        const usersSnap = await getDocs(query(usersRef, orderBy("createdAt", "desc"), limit(pageSize + 1)));
        const usersData = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserDoc[];
        setUsers(usersData);
        setLoading(false);
      } catch (error) {
        console.error("Users fetch error:", error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">User Management</h1>
        <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
          <p className="text-foreground/60">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-bold text-foreground">User Management</h1>
        <span className="text-sm text-foreground/60">{users.length} users</span>
      </div>

      <div className="bg-card border rounded-xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5">
                <th className="text-left py-3 px-4 font-medium text-foreground/60">UID</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Name</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Email</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Class/Board</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Created</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.uid} className="border-b border-border/50 hover:bg-foreground/5">
                    <td className="py-3 px-4 font-mono text-xs text-foreground/70">{user.uid.slice(0, 12)}…</td>
                    <td className="py-3 px-4 font-medium">{user.displayName || "—"}</td>
                    <td className="py-3 px-4 text-foreground/70">{user.email}</td>
                    <td className="py-3 px-4">
                      {user.class ? `Class ${user.class}` : "—"} {user.board ? `· ${user.board}` : ""}
                    </td>
                    <td className="py-3 px-4 text-foreground/50 font-mono text-xs">
                      {new Date(user.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-4">
                      <button className="text-primary hover:underline text-sm">View</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-foreground/50">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --- Downloads Section --- */
function DownloadsSection() {
  interface DownloadDoc {
    id: string;
    platform: string;
    count: number;
    date: string;
    version?: string;
  }

  const [downloads, setDownloads] = useState<DownloadDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) return;

        const downloadsRef = collection(db, "downloads");
        const downloadsSnap = await getDocs(query(downloadsRef, orderBy("date", "desc"), limit(50)));
        const downloadsData = downloadsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as DownloadDoc[];
        setDownloads(downloadsData);
        setLoading(false);
      } catch (error) {
        console.error("Downloads fetch error:", error);
        setLoading(false);
      }
    };

    fetchDownloads();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">App Download Analytics</h1>
        <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
          <p className="text-foreground/60">Loading download data...</p>
        </div>
      </div>
    );
  }

  const totalDownloads = downloads.reduce((sum, d) => sum + (d.count || 0), 0);
  const platformStats = downloads.reduce((acc, d) => {
    acc[d.platform] = (acc[d.platform] || 0) + (d.count || 0);
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-foreground mb-8">App Download Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Downloads</p>
          <p className="text-5xl font-bold text-foreground">{totalDownloads.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Android (APK)</p>
          <p className="text-5xl font-bold text-foreground">{platformStats.android?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Windows (PWA)</p>
          <p className="text-5xl font-bold text-foreground">{platformStats.windows?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-xl overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold">Recent Downloads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-foreground/5">
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Date</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Platform</th>
                <th className="text-right py-3 px-4 font-medium text-foreground/60">Downloads</th>
                <th className="text-left py-3 px-4 font-medium text-foreground/60">Version</th>
              </tr>
            </thead>
            <tbody>
              {downloads.length > 0 ? (
                downloads.map((d) => (
                  <tr key={d.id} className="border-b border-border/50 hover:bg-foreground/5">
                    <td className="py-3 px-4 font-mono text-xs">{d.date}</td>
                    <td className="py-3 px-4 capitalize">{d.platform}</td>
                    <td className="py-3 px-4 text-right font-medium">{d.count}</td>
                    <td className="py-3 px-4 text-foreground/50 text-xs">{d.version || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-foreground/50">No download data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* --- Update Section --- */
function UpdateSection() {
  const [releaseConfig, setReleaseConfig] = useState<{
    latestVersion: string;
    minSupportedVersion: string;
    releaseNotes: string;
    forceUpdate: boolean;
    downloadUrl: string;
    createdAt: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) return;

        const configRef = doc(db, "appConfig", "release");
        const snap = await getDoc(configRef);
        if (snap.exists()) {
          setReleaseConfig(snap.data() as typeof releaseConfig);
        }
      } catch (error) {
        console.error("Release config fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (!releaseConfig) return;
    setSaving(true);
    try {
      const db = getFirestoreDb();
      if (!db) return;

      await setDoc(doc(db, "appConfig", "release"), {
        ...releaseConfig,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Release config save error:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">App Update Management</h1>
        <div className="bg-card border border-gray-200/50 dark:border-gray-700/50 p-8 shadow-xl text-center">
          <p className="text-foreground/60">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-foreground mb-8">App Update Management</h1>
      <p className="text-foreground/60 mb-8">
        Configure the latest app version for the UpdateAvailable toast notification system.
        This controls the in-app update prompt shown to users.
      </p>

      <div className="bg-card border rounded-xl p-6 shadow-xl space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground/60 mb-1">Latest Version</label>
          <input
            type="text"
            value={releaseConfig?.latestVersion || ""}
            onChange={(e) => setReleaseConfig(prev => ({ ...prev!, latestVersion: e.target.value }))}
            placeholder="e.g., 1.2.0"
            className="w-full max-w-xs px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/60 mb-1">Minimum Supported Version</label>
          <input
            type="text"
            value={releaseConfig?.minSupportedVersion || ""}
            onChange={(e) => setReleaseConfig(prev => ({ ...prev!, minSupportedVersion: e.target.value }))}
            placeholder="e.g., 1.0.0"
            className="w-full max-w-xs px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/60 mb-1">Download URL</label>
          <input
            type="url"
            value={releaseConfig?.downloadUrl || ""}
            onChange={(e) => setReleaseConfig(prev => ({ ...prev!, downloadUrl: e.target.value }))}
            placeholder="https://example.com/app-release.apk"
            className="w-full max-w-md px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground/60 mb-1">Release Notes</label>
          <textarea
            value={releaseConfig?.releaseNotes || ""}
            onChange={(e) => setReleaseConfig(prev => ({ ...prev!, releaseNotes: e.target.value }))}
            rows={4}
            placeholder="What's new in this version..."
            className="w-full max-w-2xl px-4 py-2 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={releaseConfig?.forceUpdate || false}
              onChange={(e) => setReleaseConfig(prev => ({ ...prev!, forceUpdate: e.target.checked }))}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30"
            />
            <span className="text-sm font-medium">Force Update (block app usage until updated)</span>
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 btn-primary rounded-xl text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
          <button
            onClick={() => setReleaseConfig({
              latestVersion: "1.0.0",
              minSupportedVersion: "1.0.0",
              releaseNotes: "",
              forceUpdate: false,
              downloadUrl: "",
              createdAt: Date.now(),
            })}
            className="px-6 py-2.5 rounded-xl text-sm font-medium bg-foreground/5 hover:bg-foreground/10"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {releaseConfig && (
        <div className="mt-8 bg-card border rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Current Live Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-foreground/60">Version:</span> <span className="font-mono font-bold">{releaseConfig.latestVersion}</span></div>
            <div className="flex justify-between"><span className="text-foreground/60">Min Supported:</span> <span className="font-mono">{releaseConfig.minSupportedVersion}</span></div>
            <div className="flex justify-between"><span className="text-foreground/60">Force Update:</span> <span>{releaseConfig.forceUpdate ? "Yes" : "No"}</span></div>
            <div className="flex justify-between"><span className="text-foreground/60">Last Updated:</span> <span>{new Date(releaseConfig.createdAt).toLocaleString("en-IN")}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
