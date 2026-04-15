import { v4 as uuid } from "uuid";
import type { Hint, HintDecision, Note, CandidateMemory } from "@/core/types";
import { computeCandidateScore } from "@/core/scoring";
import { determineHintLevel, checkRateLimits } from "./policy";
import { chooseHintType, composeHintContent } from "./compose";
import { getNoteById, insertHintEvent } from "@/db/queries";
import { log } from "@/observability/logger";

/**
 * Full hinting pipeline:
 * Candidates → Rank → Policy Check → Compose Hint → Log Event
 */
export async function generateHint(
  userId: string,
  candidates: CandidateMemory[],
  context: Record<string, unknown>,
  recentHints: { level: string; timestamp: string }[] = []
): Promise<HintDecision> {
  const trace: Record<string, unknown> = {};

  if (candidates.length === 0) {
    return { hint: null, reason: "no candidates", candidates_evaluated: 0, trace };
  }

  // Sort candidates by score
  const ranked = [...candidates].sort(
    (a, b) => computeCandidateScore(b) - computeCandidateScore(a)
  );
  trace.top_scores = ranked.slice(0, 5).map((c) => ({
    note_id: c.note_id,
    score: computeCandidateScore(c),
  }));

  const topCandidate = ranked[0];
  const score = computeCandidateScore(topCandidate);
  const level = determineHintLevel(score);
  trace.level = level;
  trace.score = score;

  if (level === "none") {
    return {
      hint: null,
      reason: `score ${score.toFixed(2)} below passive threshold`,
      candidates_evaluated: ranked.length,
      trace,
    };
  }

  // Rate limit check
  const rateCheck = checkRateLimits(
    recentHints as { level: "interruptive" | "passive" | "none"; timestamp: string }[]
  );
  trace.rate_limit = rateCheck;

  if (!rateCheck.allowed) {
    return {
      hint: null,
      reason: `rate limited: ${rateCheck.reason}`,
      candidates_evaluated: ranked.length,
      trace,
    };
  }

  // Fetch the full note
  const note = await getNoteById(topCandidate.note_id);
  if (!note) {
    return {
      hint: null,
      reason: "top candidate note not found in DB",
      candidates_evaluated: ranked.length,
      trace,
    };
  }

  // Choose type and compose
  const hintType = chooseHintType(note);
  const content = composeHintContent(note, hintType);

  const hint: Hint = {
    id: uuid(),
    note_id: note.id,
    type: hintType,
    level,
    content,
    score,
    score_breakdown: {
      semantic_similarity: topCandidate.semantic_similarity,
      project_match: topCandidate.project_match,
      entity_match: topCandidate.entity_match,
      open_loop: topCandidate.open_loop,
      urgency: topCandidate.urgency,
      dependency: topCandidate.dependency,
      context_match: topCandidate.context_match,
      behavior_prior: topCandidate.behavior_prior,
    },
  };

  // Log the hint event
  await insertHintEvent({
    user_id: userId,
    trigger_type: (context.trigger as string) ?? "manual",
    context,
    candidate_note_ids: ranked.map((c) => c.note_id),
    selected_note_id: note.id,
    selected_hint_type: hintType,
    score_breakdown: hint.score_breakdown,
    action_taken: null,
  });

  log("hinting.generated", { hint_id: hint.id, type: hintType, level, score, ...trace });

  return {
    hint,
    reason: `score ${score.toFixed(2)} → ${level} hint`,
    candidates_evaluated: ranked.length,
    trace,
  };
}
