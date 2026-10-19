import { expect, test } from "@playwright/test";
import { assertSafeProviderBaseUrl } from "../src/lib/ai-providers/safe-url";

test.describe("Custom AI provider URL safety", () => {
  test("rejects loopback and private IPv4 addresses in production", async () => {
    await expect(
      assertSafeProviderBaseUrl("https://127.0.0.1:11434/v1", "production"),
    ).rejects.toThrow(/public IP address/);
    await expect(
      assertSafeProviderBaseUrl("https://10.0.0.12/v1", "production"),
    ).rejects.toThrow(/public IP address/);
    await expect(
      assertSafeProviderBaseUrl("https://192.168.1.10/v1", "production"),
    ).rejects.toThrow(/public IP address/);
  });

  test("rejects link-local metadata and internal hostnames", async () => {
    await expect(
      assertSafeProviderBaseUrl("http://169.254.169.254/latest/meta-data/", "production"),
    ).rejects.toThrow(/HTTPS/);
    await expect(
      assertSafeProviderBaseUrl("https://metadata.google.internal/computeMetadata/v1/", "production"),
    ).rejects.toThrow(/restricted host/);
    await expect(
      assertSafeProviderBaseUrl("https://service.internal/v1", "production"),
    ).rejects.toThrow(/restricted host/);
  });

  test("requires HTTPS in production", async () => {
    await expect(
      assertSafeProviderBaseUrl("http://api.example.com/v1", "production"),
    ).rejects.toThrow(/HTTPS/);
  });

  test("continues to allow local AI endpoints during development", async () => {
    await expect(
      assertSafeProviderBaseUrl("http://127.0.0.1:11434/v1", "development"),
    ).resolves.toBeUndefined();
  });
});
