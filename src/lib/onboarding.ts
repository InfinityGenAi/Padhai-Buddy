import type { UserProfile } from "@/types";

/**
 * Onboarding requires the fields that are mandatory for the learning experience.
 * A username is intentionally optional and must never cause an onboarding loop.
 */
export function profileNeedsOnboarding(
  profile: Pick<UserProfile, "class" | "board"> | null | undefined,
): boolean {
  return !profile?.class || !profile?.board;
}
