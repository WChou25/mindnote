import type { HintLevel } from "@/core/types";
import { HINT_THRESHOLDS, HINT_RATE_LIMITS } from "@/core/constants";

/**
 * Determine hint level based on score thresholds.
 */
export function determineHintLevel(score: number): HintLevel {
  if (score >= HINT_THRESHOLDS.interruptive) return "interruptive";
  if (score >= HINT_THRESHOLDS.passive) return "passive";
  return "none";
}

/**
 * Check whether a hint is allowed given recent hint history.
 * Returns { allowed, reason }.
 */
export function checkRateLimits(
  recentHints: { level: HintLevel; timestamp: string }[]
): { allowed: boolean; reason: string } {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const interruptiveLastHour = recentHints.filter(
    (h) => h.level === "interruptive" && new Date(h.timestamp).getTime() > oneHourAgo
  ).length;

  const totalToday = recentHints.filter(
    (h) => h.level !== "none" && new Date(h.timestamp).getTime() > oneDayAgo
  ).length;

  if (interruptiveLastHour >= HINT_RATE_LIMITS.max_interruptive_per_hour) {
    return { allowed: false, reason: `interruptive limit: ${interruptiveLastHour} in last hour` };
  }

  if (totalToday >= HINT_RATE_LIMITS.max_hints_per_day) {
    return { allowed: false, reason: `daily limit: ${totalToday} hints today` };
  }

  return { allowed: true, reason: "within rate limits" };
}
