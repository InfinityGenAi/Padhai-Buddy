import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { validateProviderConfig, getAllProviders, getProviderConfig, AIProviderId, UserAIConfig } from "@/lib/ai-providers";
import * as crypto from "crypto";

const ENCRYPTION_KEY = process.env.AI_CONFIG_ENCRYPTION_KEY;

function getEffectiveEncryptionKey(): string {
  if (!ENCRYPTION_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AI_CONFIG_ENCRYPTION_KEY must be set in production environment. Generate with: openssl rand -hex 32");
    }
    if (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test") {
      console.warn("[AI-CONFIG] AI_CONFIG_ENCRYPTION_KEY not set. Using ephemeral development key. User AI configs will not persist across restarts.");
      return "ephemeral-dev-key-do-not-use-in-production";
    }
    throw new Error("AI_CONFIG_ENCRYPTION_KEY must be set. Generate with: openssl rand -hex 32");
  }
  return ENCRYPTION_KEY;
}

function encrypt(text: string): string {
  const key = getEffectiveEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", Buffer.from(key.padEnd(32).slice(0, 32)), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encryptedText: string): string {
  try {
    const key = getEffectiveEncryptionKey();
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return "";
    const iv = Buffer.from(parts[0], "hex");
    const authTag = Buffer.from(parts[1], "hex");
    const encrypted = Buffer.from(parts[2], "hex");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      Buffer.from(key.padEnd(32).slice(0, 32)),
      iv
    );
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return "";
  }
}

async function getUserConfig(uid: string): Promise<UserAIConfig | null> {
  if (!adminDb) return null;
  const doc = await adminDb.collection("users").doc(uid).collection("settings").doc("aiConfig").get();
  if (!doc.exists) return null;
const data = doc.data();
    if (!data) return null;
    if (!data.encryptedConfig) return null;
  try {
    const decrypted = decrypt(data.encryptedConfig);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

async function saveUserConfig(uid: string, config: UserAIConfig): Promise<void> {
  if (!adminDb) throw new Error("Database not initialized");
  const encrypted = encrypt(JSON.stringify(config));
  await adminDb.collection("users").doc(uid).collection("settings").doc("aiConfig").set({
    encryptedConfig: encrypted,
    updatedAt: Date.now(),
  });
}

async function deleteUserConfig(uid: string): Promise<void> {
  if (!adminDb) throw new Error("Database not initialized");
  await adminDb.collection("users").doc(uid).collection("settings").doc("aiConfig").delete();
}

export async function GET(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const config = await getUserConfig(decoded.uid);
    const providers = getAllProviders();

    return NextResponse.json({
      config: config ? {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        hasApiKey: !!config.apiKey,
      } : null,
      providers: Object.values(providers),
    });
  } catch (error: unknown) {
    console.error("[AI-CONFIG GET] Error:", error);
    return NextResponse.json({ error: "Failed to load AI config" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const rateLimitResult = await checkRateLimit(`ai-config:${decoded.uid}`);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 },
      );
    }

    let body: { provider?: unknown; apiKey?: unknown; model?: unknown; baseUrl?: unknown; testOnly?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { provider, apiKey, model, baseUrl, testOnly } = body;

    if (!provider || !apiKey || !model) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const providerStr = provider as string;
    if (!/^(groq|openai|gemini|anthropic|openai-compatible)$/.test(providerStr)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    const providerId: AIProviderId = providerStr as AIProviderId;

    const providerConfig = getProviderConfig(providerId);
    if (!providerConfig) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    if (providerConfig.requiresApiKey && !String(apiKey).trim()) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    if (providerConfig.supportsCustomBaseUrl && baseUrl) {
      try {
        new URL(String(baseUrl));
      } catch {
        return NextResponse.json({ error: "Invalid base URL" }, { status: 400 });
      }
    }

    const config: UserAIConfig = {
      provider: providerId,
      apiKey: String(apiKey),
      model: String(model),
      baseUrl: baseUrl ? String(baseUrl) : undefined,
      updatedAt: Date.now(),
    };

    const validation = await validateProviderConfig(config.provider as AIProviderId, config as UserAIConfig);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid configuration" }, { status: 400 });
    }

    if (!testOnly) {
      await saveUserConfig(decoded.uid, config);
    }

    return NextResponse.json({
      success: true,
      message: testOnly ? "Configuration validated successfully" : "Configuration saved",
    });
  } catch (error: unknown) {
    console.error("[AI-CONFIG POST] Error:", error);
    return NextResponse.json({ error: "Failed to save AI config" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb || initializationError) {
      return NextResponse.json({ error: "Server not initialized" }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    await deleteUserConfig(decoded.uid);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[AI-CONFIG DELETE] Error:", error);
    return NextResponse.json({ error: "Failed to delete AI config" }, { status: 500 });
  }
}