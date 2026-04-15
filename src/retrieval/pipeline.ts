import type { CandidateMemory, Note, RetrieveResponse } from "@/core/types";
import { RETRIEVAL_DEFAULTS } from "@/core/constants";
import { retrieveByVector } from "./vector";
import { retrieveByStructured } from "./structured";
import { expandRelationships } from "./relationship-expand";
import { mergeCandidates } from "./merge";
import { getNoteById } from "@/db/queries";
import { HeuristicExtractor } from "@/ingestion/extract";
import { log } from "@/observability/logger";

/**
 * Full retrieval pipeline:
 * Context → Vector Search + Structured Search + Relationship Expansion → Merge → Rank
 */
export async function retrieveMemories(
  userId: string,
  query: string,
  context: Record<string, unknown> = {},
  limit: number = RETRIEVAL_DEFAULTS.final_candidate_limit
): Promise<RetrieveResponse> {
  const trace: Record<string, unknown> = {};

  // Extract query metadata for structured search
  const extractor = new HeuristicExtractor();
  const { metadata: queryMetadata } = await extractor.extract(query, query);
  trace.query_metadata = {
    topics: queryMetadata.topics,
    entities: queryMetadata.entities.map((e) => e.value),
  };

  // Channel 1: Vector search
  const { notes: vectorNotes } = await retrieveByVector(
    userId,
    query,
    RETRIEVAL_DEFAULTS.vector_top_k
  );
  trace.vector_results = vectorNotes.length;

  // Channel 2: Structured search
  const structuredNotes = await retrieveByStructured(
    userId,
    {
      topics: queryMetadata.topics,
      entities: queryMetadata.entities.map((e) => e.value),
      project: queryMetadata.project?.primary,
      status: "unsolved",
    },
    RETRIEVAL_DEFAULTS.structured_limit
  );
  trace.structured_results = structuredNotes.length;

  // Channel 3: Relationship expansion from vector+structured hits
  const seedIds = [
    ...vectorNotes.map((n) => n.id),
    ...structuredNotes.map((n) => n.id),
  ];
  const relationshipNotes = await expandRelationships(
    [...new Set(seedIds)],
    RETRIEVAL_DEFAULTS.relationship_depth
  );
  trace.relationship_results = relationshipNotes.length;

  // Merge and rank
  const candidates = await mergeCandidates(
    userId,
    vectorNotes,
    structuredNotes,
    relationshipNotes,
    {
      topics: queryMetadata.topics,
      entities: queryMetadata.entities.map((e) => e.value),
      project: queryMetadata.project?.primary,
    },
    context
  );

  // Trim to limit
  const topCandidates = candidates.slice(0, limit);
  trace.final_candidates = topCandidates.length;

  // Fetch full notes for the top candidates
  const notes: Note[] = [];
  for (const c of topCandidates) {
    const note = await getNoteById(c.note_id);
    if (note) notes.push(note);
  }

  log("retrieval.complete", trace);

  return { candidates: topCandidates, notes };
}
