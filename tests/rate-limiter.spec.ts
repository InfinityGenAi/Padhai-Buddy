import { expect, test } from "@playwright/test";
import { checkRateLimit } from "../src/lib/rate-limiter";

test.describe("Atomic rate limiter", () => {
  test("does not allow concurrent requests to exceed the configured maximum", async () => {
    const key = `rate-limit-concurrency:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const maximum = 5;

    const results = await Promise.all(
      Array.from({ length: 30 }, () => checkRateLimit(key, maximum)),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(maximum);
    expect(results.filter((result) => !result.allowed)).toHaveLength(30 - maximum);
    expect(results.filter((result) => !result.allowed).every(
      (result) => (result.retryAfter || 0) > 0,
    )).toBe(true);
  });

  test("independent identifiers have independent budgets", async () => {
    const firstKey = `rate-limit-independent-a:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const secondKey = `rate-limit-independent-b:${Date.now()}:${Math.random().toString(36).slice(2)}`;

    const first = await Promise.all(
      Array.from({ length: 4 }, () => checkRateLimit(firstKey, 3)),
    );
    const second = await Promise.all(
      Array.from({ length: 4 }, () => checkRateLimit(secondKey, 3)),
    );

    expect(first.filter((result) => result.allowed)).toHaveLength(3);
    expect(second.filter((result) => result.allowed)).toHaveLength(3);
  });
});
