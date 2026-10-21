"use client";

import { useState, useEffect } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, orderBy, limit, setDoc } from "firebase/firestore";
import { HomeIcon, ChartBarIcon, UserIcon, DocumentTextIcon, ArrowRightIcon, Cog6ToothIcon, ArrowPathIcon, EyeIcon, CheckCircleIcon, ClockIcon, DownloadIcon, SparklesIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
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
        <div className="p-8 bg-white border border-border rounded-xl shadow-xl text-center">
          <h1 className="text-3xl font-bold text-foreground">
            Loading Admin Dashboard
          </h1>
        </div>
      </div>
    );
  }

  // Show a secure administrator sign-in screen when the admin claim is absent.
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <div className="mb-7 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><ChartBarIcon className="h-7 w-7" /></div>
            <div><p className="text-lg font-semibold">Padhai Buddy</p><p className="text-sm text-slate-400">Admin control center</p></div>
          </div>
          <h1 className="text-2xl font-semibold">Admin sign in</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to access private analytics and management tools.</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem("admin-password") as HTMLInputElement);
            handleLogin(input.value);
          }}>
            <label className="block text-sm font-medium text-slate-300" htmlFor="admin-password">Admin password</label>
            <input type="password" id="admin-password" name="admin-password" required autoComplete="current-password" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter admin password" />
            <button type="submit" disabled={loginLoading} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">{loginLoading ? "Signing in…" : "Sign in securely"}</button>
          </form>
          {(loginError || authError) && <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{loginError || authError}</p>}
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><EyeIcon className="h-4 w-4" /> Administrator authentication remains required.</p>
        </div>
      </div>
    );
  }

  // User is authenticated as admin - show dashboard
  const adminNav = [
    { id: "overview", label: "Overview", icon: HomeIcon },
    { id: "analytics", label: "Analytics", icon: ChartBarIcon },
    { id: "traffic", label: "Traffic chart", icon: EyeIcon },
    { id: "users", label: "Users", icon: UserIcon },
    { id: "downloads", label: "Downloads", icon: DocumentTextIcon },
    { id: "update", label: "Updates", icon: ArrowPathIcon },
    { id: "settings", label: "Settings", icon: Cog6ToothIcon },
    { id: "more", label: "More tools", icon: ArrowRightIcon },
  ];
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
        <div className="border-b border-slate-800 px-5 py-6">
          <div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500 p-2 text-slate-950"><ChartBarIcon className="h-6 w-6" /></div><div><p className="font-semibold">Padhai Buddy</p><p className="text-xs text-slate-400">Admin control center</p></div></div>
        </div>
        <div className="px-4 pt-6"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p>
          <nav className="mt-3 space-y-1">
            {adminNav.map((item) => { const Icon = item.icon; return (
              <button key={item.id} onClick={() => setSelectedSection(item.id)} aria-current={selectedSection === item.id ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${selectedSection === item.id ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}>
                <Icon className="h-5 w-5" />{item.label}
              </button>
            ); })}
          </nav>
        </div>
        <div className="mt-auto p-4"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><p className="text-xs font-semibold text-emerald-300">Private admin area</p><p className="mt-2 text-xs leading-5 text-slate-400">Metrics show collected data only. Missing history is not fabricated.</p></div><button onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><ArrowLeftIcon className="h-5 w-5" /> Sign out</button></div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-7">
            <div><p className="text-xs font-medium text-slate-500">Admin / Padhai Buddy</p><h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{adminNav.find((item) => item.id === selectedSection)?.label || "Overview"}</h1></div>
            <div className="flex items-center gap-3"><span className="hidden text-right text-xs text-slate-500 sm:block">{new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</span><button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"><ArrowPathIcon className="h-4 w-4" /><span className="hidden sm:inline">Refresh</span></button><button onClick={handleLogout} className="rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">Logout</button></div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-7">
          <div><p className="text-sm font-medium text-emerald-700">Your learning platform, at a glance</p><p className="mt-1 text-sm text-slate-500">Website analytics and management · Date-keyed analytics currently use UTC.</p></div>
          {selectedSection === "overview" && <OverviewSection />}
          {selectedSection === "analytics" && <AnalyticsSection />}
          {selectedSection === "traffic" && <TrafficSection />}
          {selectedSection === "users" && <UsersSection />}
          {selectedSection === "downloads" && <DownloadsSection />}
          {selectedSection === "update" && <UpdateSection />}
          {selectedSection === "settings" && <SettingsSection />}
          {selectedSection === "more" && <MoreSection />}
        </main>
      </div>
    </div>
  );
}
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

      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Read from today's date-keyed document (matching the tracking endpoint)
      const dailyRef = doc(db, "dailyAnalytics", dateStr);
      const snap = await getDoc(dailyRef);

      if (snap.exists()) {
        const data = snap.data();
        // Map fields: pageViews = total page-view events, uniqueVisitors = estimated unique visitors
        setStats({
          todayVisitors: data.uniqueVisitors ?? 0,        // estimated unique visitors (NOT pageViews)
          totalVisitors: data.totalVisitors ?? 0,         // cumulative total visitors (stored separately)
          todaySignups: data.signups ?? 0,                // total signups
          totalSignups: data.totalSignups ?? 0,           // cumulative total signups
          todayDownloads: data.todayDownloads ?? 0,       // today's downloads
          totalDownloads: data.totalDownloads ?? 0,        // cumulative total downloads
          todayReturning: data.todayReturning ?? 0,       // today's returning users
          totalReturning: data.totalReturning ?? 0,       // cumulative total returning
          totalRegistered: data.totalRegistered ?? 0,      // total registered users
        });

        const calculatePct = (current: number, previous: number) => {
          if (previous === 0 && current === 0) return 0;
          if (previous === 0) return 100;
          return ((current - previous) / previous) * 100;
        };

        // Use stored delta values if available, otherwise calculate from current vs previous day
        setPercentageChanges({
          visitors: calculatePct((data.todayVisitors ?? 0), (data._prevTodayVisitors ?? 0)),
          signups: calculatePct((data.todaySignups ?? 0), (data._prevTodaySignups ?? 0)),
          downloads: calculatePct((data.todayDownloads ?? 0), (data._prevTodayDownloads ?? 0)),
          returning: calculatePct((data.todayReturning ?? 0), (data._prevTodayReturning ?? 0)),
        });
      } else {
        setStats({
          todayVisitors: 0, totalVisitors: 0, todaySignups: 0, totalSignups: 0,
          todayDownloads: 0, totalDownloads: 0, todayReturning: 0, totalReturning: 0,
          totalRegistered: 0,
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
          <h1 className="text-4xl font-bold text-foreground mb-8">Today&apos;s Analytics</h1>
          <div className="bg-card border border-border p-8 shadow-xl text-center">
            <p className="text-foreground/60">Loading analytics data from Firestore...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Visitors</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.visitors >= 0 ? "var(--success)" : "var(--error)" }}>
          {stats.todayVisitors.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.visitors))}% {percentageChanges.visitors >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Visitors</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalVisitors.toLocaleString()}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Signups</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.signups >= 0 ? "var(--success)" : "var(--error)" }}>
          {stats.todaySignups.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.signups))}% {percentageChanges.signups >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Signups</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalSignups.toLocaleString()}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Downloads</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.downloads >= 0 ? "var(--success)" : "var(--error)" }}>
          {stats.todayDownloads.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.downloads))}% {percentageChanges.downloads >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Today&apos;s Returning</p>
        <p className="text-5xl font-bold text-foreground" style={{ color: percentageChanges.returning >= 0 ? "var(--success)" : "var(--error)" }}>
          {stats.todayReturning.toLocaleString()}
        </p>
        <p className="text-xs text-foreground/60">±{Math.abs(Math.round(percentageChanges.returning))}% {percentageChanges.returning >= 0 ? "▲" : "▼"} vs yesterday</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-lg">
        <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Registered</p>
        <p className="text-5xl font-bold text-foreground">{stats.totalRegistered.toLocaleString()}</p>
      </div>
    </div>
  );
}

