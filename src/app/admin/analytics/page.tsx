"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminAnalytics() {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();

  // State initialized FIRST - before any early returns
  const [stats, setStats] = useState({
    todayVisitors: 124,
    totalVisitors: 5832,
    todayDownloads: 47,
    totalDownloads: 3821,
    todaySignups: 23,
    totalSignups: 1567,
    todayReturning: 89,
    totalReturning: 423,
  });

  const [trends, setTrends] = useState({
    visitorTrend: [23, 45, 34, 56, 78, 65, 89],
    signupTrend: [12, 23, 18, 34, 29, 45, 67],
    downloadTrend: [34, 56, 23, 67, 45, 89, 34],
    returningTrend: [67, 45, 89, 34, 56, 23, 12],
  });

  // Admin auth check - after state initialized
  useEffect(() => {
    if (loading) return;
    if (!isAdmin) {
      router.push("/dashboard");
      return;
    }
    // TODO: Connect to Firestore for real analytics data
    // fetchAnalyticsDataFromFirestore(setStats, setTrends);
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">
          Admin Analytics
        </h1>

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Visitor Trend (7 Days)</h2>
            <div className="space-y-4">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">{day}</span>
                  <div className="w-48 h-4 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(index + 1) * 15}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{(index + 1) * 15}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Download Trend (7 Days)</h2>
            <div className="space-y-4">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">{day}</span>
                  <div className="w-48 h-4 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(index + 1) * 12}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{(index + 1) * 12}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Signup Trend (7 Days)</h2>
            <div className="space-y-4">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">{day}</span>
                  <div className="w-48 h-4 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(index + 1) * 10}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{(index + 1) * 10}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">Returning User Trend (7 Days)</h2>
            <div className="space-y-4">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-sm text-foreground/60">{day}</span>
                  <div className="w-48 h-4 bg-foreground/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(index + 1) * 13}%` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{(index + 1) * 13}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}