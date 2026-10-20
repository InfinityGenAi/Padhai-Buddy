import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, initializationError } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limiter";
import { validateProviderConfig, getAllProviders, getProviderConfig, fetchModels, AIProviderId, UserAIConfig } from "@/lib/ai-providers";
import { encryptAiConfig, decryptAiConfig } from "@/lib/ai-config-crypto";

async function getUserConfig(uid: string): Promise<UserAIConfig | null> {
  if (!adminDb) return null;
  const doc = await adminDb.collection("users").doc(uid).collection("settings").doc("aiConfig").get();
  if (!doc.exists) return null;
const data = doc.data();
    if (!data) return null;
    if (!data.encryptedConfig) return null;
  try {
    const decrypted = decryptAiConfig(data.encryptedConfig);
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

async function saveUserConfig(uid: string, config: UserAIConfig): Promise<void> {
  if (!adminDb) throw new Error("Database not initialized");
  const encrypted = encryptAiConfig(JSON.stringify(config));
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

    if (typeof provider !== "string" || !provider.trim()) {
      return NextResponse.json({ error: "Provider is required" }, { status: 400 });
    }
    if (!/^(groq|openai|gemini|anthropic|openai-compatible)$/.test(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }
    if (typeof model !== "string" || !model.trim()) {
      return NextResponse.json({ error: "Model is required" }, { status: 400 });
    }
    if (apiKey !== undefined && apiKey !== null && typeof apiKey !== "string") {
      return NextResponse.json({ error: "API key must be a string" }, { status: 400 });
    }
    if (baseUrl !== undefined && baseUrl !== null && typeof baseUrl !== "string") {
      return NextResponse.json({ error: "Base URL must be a string" }, { status: 400 });
    }

    const providerId = provider as AIProviderId;
    const providerConfig = getProviderConfig(providerId);
    if (!providerConfig) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    // Never send stored keys back to the browser. For the currently configured
    // provider, an empty API-key field means "keep the existing key" so a user
    // can change model/settings without copying the secret out of the server.
    const existingConfig = await getUserConfig(decoded.uid);
    const sameProviderConfig =
      existingConfig?.provider === providerId && existingConfig.apiKey.trim()
        ? existingConfig
        : null;
    const submittedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
    const resolvedApiKey = submittedApiKey || sameProviderConfig?.apiKey || "";

    if (providerConfig.requiresApiKey && !resolvedApiKey) {
      return NextResponse.json(
        { error: "Enter an API key for this provider, or keep the current provider selected to reuse its saved key." },
        { status: 400 },
      );
    }

    let resolvedBaseUrl: string | undefined;
    if (typeof baseUrl === "string") {
      resolvedBaseUrl = baseUrl.trim() || undefined;
    } else {
      // When the field is omitted, preserve a saved custom endpoint for the
      // same provider. An explicit empty string clears it.
      resolvedBaseUrl = sameProviderConfig?.baseUrl;
    }

    if (providerConfig.supportsCustomBaseUrl && resolvedBaseUrl) {
      try {
        new URL(resolvedBaseUrl);
      } catch {
        return NextResponse.json({ error: "Invalid base URL" }, { status: 400 });
      }
    }

    const config: UserAIConfig = {
      provider: providerId,
      apiKey: resolvedApiKey,
      model: model.trim(),
      baseUrl: resolvedBaseUrl,
      updatedAt: Date.now(),
    };

    const validation = await validateProviderConfig(config.provider as AIProviderId, config as UserAIConfig);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Invalid configuration" }, { status: 400 });
    }

    let models: string[] = [];
    if (testOnly) {
      try {
        models = await fetchModels(providerId, config.apiKey, config.baseUrl);
      } catch {
        // The provider's credential validation already passed. If its model
        // catalog is unavailable, keep the configured model and still report
        // the connection result instead of leaking provider SDK internals.
        models = providerConfig.availableModels || [];
      }
    } else {
      await saveUserConfig(decoded.uid, config);
    }

    return NextResponse.json({
      success: true,
      message: testOnly ? "Configuration validated successfully" : "Configuration saved",
      ...(testOnly ? { models } : {}),
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