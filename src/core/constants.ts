// ──────────────────────────────────────────────
// Scoring defaults and system constants
// ──────────────────────────────────────────────

export const IMPORTANCE_WEIGHTS = {
  base: 0.5,
  recency: 0.1,
  open_loop: 0.3,
  urgency: 0.76,
  dependency: 0.8,
  context: 0.0,
  behavior: 0.0,
} as const;

export const HINT_THRESHOLDS = {
  interruptive: 0.75,
  passive: 0.60,
} as const;

export const HINT_RATE_LIMITS = {
  max_interruptive_per_hour: 1,
  max_hints_per_day: 3,
} as const;

export const RETRIEVAL_DEFAULTS = {
  vector_top_k: 10,
  structured_limit: 10,
  relationship_depth: 1,
  final_candidate_limit: 20,
} as const;

export const RELATIONSHIP_TYPES = [
  "helps_resolve",
  "related_to_existing",
  "new_problem",
  "reference_only",
  "resolved_by",
] as const;

export const FEEDBACK_ACTIONS = [
  "clicked",
  "dismissed",
  "snoozed",
  "acted_on",
  "marked_solved",
] as const;

export const NOTE_STATUSES = [
  "unsolved",
  "in_progress",
  "resolved",
  "reference",
] as const;

// Embedding dimensions — adjust when swapping providers
export const EMBEDDING_DIMENSIONS = 1536;
