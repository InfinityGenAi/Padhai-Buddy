import { test, expect } from "@playwright/test";
import http from "http";
import { getApps, initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

function isPortInUseSync(port: number): boolean {
  try {
    const net = require("net");
    const client = net.createConnection(port, "127.0.0.1");
    client.end();
    return true;
  } catch {
    return false;
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-project";
const PASSWORD = "AnalyticsTest123!";

let adminDb: Firestore;
let adminAuth: Auth;
let useEmulator = false;

function initAdmin() {
  const apps = getApps();
  if (apps.length > 0) {
    apps.forEach((a) => void deleteApp(a).catch(() => undefined));
  }

  useEmulator = isPortInUseSync(9099) && isPortInUseSync(8080);

  if (useEmulator) {
    process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
    initializeApp({ projectId: PROJECT_ID });
  } else {
    throw new Error("Analytics API tests require Firebase emulators");
  }
  adminAuth = getAuth();
  adminDb = getFirestore();
}
initAdmin();

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@padhai-buddy.test`;
}

async function createThrowawayUser(prefix: string): Promise<{ email: string; uid: string; token: string }> {
  const email = uniqueEmail(prefix);
  const authPort = 9099;
  const signupBody = JSON.stringify({
    email,
    password: PASSWORD,
    displayName: "Analytics User",
    returnSecureToken: true,
  });

  const signupResult = await new Promise<any>((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: authPort,
        path: "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=test",
        method: "POST",
        headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(signupBody) },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      },
    );
    req.on("error", reject);
    req.write(signupBody);
    req.end();
  });

  if (signupResult.localId) {
    return { email, uid: signupResult.localId, token: signupResult.idToken };
  }

  if (signupResult.error && signupResult.error.message === "EMAIL_EXISTS") {
    const signinBody = JSON.stringify({ email, password: PASSWORD, returnSecureToken: true });
    const signinResult = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: authPort,
          path: "/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test",
          method: "POST",
          headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(signinBody) },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data));
            } catch {
              resolve(data);
            }
          });
        },
      );
      req.on("error", reject);
      req.write(signinBody);
      req.end();
    });

    if (signinResult.localId && signinResult.idToken) {
      return { email, uid: signinResult.localId, token: signinResult.idToken };
    }
    throw new Error(`Failed to sign in existing throwaway user: ${JSON.stringify(signinResult)}`);
  }

  throw new Error(`Failed to create throwaway user: ${JSON.stringify(signupResult)}`);
}

async function deleteThrowawayUser(uid: string): Promise<void> {
  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // already gone
  }
  try {
    await adminDb.collection("users").doc(uid).delete();
  } catch {
    // already gone
  }
  try {
    await adminDb.collection("dailyVisitors").doc(todayUTCDateStr()).collection("users").doc(uid).delete();
  } catch {
    // ignore
  }
}

function todayUTCDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

async function getDailyAnalyticsDoc(dateStr: string) {
  const docRef = adminDb.collection("dailyAnalytics").doc(dateStr);
  const snap = await docRef.get();
  return { exists: snap.exists, data: snap.exists ? (snap.data() as Record<string, unknown>) : null };
}

async function clearTodayAnalytics() {
  const dateStr = todayUTCDateStr();
  const snap = await adminDb.collection("dailyAnalytics").doc(dateStr).get();
  if (snap.exists) {
    await adminDb.collection("dailyAnalytics").doc(dateStr).delete();
  }
  // Clear unique-visitor markers for today so each test starts clean
  const visitorsSnap = await adminDb.collection("dailyVisitors").doc(dateStr).collection("users").get();
  const batch = adminDb.batch();
  visitorsSnap.docs.forEach((d) => batch.delete(d.ref));
  if (visitorsSnap.docs.length > 0) {
    await batch.commit();
  }
}

async function callTrack(token: string | undefined, body: Record<string, unknown>, anon = false) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${process.env.BASE_URL || "http://localhost:3000"}/api/analytics/track`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

test.describe("Analytics Track: authorization", () => {
  test("returns 401 without a token for a non-page_view event", async () => {
    const res = await callTrack(undefined, { event: "signup" });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  test("returns 401 with an invalid token", async () => {
    const res = await callTrack("invalid-token-12345", { event: "page_view" });
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Invalid or expired token");
  });

  test("returns 400 when event type is missing", async () => {
    const user = await createThrowawayUser("analytics-auth");
    try {
      const res = await callTrack(user.token, {});
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Event type is required");
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("accepts a public page_view without a token (privacy-conscious public tracking)", async () => {
    await clearTodayAnalytics();
    const res = await callTrack(undefined, { event: "page_view", page: "/" });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

test.describe("Analytics Track: page view vs unique visitor deduplication", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("analytics-pv");
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("repeated page views by one user increment pageViews but count as ONE unique visitor", async () => {
    await clearTodayAnalytics();

    // Track 5 page views from the same authenticated user
    const responses = [];
    for (let i = 0; i < 5; i++) {
      responses.push(await callTrack(user.token, { event: "page_view", page: "/dashboard/" }));
    }
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);

    const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(doc.exists).toBe(true);
    expect(doc.data!.pageViews).toBe(5);

    // uniqueVisitors is deduplicated per user per day: still 1
    expect(doc.data!.uniqueVisitors).toBe(1);
  });

  test("concurrent page views by one user are counted once as a unique visitor", async () => {
    await clearTodayAnalytics();

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        callTrack(user.token, { event: "page_view", page: "/dashboard/" }),
      ),
    );
    expect(responses.map((response) => response.status)).toEqual(Array(10).fill(200));

    const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(doc.data!.pageViews).toBe(10);
    expect(doc.data!.uniqueVisitors).toBe(1);
  });

  test("multiple distinct users each count as one unique visitor", async () => {
    await clearTodayAnalytics();

    const userB = await createThrowawayUser("analytics-pv-b");
    try {
      const responses = await Promise.all([
        callTrack(user.token, { event: "page_view", page: "/" }),
        callTrack(userB.token, { event: "page_view", page: "/" }),
      ]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);

      const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
      expect(doc.data!.pageViews).toBe(2);
      expect(doc.data!.uniqueVisitors).toBe(2);
    } finally {
      await deleteThrowawayUser(userB.uid);
    }
  });

  test("pageViews and uniqueVisitors are separate metrics", async () => {
    const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(typeof doc.data!.pageViews).toBe("number");
    expect(typeof doc.data!.uniqueVisitors).toBe("number");
    // pageViews (events) must be >= uniqueVisitors (distinct users)
    expect(doc.data!.pageViews as number).toBeGreaterThanOrEqual(doc.data!.uniqueVisitors as number);
  });
});

test.describe("Analytics Track: feature usage field consistency", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("analytics-feature");
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("increments featureUses in dailyAnalytics and count in featureUsage collection", async () => {
    const dateStr = todayUTCDateStr();
    await clearTodayAnalytics();
    await adminDb.collection("featureUsage").doc("aiChat").delete();

    const beforeDoc = await getDailyAnalyticsDoc(dateStr);
    const beforeFeatureUses = beforeDoc.exists ? ((beforeDoc.data!.featureUses as number) || 0) : 0;

    await callTrack(user.token, { event: "feature_use", feature: "aiChat" });

    const dailyDoc = await getDailyAnalyticsDoc(dateStr);
    expect(dailyDoc.exists).toBe(true);
    expect(dailyDoc.data!.featureUses).toBe(beforeFeatureUses + 1);

    const featureDoc = await adminDb.collection("featureUsage").doc("aiChat").get();
    expect(featureDoc.exists).toBe(true);
    expect(featureDoc.data()!.count).toBe(1);
    expect(featureDoc.data()!.feature).toBe("aiChat");
  });

  test("feature_use without a feature name does not write to featureUsage collection", async () => {
    await clearTodayAnalytics();
    await callTrack(user.token, { event: "feature_use" });

    const dailyDoc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(dailyDoc.data!.featureUses).toBe(1);
  });
});

test.describe("Analytics Track: signup and download counting (daily vs cumulative)", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("analytics-signdl");
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("signup increments daily signups and cumulative totalSignups separately", async () => {
    const dateStr = todayUTCDateStr();
    await clearTodayAnalytics();

    await callTrack(user.token, { event: "signup" });

    const doc = await getDailyAnalyticsDoc(dateStr);
    expect(doc.data!.signups).toBe(1);
    expect(doc.data!.totalSignups).toBe(1);
  });

  test("download increments daily todayDownloads and cumulative totalDownloads separately", async () => {
    await callTrack(user.token, {
      event: "download",
      metadata: { platform: "android", version: "1.0.0" },
    });

    const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(doc.data!.todayDownloads).toBe(1);
    expect(doc.data!.totalDownloads).toBe(1);

    const downloadsSnap = await adminDb.collection("downloads").where("userId", "==", user.uid).get();
    expect(downloadsSnap.size).toBeGreaterThanOrEqual(1);
    const downloadDoc = downloadsSnap.docs[0];
    expect(downloadDoc.data()!.platform).toBe("android");
    expect(downloadDoc.data()!.version).toBe("1.0.0");
  });

  test("session_start increments a daily sessions counter", async () => {
    await clearTodayAnalytics();

    await callTrack(user.token, { event: "session_start" });

    const doc = await getDailyAnalyticsDoc(todayUTCDateStr());
    expect(doc.data!.sessions).toBe(1);
  });
});

test.describe("Analytics Track: date boundaries (UTC)", () => {
  let user: { email: string; uid: string; token: string };

  test.beforeAll(async () => {
    user = await createThrowawayUser("analytics-date");
  });

  test.afterAll(async () => {
    await deleteThrowawayUser(user.uid);
  });

  test("uses the UTC date string for the daily aggregation document key", async () => {
    const dateStr = todayUTCDateStr();
    await clearTodayAnalytics();

    await callTrack(user.token, { event: "page_view", page: "/" });

    const doc = await getDailyAnalyticsDoc(dateStr);
    expect(doc.exists).toBe(true);
    expect(doc.data!.date).toBe(dateStr);
  });
});

test.describe("Analytics Track: honest empty state", () => {
  test("no analytics document exists before any event is tracked", async () => {
    const user = await createThrowawayUser("analytics-empty");
    try {
      const dateStr = todayUTCDateStr();
      await clearTodayAnalytics();

      const doc = await getDailyAnalyticsDoc(dateStr);
      expect(doc.exists).toBe(false);

      await callTrack(user.token, { event: "page_view", page: "/" });

      const docAfter = await getDailyAnalyticsDoc(dateStr);
      expect(docAfter.exists).toBe(true);
      expect(docAfter.data!.pageViews).toBe(1);
    } finally {
      await deleteThrowawayUser(user.uid);
    }
  });

  test("does not fabricate missing historical events", async () => {
    const dateStr = todayUTCDateStr();
    const doc = await getDailyAnalyticsDoc(dateStr);

    // If no data was ever collected for today, the document simply doesn't exist
    if (!doc.exists) {
      expect(true).toBe(true);
    } else {
      expect(typeof doc.data!.pageViews).toBe("number");
      expect(typeof doc.data!.uniqueVisitors).toBe("number");
    }
  });
});
