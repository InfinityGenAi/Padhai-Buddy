"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getFirestoreDb } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

interface AnalyticsStats {
  todayVisitors: number;
  totalVisitors: number;
  todayDownloads: number;
  totalDownloads: number;
  todaySignups: number;
  totalSignups: number;
  todayReturning: number;
  totalReturning: number;
}

interface TrendData {
  visitorTrend: number[];
  signupTrend: number[];
  downloadTrend: number[];
  returningTrend: number[];
}

function getLast7DaysLabels(): string[] {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })
    );
  }
  return labels;
}

export default function AdminAnalytics() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AnalyticsStats>({
    todayVisitors: 0,
    totalVisitors: 0,
    todayDownloads: 0,
    totalDownloads: 0,
    todaySignups: 0,
    totalSignups: 0,
    todayReturning: 0,
    totalReturning: 0,
  });

  const [trends, setTrends] = useState<TrendData>({
    visitorTrend: [0, 0, 0, 0, 0, 0, 0],
    signupTrend: [0, 0, 0, 0, 0, 0, 0],
    downloadTrend: [0, 0, 0, 0, 0, 0, 0],
    returningTrend: [0, 0, 0, 0, 0, 0, 0],
  });

  const [featureStats, setFeatureStats] = useState<Record<string, number>>({});
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }

    const fetchAnalytics = async () => {
      setDataLoading(true);
      const db = getFirestoreDb();
      if (!db) {
        setDataLoading(false);
        return;
      }

      try {
        const dailyRef = doc(db, "dailyAnalytics", "current");
        const dailySnap = await getDoc(dailyRef);
        if (dailySnap.exists()) {
          const d = dailySnap.data();
          setStats({
            todayVisitors: d.todayVisitors ?? 0,
            totalVisitors: d.totalVisitors ?? 0,
            todayDownloads: d.todayDownloads ?? 0,
            totalDownloads: d.totalDownloads ?? 0,
            todaySignups: d.todaySignups ?? 0,
            totalSignups: d.totalSignups ?? 0,
            todayReturning: d.todayReturning ?? 0,
            totalReturning: d.totalReturning ?? 0,
          });
          setTrends({
            visitorTrend: d.visitorTrend ?? [0, 0, 0, 0, 0, 0, 0],
            signupTrend: d.signupTrend ?? [0, 0, 0, 0, 0, 0, 0],
            downloadTrend: d.downloadTrend ?? [0, 0, 0, 0, 0, 0, 0],
            returningTrend: d.returningTrend ?? [0, 0, 0, 0, 0, 0, 0],
          });
        }

        const featureSnap = await getDocs(collection(db, "featureUsage"));
        const totals: Record<string, number> = {};
        featureSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.total) {
            Object.entries(data.total as Record<string, number>).forEach(([key, val]) => {
              totals[key] = (totals[key] || 0) + (typeof val === "number" ? val : 0);
            });
          }
        });
        setFeatureStats(totals);
      } catch {
        console.error("[Admin Analytics] Failed to load analytics data");
      }
      setDataLoading(false);
    };

    fetchAnalytics();
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="p-8 bg-card border border-rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold text-foreground">Loading Analytics</h1>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="p-8 bg-card border border-rounded-2xl shadow-xl text-center">
          <h1 className="text-xl text-foreground/60">Access Denied</h1>
          <p className="text-foreground/60 mt-4">You do not have permission to view analytics.</p>
          <a href="/dashboard" className="mt-6 inline-block text-primary hover:underline">Go to Dashboard</a>
        </div>
      </div>
    );
  }

  const dayLabels = getLast7DaysLabels();
  const maxTrendVal = Math.max(
    ...trends.visitorTrend,
    ...trends.signupTrend,
    ...trends.downloadTrend,
    ...trends.returningTrend,
    1
  );

  const renderTrend = (data: number[], label: string, color: string) => (
    <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-foreground mb-6">{label}</h2>
      <div className="space-y-4">
        {data.map((val, index) => (
          <div key={dayLabels[index]} className="flex justify-between items-center">
            <span className="text-sm text-foreground/60 w-16">{dayLabels[index]}</span>
            <div className="flex-1 mx-3 h-4 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${maxTrendVal > 0 ? (val / maxTrendVal) * 100 : 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-sm font-medium text-foreground w-10 text-right">{val}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const sortedFeatures = Object.entries(featureStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Admin Analytics</h1>

        {dataLoading ? (
          <div className="bg-card border border-rounded-2xl p-8 shadow-xl text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-foreground/60">Loading analytics data from Firestore...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Today&apos;s Visitors</h3>
                <p className="text-5xl font-bold text-primary">{stats.todayVisitors}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Total Visitors</h3>
                <p className="text-5xl font-bold text-primary">{stats.totalVisitors}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Today&apos;s Downloads</h3>
                <p className="text-5xl font-bold text-primary">{stats.todayDownloads}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Total Downloads</h3>
                <p className="text-5xl font-bold text-primary">{stats.totalDownloads}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Today&apos;s Signups</h3>
                <p className="text-5xl font-bold text-primary">{stats.todaySignups}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Total Signups</h3>
                <p className="text-5xl font-bold text-primary">{stats.totalSignups}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Today&apos;s Returning</h3>
                <p className="text-5xl font-bold text-primary">{stats.todayReturning}</p>
              </div>
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h3 className="text-sm text-foreground/60 uppercase tracking-wider mb-4">Total Returning</h3>
                <p className="text-5xl font-bold text-primary">{stats.totalReturning}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {renderTrend(trends.visitorTrend, "Visitor Trend (7 Days)", "#6366f1")}
              {renderTrend(trends.downloadTrend, "Download Trend (7 Days)", "#10b981")}
              {renderTrend(trends.signupTrend, "Signup Trend (7 Days)", "#3b82f6")}
              {renderTrend(trends.returningTrend, "Returning User Trend (7 Days)", "#f59e0b")}
            </div>

            {sortedFeatures.length > 0 && (
              <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
                <h2 className="text-2xl font-bold text-foreground mb-6">Feature Usage</h2>
                <div className="space-y-3">
                  {sortedFeatures.map(([key, count], idx) => (
                    <div key={key} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground/60 w-6">{idx + 1}.</span>
                      <span className="text-sm text-foreground">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                      <div className="flex-1 mx-2 h-3 bg-foreground/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(count / Math.max(sortedFeatures[0][1], 1)) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground/60">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sortedFeatures.length === 0 && !dataLoading && (
              <div className="bg-card border border-rounded-2xl p-8 shadow-xl text-center">
                <p className="text-foreground/60">No feature usage data collected yet. Data will appear as users interact with features.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
