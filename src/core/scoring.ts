import type { ImportanceFeatures } from "./types";

/**
 * Compute final importance score from individual features.
 * Simple additive formula — no large multipliers per the blueprint.
 * Each feature is already 0-1 normalized.
 */
export function computeFinalScore(features: ImportanceFeatures): number {
  const raw =
    features.base +
    features.recency +
    features.open_loop +
    features.urgency +
    features.dependency +
    features.context +
    features.behavior;

  // Normalize to 0-1 (max possible raw = 7 if all features at 1.0)
  return Math.min(1, Math.max(0, raw / 7));
}

/**
 * Compute a candidate ranking score from retrieval signals.
 * Weights can be tuned over time.
 */
export function computeCandidateScore(candidate: {
  semantic_similarity: number;
  project_match: number;
  entity_match: number;
  open_loop: number;
  urgency: number;
  dependency: number;
  context_match: number;
  behavior_prior: number;
}): number {
  return (
    candidate.semantic_similarity * 0.25 +
    candidate.project_match * 0.15 +
    candidate.entity_match * 0.15 +
    candidate.open_loop * 0.15 +
    candidate.urgency * 0.10 +
    candidate.dependency * 0.10 +
    candidate.context_match * 0.05 +
    candidate.behavior_prior * 0.05
  );
}
