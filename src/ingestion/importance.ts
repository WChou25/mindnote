import type {
  ImportanceScorer,
  ImportanceScoringResult,
  NoteMetadata,
  Relationship,
  ImportanceFeatures,
} from "@/core/types";
import { computeFinalScore } from "@/core/scoring";

/**
 * Stage 3: Importance Feature Computation
 * Produces explainable, individual scoring features rather than
 * a single opaque score.
 */
export class DefaultImportanceScorer implements ImportanceScorer {
  score(metadata: NoteMetadata, relationships: Relationship[]): ImportanceScoringResult {
    const trace: Record<string, unknown> = {};

    // Base: unsolved notes start higher
    const base = metadata.status.state === "unsolved" ? 0.6 : 0.3;
    trace.base = { state: metadata.status.state, score: base };

    // Recency: always starts fresh (decays over time in retrieval)
    const recency = 0.1;
    trace.recency = { score: recency, note: "fresh note, no decay yet" };

    // Open loop: unsolved + actionable = strong open loop
    let open_loop = 0;
    if (metadata.status.state === "unsolved") open_loop += 0.2;
    if (metadata.actionability.has_next_step) open_loop += 0.15;
    trace.open_loop = { unsolved: metadata.status.state === "unsolved", actionable: metadata.actionability.has_next_step, score: open_loop };

    // Urgency: from extraction
    const urgency = metadata.urgency.score;
    trace.urgency = { extracted_score: urgency, reason: metadata.urgency.reason };

    // Dependency: from relationship count and weights
    const dependency = relationships.length > 0
      ? Math.min(1, relationships.reduce((sum, r) => sum + r.weight, 0) / relationships.length)
      : 0;
    trace.dependency = { relationship_count: relationships.length, score: dependency };

    // Context & behavior: start at 0, updated by retrieval and feedback
    const context = 0;
    const behavior = 0;

    const features: ImportanceFeatures = {
      base,
      recency,
      open_loop,
      urgency,
      dependency,
      context,
      behavior,
    };

    const final_score = computeFinalScore(features);
    trace.final_score = final_score;

    return { features, final_score, trace };
  }
}
