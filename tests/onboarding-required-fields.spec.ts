import { expect, test } from "@playwright/test";
import { profileNeedsOnboarding } from "../src/lib/onboarding";

test.describe("Onboarding required fields", () => {
  test("requires class and board when the profile is missing", () => {
    expect(profileNeedsOnboarding(null)).toBe(true);
    expect(profileNeedsOnboarding(undefined)).toBe(true);
    expect(profileNeedsOnboarding({})).toBe(true);
    expect(profileNeedsOnboarding({ class: 10 })).toBe(true);
    expect(profileNeedsOnboarding({ board: "CBSE" })).toBe(true);
  });

  test("does not require an optional username after class and board are set", () => {
    expect(profileNeedsOnboarding({ class: 10, board: "CBSE" })).toBe(false);
    expect(profileNeedsOnboarding({ class: 12, board: "State Board" })).toBe(false);
  });
});
