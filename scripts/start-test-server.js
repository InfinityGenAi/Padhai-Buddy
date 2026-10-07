const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

// Set default emulator environment variables (fixed ports for test environment)
// These are used as fallbacks if not provided by Playwright's webServer.env
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080";
process.env.FIREBASE_ADMIN_PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID || "test-project";
process.env.NEXT_PUBLIC_USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS || "true";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099";
process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost:8080";
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "test";
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "test.firebaseapp.com";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-project";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "test-project.appspot.com";
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789";
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef";
process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX";
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || "test-groq-key";

// Debug: Log environment variables at startup
console.log("[test-server] Startup env vars:");
console.log("[test-server] FIREBASE_AUTH_EMULATOR_HOST:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
console.log("[test-server] FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);
console.log("[test-server] FIREBASE_ADMIN_PROJECT_ID:", process.env.FIREBASE_ADMIN_PROJECT_ID);
console.log("[test-server] NEXT_PUBLIC_USE_EMULATORS:", process.env.NEXT_PUBLIC_USE_EMULATORS);

const PROJECT_ID = process.env.FIREBASE_ADMIN_PROJECT_ID || "test-project";
const AUTH_PORT = 9099;
const FIRESTORE_PORT = 8080;
const NEXTJS_PORT = 3000;

const isWindows = process.platform === "win32";
const root = path.resolve(__dirname, "..");

function waitForPort(port, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}`, () => {
        clearInterval(interval);
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for port ${port}`));
        }
      });
      req.setTimeout(1000);
    }, 500);
  });
}

function waitForNextJsReady(port, timeoutMs = 300000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      const req = http.get(`http://localhost:${port}/login`, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          // Check if the server is responding with a valid HTML page (not an error)
          // The page uses Suspense with a "Loading..." fallback, so the initial HTML
          // will contain "Loading..." but the actual form is rendered client-side.
          // We consider the server ready if it returns a 200 OK with HTML content.
          if (res.statusCode === 200 && data.includes('<!DOCTYPE html>')) {
            clearInterval(interval);
            resolve();
          }
        });
      });
      req.on("error", () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timeout waiting for Next.js to be ready on port ${port}`));
        }
      });
      req.setTimeout(5000);
    }, 1000);
  });
}

function startEmulators() {
  return new Promise((resolve, reject) => {
    const firebaseBin = path.resolve("node_modules/.bin/firebase");
    let cmd;
    let args;
    if (isWindows) {
      cmd = `"${firebaseBin}.cmd"`;
      args = ["emulators:start", "--only", `auth:${AUTH_PORT},firestore:${FIRESTORE_PORT}`];
    } else {
      cmd = firebaseBin;
      args = ["emulators:start", "--only", `auth:${AUTH_PORT},firestore:${FIRESTORE_PORT}`];
    }
    const emulator = spawn(cmd, args, {
      cwd: root,
      stdio: "pipe",
      shell: isWindows,
      env: { ...process.env },
    });

    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.log("[test-server] Emulator startup timeout, proceeding anyway");
        resolve(emulator);
      }
    }, 90000);

    emulator.stdout.on("data", (data) => {
      const text = data.toString();
      console.log("[Emulator] " + text.trim());
      if (text.includes("All emulators ready") || text.includes("Emulator started")) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          resolve(emulator);
        }
      }
    });

    emulator.stderr.on("data", (data) => {
      console.error("[Emulator] " + data.toString().trim());
    });

    emulator.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    emulator.on("exit", (code) => {
      if (!resolved && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Emulator exited with code ${code}`));
      }
    });
  });
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, () => resolve(true));
    req.on("error", () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const authInUse = await isPortInUse(AUTH_PORT);
  const firestoreInUse = await isPortInUse(FIRESTORE_PORT);
  const nextInUse = await isPortInUse(NEXTJS_PORT);
  
  if (!authInUse || !firestoreInUse) {
    console.log("[test-server] Starting Firebase emulators...");
    const emulator = await startEmulators();
    console.log("[test-server] Emulators started");
    
    process.on("exit", () => emulator.kill("SIGTERM"));
  } else {
    console.log("[test-server] Emulators already running, skipping");
  }
  
  if (nextInUse) {
    console.log("[test-server] Next.js already running on port 3000, keeping alive...");
    setInterval(() => {}, 1000);
    return;
  }
  
  console.log("[test-server] Starting Next.js dev server (webpack mode)...");
  // Debug: log key environment variables
  console.log("[test-server] FIREBASE_AUTH_EMULATOR_HOST:", process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log("[test-server] FIRESTORE_EMULATOR_HOST:", process.env.FIRESTORE_EMULATOR_HOST);
  console.log("[test-server] FIREBASE_ADMIN_PROJECT_ID:", process.env.FIREBASE_ADMIN_PROJECT_ID);
  console.log("[test-server] NEXT_PUBLIC_USE_EMULATORS:", process.env.NEXT_PUBLIC_USE_EMULATORS);
  
  // Pass all environment variables to the Next.js child process
  // Playwright's webServer.env sets these on the start-test-server.js process
  const next = spawn(
    isWindows ? "cmd.exe" : "npm",
    isWindows ? ["/c", "npm", "run", "dev", "--", "--webpack"] : ["run", "dev", "--", "--webpack"],
    {
      cwd: root,
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
        // Ensure emulator environment variables are passed through
        FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099",
        FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || "localhost:8080",
        FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID || "test-project",
        NEXT_PUBLIC_USE_EMULATORS: process.env.NEXT_PUBLIC_USE_EMULATORS || "true",
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST || "localhost:9099",
        NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || "localhost:8080",
        NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "test",
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "test.firebaseapp.com",
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "test-project",
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "test-project.appspot.com",
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
        NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef",
        NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-XXXXXXXXXX",
        GROQ_API_KEY: process.env.GROQ_API_KEY || "test-groq-key",
      },
    },
  );

  next.on("error", (err) => {
    console.error("[test-server] Next.js error:", err);
    process.exit(1);
  });

  // Wait for Next.js to be fully ready (compiled and serving pages)
  console.log("[test-server] Waiting for Next.js to be ready...");
  await waitForNextJsReady(NEXTJS_PORT);
  console.log("[test-server] Next.js is ready!");

  const shutdown = () => {
    console.log("\n[test-server] Shutting down Next.js...");
    next.kill("SIGTERM");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  process.on("exit", shutdown);
}

main().catch((err) => {
  console.error("[test-server] Fatal error:", err);
  process.exit(1);
});
