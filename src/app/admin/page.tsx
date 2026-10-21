"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signInWithCustomToken, signOut } from "firebase/auth";
import { useAuth } from "@/contexts/AuthContext";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import {
  AcademicCapIcon, ArrowPathIcon, ArrowRightOnRectangleIcon, ArrowTrendingDownIcon,
  ArrowTrendingUpIcon, Bars3Icon, ChartBarIcon, CheckCircleIcon, ClockIcon,
  Cog6ToothIcon, CursorArrowRaysIcon, DocumentTextIcon, DownloadIcon, EyeIcon,
  HomeIcon, ShieldCheckIcon, SparklesIcon, UsersIcon, XMarkIcon,
} from "@heroicons/react/24/outline";

type Section = "overview" | "traffic" | "features" | "downloads" | "settings" | "more";
type DailyMetric = { date: string; pageViews: number; uniqueVisitors: number | null; signups: number; downloads: number; featureUses: number };
type FeatureMetric = { feature: string; count: number };
const navItems: { id: Section; label: string; icon: typeof HomeIcon }[] = [
  { id: "overview", label: "Overview", icon: HomeIcon },
  { id: "traffic", label: "Traffic analytics", icon: ChartBarIcon },
  { id: "features", label: "Feature usage", icon: SparklesIcon },
  { id: "downloads", label: "Downloads", icon: DownloadIcon },
  { id: "settings", label: "Settings", icon: Cog6ToothIcon },
  { id: "more", label: "More tools", icon: Bars3Icon },
];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const lastDays = (count: number) => Array.from({ length: count }, (_, i) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - (count - i - 1)); return dateKey(d); });
const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const dayLabel = (date: string) => new Date(date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

function Metric({ label, value, detail, icon: Icon, tone = "neutral" }: { label: string; value: string; detail: string; icon: typeof EyeIcon; tone?: "neutral" | "green" | "red" }) {
  const colors = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "red" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-700";
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p></div><span className={`rounded-xl p-2.5 ${colors}`}><Icon className="h-5 w-5" /></span></div><p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p></article>;
}

function TrafficChart({ data }: { data: DailyMetric[] }) {
  const max = Math.max(1, ...data.map((d) => d.pageViews));
  if (!data.length || data.every((d) => d.pageViews === 0)) return <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center"><ChartBarIcon className="h-8 w-8 text-slate-400" /><p className="mt-3 text-sm font-medium text-slate-700">No page-view history yet</p><p className="mt-1 text-xs text-slate-500">Recorded traffic will appear here when events arrive.</p></div>;
  return <><div className="flex h-52 items-end gap-2 pt-4 sm:gap-3" role="img" aria-label="Daily page views chart">{data.map((d, i) => { const prev = i ? data[i - 1].pageViews : d.pageViews; const up = d.pageViews >= prev; const height = Math.max(d.pageViews ? 4 : 1, d.pageViews / max * 100); return <div key={d.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] text-slate-500 sm:text-xs">{fmt(d.pageViews)}</span><div className="flex h-[75%] w-full items-end justify-center"><div title={`${d.date}: ${d.pageViews} page views`} className={`w-full max-w-8 rounded-t-md ${up ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${height}%`, minHeight: d.pageViews ? 4 : 1 }} /></div><span className="whitespace-nowrap text-[9px] text-slate-400 sm:text-[11px]">{dayLabel(d.date)}</span></div>; })}</div><div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Higher than previous day</span><span className="inline-flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-rose-500" /> Lower than previous day</span></div></>;
}

function FeatureList({ features }: { features: FeatureMetric[] }) {
  const max = Math.max(1, ...features.map((f) => f.count));
  if (!features.length) return <div className="mt-5 rounded-xl border border-dashed border-slate-200 p-8 text-center"><SparklesIcon className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700">No feature-use data available</p><p className="mt-1 text-xs text-slate-500">Feature activity appears after analytics events are collected.</p></div>;
  return <div className="mt-5 space-y-4">{features.map((f, i) => <div key={f.feature}><div className="mb-2 flex justify-between gap-3"><span className="truncate text-sm font-medium capitalize text-slate-700">{f.feature.replace(/[-_]/g, " ")}</span><span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(f.count)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${i % 2 ? "bg-slate-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(f.count ? 2 : 0, f.count / max * 100)}%` }} /></div></div>)}</div>;
}

export default function AdminDashboard() {
  const { loading, isAdmin, authError } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyMetric[]>([]);
  const [features, setFeatures] = useState<FeatureMetric[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshRate, setRefreshRate] = useState("60");
  const [compact, setCompact] = useState(false);
  const [sound, setSound] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (!isAdmin) return;
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const db = getFirestoreDb();
      if (!db) throw new Error("Firebase database is unavailable. Check the app configuration.");
      const dates = lastDays(14);
      const snapshots = await Promise.all(dates.map((d) => getDoc(doc(db, "dailyAnalytics", d))));
      setDaily(snapshots.map((snap, i) => {
        const d = snap.exists() ? snap.data() : {};
        return { date: dates[i], pageViews: typeof d.pageViews === "number" ? d.pageViews : 0, uniqueVisitors: typeof d.uniqueVisitors === "number" ? d.uniqueVisitors : null, signups: typeof d.signups === "number" ? d.signups : 0, downloads: typeof d.todayDownloads === "number" ? d.todayDownloads : 0, featureUses: typeof d.featureUses === "number" ? d.featureUses : 0 };
      }));
      const featureSnap = await getDocs(query(collection(db, "featureUsage"), orderBy("count", "desc"), limit(12)));
      setFeatures(featureSnap.docs.map((s) => { const d = s.data(); return { feature: typeof d.feature === "string" ? d.feature : s.id, count: typeof d.count === "number" ? d.count : 0 }; }));
      setLastUpdated(new Date());
    } catch (e) {
      console.error("[Admin dashboard] Analytics load failed", e);
      setError(e instanceof Error ? e.message : "Analytics could not be loaded.");
    } finally { setRefreshing(false); }
  }, [isAdmin]);

  useEffect(() => { if (isAdmin) void refresh(); }, [isAdmin, refresh]);
  useEffect(() => {
    try { setRefreshRate(localStorage.getItem("pb-admin-refresh") || "60"); setCompact(localStorage.getItem("pb-admin-compact") === "true"); setSound(localStorage.getItem("pb-admin-sound") === "true"); } catch { /* Browser storage is optional. */ }
  }, []);
  useEffect(() => {
    if (!isAdmin || refreshRate === "manual") return;
    const seconds = Number(refreshRate);
    if (seconds < 15) return;
    const timer = window.setInterval(() => void refresh(), seconds * 1000);
    return () => window.clearInterval(timer);
  }, [isAdmin, refreshRate, refresh]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoginLoading(true); setLoginError(null);
    try {
      const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json().catch(() => ({})) as { success?: boolean; error?: string; customToken?: string };
      if (!response.ok || !data.success || !data.customToken) throw new Error(data.error || "Sign-in failed. Check your password and server configuration.");
      const auth = getFirebaseAuth(); if (!auth) throw new Error("Firebase authentication is not initialized.");
      const credential = await signInWithCustomToken(auth, data.customToken); await credential.user.getIdTokenResult(true); setPassword("");
    } catch (e) { setLoginError(e instanceof Error ? e.message : "Admin sign-in failed."); }
    finally { setLoginLoading(false); }
  }
  async function logout() { const auth = getFirebaseAuth(); if (auth) await signOut(auth); }

  const today = daily[daily.length - 1];
  const prev = daily[daily.length - 2];
  const pageViews14 = useMemo(() => daily.reduce((n, d) => n + d.pageViews, 0), [daily]);
  const signups14 = useMemo(() => daily.reduce((n, d) => n + d.signups, 0), [daily]);
  const downloads14 = useMemo(() => daily.reduce((n, d) => n + d.downloads, 0), [daily]);
  const featureUses14 = useMemo(() => daily.reduce((n, d) => n + d.featureUses, 0), [daily]);
  const selected = navItems.find((n) => n.id === section) ?? navItems[0];

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><div className="text-center"><div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-slate-500 border-t-white" /><p className="mt-4 text-sm text-slate-400">Checking administrator access…</p></div></div>;

  if (!isAdmin) return <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-100"><div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"><div className="mb-7 flex items-center gap-3"><div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-400"><AcademicCapIcon className="h-7 w-7" /></div><div><p className="text-lg font-semibold">Padhai Buddy</p><p className="text-sm text-slate-400">Admin control center</p></div></div><h1 className="text-2xl font-semibold">Admin sign in</h1><p className="mt-2 text-sm leading-6 text-slate-400">Sign in to access private analytics and settings.</p><form className="mt-6 space-y-4" onSubmit={handleLogin}><label htmlFor="admin-password" className="block text-sm font-medium text-slate-300">Admin password</label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter admin password" /><button disabled={loginLoading} className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60">{loginLoading ? "Signing in…" : "Sign in securely"}</button></form>{(loginError || authError) && <p role="alert" className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-300">{loginError || authError}</p>}<p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><ShieldCheckIcon className="h-4 w-4" /> Authentication remains required.</p></div></main>;

  return <div className="min-h-screen bg-slate-100 text-slate-900">
    {mobileOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-800 bg-slate-950 text-slate-100 transition-transform lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-500 p-2 text-slate-950"><AcademicCapIcon className="h-6 w-6" /></div><div><p className="font-semibold">Padhai Buddy</p><p className="text-xs text-slate-400">Admin control center</p></div></div><button aria-label="Close menu" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"><XMarkIcon className="h-5 w-5" /></button></div>
      <div className="px-4 pt-6"><p className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace</p><nav className="mt-3 space-y-1">{navItems.map((n) => { const Icon = n.icon; return <button key={n.id} onClick={() => { setSection(n.id); setMobileOpen(false); }} aria-current={section === n.id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${section === n.id ? "bg-emerald-500 text-slate-950" : "text-slate-400 hover:bg-slate-900 hover:text-white"}`}><Icon className="h-5 w-5" />{n.label}</button>; })}</nav></div>
      <div className="mt-auto p-4"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-center gap-2 text-xs font-medium text-emerald-300"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Private admin area</div><p className="mt-2 text-xs leading-5 text-slate-400">Only collected analytics are shown. Missing data is not fabricated.</p></div><button onClick={() => void logout()} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"><ArrowRightOnRectangleIcon className="h-5 w-5" /> Sign out</button></div>
    </aside>
    <div className="min-h-screen lg:pl-72">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl"><div className="flex min-h-[76px] items-center justify-between gap-4 px-4 sm:px-7"><div className="flex items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><Bars3Icon className="h-5 w-5" /></button><div><p className="text-xs font-medium text-slate-500">Admin / {selected.label}</p><h1 className="mt-1 text-lg font-semibold sm:text-xl">{selected.label}</h1></div></div><div className="flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-xs text-slate-500">Last updated</p><p className="text-xs font-medium text-slate-700">{lastUpdated ? lastUpdated.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "Not loaded"}</p></div><button onClick={() => void refresh(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"><ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /><span className="hidden sm:inline">Refresh</span></button></div></div></header>
      <main className={`mx-auto max-w-[1600px] p-4 sm:p-7 ${compact ? "space-y-4" : "space-y-6"}`}>
        {error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Analytics unavailable.</strong><span className="flex-1">{error}</span><button onClick={() => void refresh(true)} className="font-semibold underline">Retry</button></div>}
        {section === "overview" && <>
          <div><p className="text-sm font-medium text-emerald-700">Your learning platform, at a glance</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, Admin</h2><p className="mt-2 text-sm text-slate-500">Traffic and product activity · Analytics date buckets use UTC.</p></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Page views today" value={fmt(today?.pageViews ?? 0)} detail="Every recorded page view, including repeat visits." icon={EyeIcon} tone="green" /><Metric label="Unique visitors" value={today?.uniqueVisitors == null ? "—" : fmt(today.uniqueVisitors)} detail="Deduplicated signed-in visitors only; public visitors are not counted as unique." icon={UsersIcon} /><Metric label="Sign-ups today" value={fmt(today?.signups ?? 0)} detail="Sign-up events recorded by the tracker." icon={AcademicCapIcon} tone="green" /><Metric label="Feature uses today" value={fmt(today?.featureUses ?? 0)} detail="Authenticated feature-use events recorded today." icon={CursorArrowRaysIcon} /></div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">Traffic overview</h3><p className="mt-1 text-sm text-slate-500">Daily page views · last 14 days</p></div><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs text-slate-600">UTC dates</span></div><TrafficChart data={daily} /></section><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-semibold">Usage summary</h3><p className="mt-1 text-sm text-slate-500">Total across the displayed 14-day window</p><div className="mt-5 space-y-4">{[{ label: "Page views", value: pageViews14, icon: EyeIcon }, { label: "Sign-ups", value: signups14, icon: UsersIcon }, { label: "Downloads", value: downloads14, icon: DownloadIcon }, { label: "Feature uses", value: featureUses14, icon: SparklesIcon }].map((x) => { const Icon = x.icon; return <div key={x.label} className="flex items-center justify-between"><span className="flex items-center gap-3 text-sm text-slate-600"><Icon className="h-4 w-4" />{x.label}</span><strong className="tabular-nums">{fmt(x.value)}</strong></div>; })}</div><div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3"><div className="flex items-center gap-2 text-sm font-semibold text-amber-900"><ClockIcon className="h-4 w-4" /> Time on site</div><p className="mt-1 text-xs leading-5 text-amber-800">Not measured yet. The current event schema does not collect reliable session duration.</p></div></section></div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex justify-between gap-3"><div><h3 className="font-semibold">Popular features</h3><p className="mt-1 text-sm text-slate-500">All-time aggregate feature-use counts</p></div><button onClick={() => setSection("features")} className="text-sm font-semibold text-emerald-700">View details →</button></div><FeatureList features={features.slice(0, 5)} /></section>
        </>}
        {section === "traffic" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Website traffic</h2><p className="mt-1 text-sm text-slate-500">Daily recorded page views over the last 14 days.</p></div><span className={`flex items-center gap-2 text-sm font-semibold ${(today?.pageViews ?? 0) >= (prev?.pageViews ?? 0) ? "text-emerald-700" : "text-rose-700"}`}>{(today?.pageViews ?? 0) >= (prev?.pageViews ?? 0) ? <ArrowTrendingUpIcon className="h-5 w-5" /> : <ArrowTrendingDownIcon className="h-5 w-5" />}{fmt((today?.pageViews ?? 0) - (prev?.pageViews ?? 0))} vs previous day</span></div><TrafficChart data={daily} /><div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-semibold">About red/green bars</p><p className="mt-1 text-sm leading-6 text-slate-600">Green means the page-view count is at least as high as the previous day; red means it is lower. A true stock-style candlestick requires intraday open/high/low/close data, which the current tracker does not collect. This chart does not invent those values.</p></div></section>}
        {section === "features" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold">Feature usage</h2><p className="mt-1 text-sm text-slate-500">Aggregate counts from the existing featureUsage collection.</p><FeatureList features={features} /></section>}
        {section === "downloads" && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-center gap-3"><DownloadIcon className="h-6 w-6 text-slate-600" /><div><h2 className="text-xl font-semibold">Downloads & installs</h2><p className="mt-1 text-sm text-slate-500">Download events recorded in the last 14 UTC days.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><Metric label="Downloads in window" value={fmt(downloads14)} detail="Sum of daily download counters for the displayed period." icon={DownloadIcon} /><Metric label="Today" value={fmt(today?.downloads ?? 0)} detail="Recorded downloads for the latest UTC date bucket." icon={DocumentTextIcon} /></div><p className="mt-4 text-xs leading-5 text-slate-500">Browser PWA installs are not observable in every browser. These numbers reflect only events the app sends to analytics.</p></section>}
        {section === "settings" && <section className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="text-xl font-semibold">Dashboard settings</h2><p className="mt-1 text-sm text-slate-500">Preferences apply only to this browser.</p><div className="mt-6 divide-y divide-slate-100"><div className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center"><div><p className="font-medium">Auto-refresh</p><p className="mt-1 text-sm text-slate-500">Automatically reload analytics data.</p></div><select value={refreshRate} onChange={(e) => { setRefreshRate(e.target.value); try { localStorage.setItem("pb-admin-refresh", e.target.value); } catch { /* ignore */ } }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="15">Every 15 seconds</option><option value="30">Every 30 seconds</option><option value="60">Every minute</option><option value="300">Every 5 minutes</option><option value="manual">Manual only</option></select></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="font-medium">Compact layout</p><p className="mt-1 text-sm text-slate-500">Reduce dashboard spacing.</p></div><input type="checkbox" checked={compact} onChange={(e) => { setCompact(e.target.checked); try { localStorage.setItem("pb-admin-compact", String(e.target.checked)); } catch { /* ignore */ } }} className="h-5 w-5 accent-emerald-600" /></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="font-medium">Sound alerts</p><p className="mt-1 text-sm text-slate-500">Preference saved; sound alerts are not activated until an alert event is configured.</p></div><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); try { localStorage.setItem("pb-admin-sound", String(e.target.checked)); } catch { /* ignore */ } }} className="h-5 w-5 accent-emerald-600" /></div><div className="flex items-center justify-between gap-4 py-5"><div><p className="font-medium">Time display</p><p className="mt-1 text-sm text-slate-500">Header uses IST; daily analytics buckets use UTC.</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-sm">IST / UTC</span></div></div><div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-700" /><p className="text-sm text-emerald-900">These settings do not alter server security or student settings.</p></div></section>}
        {section === "more" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[{ title: "System health", desc: error ? "Analytics could not be loaded." : "Check the latest refresh and database connection.", status: error ? "Needs attention" : "Refresh status", icon: ShieldCheckIcon }, { title: "Tracking coverage", desc: "Public page views are counted, but unique visitor deduplication applies only to authenticated users.", status: "Partial coverage", icon: EyeIcon }, { title: "Session duration", desc: "The current schema does not reliably aggregate heartbeat or session-end duration.", status: "Not implemented", icon: ClockIcon }, { title: "Feature reports", desc: "Review aggregate feature usage collected by the analytics endpoint.", status: `${features.length} feature groups`, icon: SparklesIcon }, { title: "Privacy & access", desc: "The existing administrator authentication flow is preserved.", status: "Protected UI", icon: ShieldCheckIcon }, { title: "Data freshness", desc: lastUpdated ? `Last successful refresh: ${lastUpdated.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST` : "No successful refresh yet.", status: lastUpdated ? "Loaded" : "Waiting", icon: ClockIcon }].map((x) => { const Icon = x.icon; return <article key={x.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="rounded-xl bg-slate-100 p-2.5"><Icon className="h-5 w-5" /></span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{x.status}</span></div><h3 className="mt-4 font-semibold">{x.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{x.desc}</p></article>; })}</div>}
        <footer className="flex flex-col justify-between gap-2 border-t border-slate-200 pt-5 text-xs text-slate-400 sm:flex-row"><span>Padhai Buddy · Admin analytics</span><span>Collected data only · Timezone-aware reporting</span></footer>
      </main>
    </div>
  </div>;
}
