import { expect, test } from "@playwright/test";
import { getClientIp } from "../src/lib/client-ip";

test.describe("Trusted client IP extraction", () => {
  test("prefers the platform-provided x-real-ip over forwarded client values", () => {
    const headers = new Headers({
      "x-real-ip": "203.0.113.44",
      "x-forwarded-for": "198.51.100.20, 203.0.113.44",
    });

    expect(getClientIp({ headers })).toBe("203.0.113.44");
  });

  test("uses the rightmost forwarded value when x-real-ip is missing", () => {
    const headers = new Headers({
      "x-forwarded-for": "198.51.100.20, 203.0.113.44",
    });

    expect(getClientIp({ headers })).toBe("203.0.113.44");
  });

  test("falls back safely when proxy IP headers are absent", () => {
    expect(getClientIp({ headers: new Headers() })).toBe("unknown");
  });
});
