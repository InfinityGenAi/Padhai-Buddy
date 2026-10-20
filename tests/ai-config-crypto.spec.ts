import * as crypto from "node:crypto";
import { expect, test } from "@playwright/test";
import { decryptAiConfig, encryptAiConfig } from "../src/lib/ai-config-crypto";

const KEY_HEX = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const ENVIRONMENT = "test";

function legacyEncrypt(plaintext: string, keyHex: string): string {
  // Match the pre-fix implementation: first 32 ASCII characters and a 16-byte IV.
  const key = Buffer.from(keyHex.slice(0, 32), "utf8");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted.toString("hex")}`;
}

test.describe("AI config encryption", () => {
  test("round-trips ciphertext using all 32 bytes of the documented hex key", () => {
    const plaintext = JSON.stringify({ provider: "openai", apiKey: "secret-value" });
    const encrypted = encryptAiConfig(plaintext, KEY_HEX, ENVIRONMENT);

    expect(encrypted.split(":")[0]).toHaveLength(24); // 12-byte GCM IV
    expect(decryptAiConfig(encrypted, KEY_HEX, ENVIRONMENT)).toBe(plaintext);
    expect(encrypted).not.toContain("secret-value");
  });

  test("continues to decrypt legacy configs using the old key derivation and 16-byte IV", () => {
    const plaintext = JSON.stringify({ provider: "groq", apiKey: "existing-config" });
    const encrypted = legacyEncrypt(plaintext, KEY_HEX);

    expect(encrypted.split(":")[0]).toHaveLength(32); // legacy 16-byte IV
    expect(decryptAiConfig(encrypted, KEY_HEX, ENVIRONMENT)).toBe(plaintext);
  });

  test("returns an empty value for malformed or tampered ciphertext", () => {
    expect(decryptAiConfig("not:a-ciphertext", KEY_HEX, ENVIRONMENT)).toBe("");
    const encrypted = encryptAiConfig("sensitive", KEY_HEX, ENVIRONMENT);
    const parts = encrypted.split(":");
    parts[2] = `${parts[2]}00`;
    expect(decryptAiConfig(parts.join(":"), KEY_HEX, ENVIRONMENT)).toBe("");
  });
});
