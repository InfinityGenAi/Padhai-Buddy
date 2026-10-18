import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";

const USERNAME_REGEX = /^[a-z0-9._]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "api",
  "www",
  "mail",
  "email",
  "contact",
  "privacy",
  "terms",
  "about",
  "blog",
  "docs",
  "status",
  "login",
  "signup",
  "signin",
  "logout",
  "auth",
  "dashboard",
  "profile",
  "settings",
  "padhai",
  "padhaibuddy",
  "system",
  "null",
  "undefined",
  "true",
  "false",
]);

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: initializationError || "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!adminDb || !adminAuth) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }
    const db = adminDb;
    const auth = adminAuth;

    let decoded;
    try {
      decoded = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    let body: { name?: string; class?: unknown; board?: unknown; photoURL?: unknown; username?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { name, class: studentClass, board, photoURL, username } = body;

    if (!name || !studentClass || !board) {
      return NextResponse.json({ error: "Name, class, and board are required" }, { status: 400 });
    }

    const nameStr = String(name).trim();
    if (nameStr.length < 2 || nameStr.length > 50) {
      return NextResponse.json({ error: "Name must be between 2 and 50 characters" }, { status: 400 });
    }

    const classNum = Number(studentClass);
    if (!Number.isInteger(classNum) || classNum < 5 || classNum > 12) {
      return NextResponse.json({ error: "Class must be between 5 and 12" }, { status: 400 });
    }

    const boardStr = String(board);
    const validBoards = ["CBSE", "ICSE", "State Board"];
    if (!validBoards.includes(boardStr)) {
      return NextResponse.json({ error: "Invalid board value" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      name: nameStr,
      class: classNum,
      board: boardStr,
    };

    if (photoURL !== undefined && photoURL !== null && String(photoURL).trim() !== "") {
      const url = String(photoURL).trim();
      if (url.length > 2048) {
        return NextResponse.json({ error: "Photo URL is too long" }, { status: 400 });
      }
      try {
        new URL(url);
      } catch {
        return NextResponse.json({ error: "Photo URL must be a valid URL" }, { status: 400 });
      }
      updates.photoURL = url;
    }

    // Handle username update atomically
    if (username !== undefined) {
      const normalizedUsername = String(username).toLowerCase().trim();

      if (normalizedUsername !== "") {
        if (!USERNAME_REGEX.test(normalizedUsername)) {
          return NextResponse.json({ error: "Invalid username format" }, { status: 400 });
        }

        if (RESERVED_USERNAMES.has(normalizedUsername)) {
          return NextResponse.json({ error: "Username is reserved" }, { status: 409 });
        }

        const uid = decoded.uid;
        const usernameRef = adminDb.doc("usernameMappings/" + normalizedUsername);
        const userRef = adminDb.doc("users/" + uid);

        try {
          await adminDb.runTransaction(async (transaction) => {
            const usernameSnap = await transaction.get(usernameRef);
            const userSnap = await transaction.get(userRef);

            if (!userSnap.exists) {
              throw new Error("User profile not found");
            }

            const userData = userSnap.data() as { username?: string } | undefined;

            // If user already has this username, it's idempotent success
            if (userData?.username === normalizedUsername) {
              return;
            }

            // If username mapping exists and belongs to a different user, fail
            if (usernameSnap.exists) {
              const existingData = usernameSnap.data() as { uid: string } | undefined;
              if (existingData?.uid !== uid) {
                throw new Error("USERNAME_TAKEN");
              }
            }

            // Release old username mapping if exists
            const oldUsername = userData?.username;
            if (oldUsername && oldUsername !== normalizedUsername) {
              const oldRef = db.doc("usernameMappings/" + oldUsername.toLowerCase());
              const oldSnap = await transaction.get(oldRef);
              if (oldSnap.exists) {
                const oldData = oldSnap.data() as { uid: string } | undefined;
                if (oldData?.uid === uid) {
                  transaction.delete(oldRef);
                }
              }
            }

            // Claim the new username
            transaction.set(usernameRef, {
              uid,
              claimedAt: Date.now(),
              updatedAt: Date.now(),
            });

            // Update user profile
            transaction.update(userRef, { username: normalizedUsername });
            updates.username = normalizedUsername;
          });
        } catch (txErr: unknown) {
          const msg = txErr instanceof Error ? txErr.message : "Transaction failed";
          if (msg === "USERNAME_TAKEN") {
            return NextResponse.json({ error: "Username already taken" }, { status: 409 });
          }
          throw txErr;
        }
      } else {
        // Empty string means remove username
        const uid = decoded.uid;
        const userSnap = await db.collection("users").doc(uid).get();
        if (userSnap.exists) {
          const userData = userSnap.data() as { username?: string } | undefined;
          if (userData?.username) {
            const oldRef = db.doc("usernameMappings/" + userData.username.toLowerCase());
            const oldSnap = await db.doc("usernameMappings/" + userData.username.toLowerCase()).get();
            if (oldSnap.exists) {
              const oldData = oldSnap.data() as { uid: string } | undefined;
              if (oldData?.uid === uid) {
                await oldRef.delete();
              }
            }
          }
          updates.username = null;
        }
      }
    }

    await db.collection("users").doc(decoded.uid).update(updates);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
