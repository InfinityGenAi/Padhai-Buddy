const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const PROJECT_ID = "infinity-gen-ai";
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

function startEmulators() {
  return new Promise((resolve, reject) => {
    const firebaseBin = path.resolve("node_modules/.bin/firebase");
    let cmd;
    let args;
    if (isWindows) {
      cmd = `"${firebaseBin}.cmd"`;
      args = ["emulators:start", "--only", `auth:${AUTH_PORT},firestore:${FIRESTORE_PORT}`, "--project", PROJECT_ID];
    } else {
      cmd = firebaseBin;
      args = ["emulators:start", "--only", `auth:${AUTH_PORT},firestore:${FIRESTORE_PORT}`, "--project", PROJECT_ID];
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

  console.log("[test-server] Starting Next.js dev server...");
  const nextCmd = isWindows ? "npm.cmd" : "npm";
  const next = spawn(nextCmd, ["run", "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
    env: {
      ...process.env,
      NEXT_PUBLIC_USE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: `localhost:${AUTH_PORT}`,
      NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST: `localhost:${FIRESTORE_PORT}`,
      FIRESTORE_EMULATOR_HOST: `localhost:${FIRESTORE_PORT}`,
      FIREBASE_AUTH_EMULATOR_HOST: `localhost:${AUTH_PORT}`,
    },
  });

  next.on("error", (err) => {
    console.error("[test-server] Next.js error:", err);
    process.exit(1);
  });

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