/* --- Analytics Section --- */
function AnalyticsSection() {
  const [analytics, setAnalytics] = useState<{
    dailyUniqueVisitors: { date: string; uniqueVisitors?: number; signups?: number }[];
    weeklySignups: { date: string; count: number }[];
    featureUsage: { feature: string; count: number }[];
    loading: boolean;
  }>({
    dailyUniqueVisitors: [],
    weeklySignups: [],
    featureUsage: [],
    loading: true,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const db = getFirestoreDb();
        if (!db) return;

        // Fetch daily unique visitors from dailyAnalytics collection.
        // NOTE: uniqueVisitors is an estimate derived from page_view events with
        // authenticated sessions. It is NOT independently measured active users.
        const analyticsRef = collection(db, "dailyAnalytics");
        const analyticsSnap = await getDocs(query(analyticsRef, orderBy("date", "desc"), limit(30)));
        const dailyData = analyticsSnap.docs.map(d => {
          const data = d.data();
          return {
            date: d.id,
            uniqueVisitors: data.uniqueVisitors ?? 0,   // estimated unique visitors (NOT active users)
            signups: data.signups ?? 0,
          };
        }) as { date: string; uniqueVisitors: number; signups: number }[];

        // Fetch feature usage
        const featureRef = collection(db, "featureUsage");
        const featureSnap = await getDocs(query(featureRef, orderBy("count", "desc"), limit(10)));
        const featureData = featureSnap.docs.map(d => ({ feature: d.id, ...d.data() })) as { feature: string; count: number }[];

        setAnalytics({
          dailyUniqueVisitors: dailyData,
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
        <div className="bg-white border border-border p-8 shadow-xl text-center">
          <p className="text-foreground/60">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      <h1 className="text-4xl font-bold text-foreground mb-8">Admin Analytics</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Daily Estimated Unique Visitors (Last 30 Days)</h2>
        {analytics.dailyUniqueVisitors.length > 0 ? (
          <div className="bg-white border rounded-xl p-6 shadow-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 font-medium text-foreground/60">Date</th>
                  <th className="text-right py-2 px-4 font-medium text-foreground/60">Estimated Unique Visitors</th>
                  <th className="text-right py-2 px-4 font-medium text-foreground/60">Signups</th>
                </tr>
              </thead>
              <tbody>
                {analytics.dailyUniqueVisitors.map((day, i) => (
                  <tr key={day.date} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-foreground/5" : ""}`}>
                    <td className="py-2 px-4 font-mono">{day.date}</td>
                    <td className="py-2 px-4 text-right font-medium">{day.uniqueVisitors ?? 0}</td>
                    <td className="py-2 px-4 text-right">{day.signups ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border rounded-xl p-8 shadow-xl text-center">
            <p className="text-foreground/60">No analytics data available yet.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Feature Usage</h2>
        {analytics.featureUsage.length > 0 ? (
          <div className="bg-white border rounded-xl p-6 shadow-xl">
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
          <div className="bg-white border rounded-xl p-8 shadow-xl text-center">
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
        <div className="bg-white border border-border p-8 shadow-xl text-center">
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

      <div className="bg-white border rounded-xl shadow-xl overflow-hidden">
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
        <div className="bg-white border border-border p-8 shadow-xl text-center">
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
        <div className="bg-white border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Total Downloads</p>
          <p className="text-5xl font-bold text-foreground">{totalDownloads.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Android (APK)</p>
          <p className="text-5xl font-bold text-foreground">{platformStats.android?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white border rounded-xl p-6 shadow-lg">
          <p className="text-sm text-foreground/60 uppercase tracking-wider mb-2">Windows (PWA)</p>
          <p className="text-5xl font-bold text-foreground">{platformStats.windows?.toLocaleString() || 0}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-xl overflow-hidden">
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
        <div className="bg-white border border-border p-8 shadow-xl text-center">
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

      <div className="bg-white border rounded-xl p-6 shadow-xl space-y-6">
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
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
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
        <div className="mt-8 bg-white border rounded-xl p-6 shadow-xl">
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


/* --- Traffic, Settings & More --- */
function TrafficSection() {
  const [days, setDays] = useState<{ date: string; pageViews: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const db = getFirestoreDb();
        if (!db) throw new Error("Analytics database is unavailable.");
        const labels = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (13 - i)); return d.toISOString().slice(0, 10); });
        const snapshots = await Promise.all(labels.map((date) => getDoc(doc(db, "dailyAnalytics", date))));
        const rows = snapshots.map((snap, i) => ({ date: labels[i], pageViews: snap.exists() && typeof snap.data().pageViews === "number" ? snap.data().pageViews as number : 0 }));
        if (!cancelled) setDays(rows);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Unable to load traffic.");
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);
  const max = Math.max(1, ...days.map((d) => d.pageViews));
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div><h2 className="text-xl font-semibold">Traffic movement</h2><p className="mt-1 text-sm text-slate-500">Actual daily page-view totals for the last 14 UTC dates.</p></div>{loading ? <p className="py-12 text-center text-sm text-slate-500">Loading traffic…</p> : loadError ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{loadError}</p> : days.every((d) => d.pageViews === 0) ? <p className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">No page-view history has been collected yet.</p> : <><div className="mt-7 flex h-60 items-end gap-2 sm:gap-3">{days.map((d, i) => { const previous = i ? days[i - 1].pageViews : d.pageViews; const rising = d.pageViews >= previous; return <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-500 sm:text-xs">{d.pageViews}</span><div className="flex h-[75%] w-full items-end justify-center"><div title={d.date + ": " + d.pageViews + " page views"} className={`w-full max-w-8 rounded-t-md ${rising ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: Math.max(d.pageViews ? 4 : 1, d.pageViews / max * 100) + "%" }} /></div><span className="whitespace-nowrap text-[9px] text-slate-400 sm:text-[11px]">{new Date(d.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" })}</span></div>; })}</div><div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Same or higher than previous day</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Lower than previous day</span></div></>}<div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-900">Why not true candlesticks yet?</p><p className="mt-1 text-sm leading-6 text-amber-800">The current tracker stores daily totals, not intraday open/high/low/close values. This chart uses honest red/green daily bars instead of inventing candle data.</p></div><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ClockIcon className="h-4 w-4" /> Time spent on website</p><p className="mt-1 text-sm leading-6 text-slate-600">Session duration is not yet measured by the current analytics schema. A future tracking update needs privacy-conscious session heartbeats before this can show accurate time.</p></div></section>;
}

function SettingsSection() {
  const [refreshRate, setRefreshRate] = useState("60");
  const [compact, setCompact] = useState(false);
  const [sound, setSound] = useState(false);
  useEffect(() => { try { setRefreshRate(localStorage.getItem("pb-admin-refresh") || "60"); setCompact(localStorage.getItem("pb-admin-compact") === "true"); setSound(localStorage.getItem("pb-admin-sound") === "true"); } catch { /* Optional browser storage. */ } }, []);
  return <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold">Dashboard settings</h2><p className="mt-1 text-sm text-slate-500">These preferences are stored in this browser only.</p><div className="mt-6 divide-y divide-slate-100"><div className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center"><div><p className="font-medium">Refresh interval</p><p className="mt-1 text-sm text-slate-500">Choose how often you want to refresh data. The header Refresh button is always available.</p></div><select value={refreshRate} onChange={(e) => { setRefreshRate(e.target.value); try { localStorage.setItem("pb-admin-refresh", e.target.value); } catch { /* ignore */ } }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="15">15 seconds</option><option value="30">30 seconds</option><option value="60">1 minute</option><option value="300">5 minutes</option><option value="manual">Manual only</option></select></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="font-medium">Compact layout preference</p><p className="mt-1 text-sm text-slate-500">Save your compact-layout preference for future dashboard updates.</p></div><input type="checkbox" checked={compact} onChange={(e) => { setCompact(e.target.checked); try { localStorage.setItem("pb-admin-compact", String(e.target.checked)); } catch { /* ignore */ } }} className="h-5 w-5 accent-emerald-600" /></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="font-medium">Sound alert preference</p><p className="mt-1 text-sm text-slate-500">Saved preference only; sounds remain inactive until alert events are implemented.</p></div><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); try { localStorage.setItem("pb-admin-sound", String(e.target.checked)); } catch { /* ignore */ } }} className="h-5 w-5 accent-emerald-600" /></div></div><div className="mt-5 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-700" /><p className="text-sm leading-6 text-emerald-900">Admin authentication and protected APIs are unchanged. Settings do not change student preferences or server security.</p></div></section>;
}

function MoreSection() {
  const items = [
    { title: "Tracking coverage", description: "Public page views are collected. Unique visitor deduplication currently applies only to authenticated users.", status: "Partial coverage", icon: EyeIcon },
    { title: "Session duration", description: "The current schema has no reliable session heartbeat or session-end duration aggregation.", status: "Not measured", icon: ClockIcon },
    { title: "Feature reports", description: "Open Analytics or Feature Usage to inspect recorded aggregate activity.", status: "Available", icon: ChartBarIcon },
    { title: "Privacy & access", description: "Admin login and custom-token authentication remain required for this panel.", status: "Protected", icon: ShieldCheckIcon },
    { title: "Downloads", description: "Review recorded download events and the current download counters.", status: "Available", icon: DownloadIcon },
    { title: "Release management", description: "Use the existing Updates section to manage release configuration.", status: "Existing tool", icon: DocumentTextIcon },
  ];
  return <div><h2 className="text-xl font-semibold">More tools</h2><p className="mt-1 text-sm text-slate-500">System notes, tracking coverage, and shortcuts to existing admin tools.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="rounded-xl bg-slate-100 p-2.5"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{item.status}</span></div><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p></article>; })}</div></div>;
}
