import type { CandidateMemory, Note, RetrievalSource } from "@/core/types";
import { computeCandidateScore } from "@/core/scoring";
import { getUserWeight } from "@/db/queries";

/**
 * Merge candidates from multiple retrieval channels into a
 * unified ranked list with explainable scoring inputs.
 */
export async function mergeCandidates(
  userId: string,
  vectorNotes: Note[],
  structuredNotes: Note[],
  relationshipNotes: Note[],
  queryMetadata: {
    topics?: string[];
    entities?: string[];
    project?: string;
  },
  context: Record<string, unknown>
): Promise<CandidateMemory[]> {
  const candidateMap = new Map<string, CandidateMemory>();

  // Helper to get or init a candidate
  const getCandidate = (noteId: string): CandidateMemory => {
    if (!candidateMap.has(noteId)) {
      candidateMap.set(noteId, {
        note_id: noteId,
        retrieval_sources: [],
        semantic_similarity: 0,
        project_match: 0,
        entity_match: 0,
        open_loop: 0,
        urgency: 0,
        dependency: 0,
        context_match: 0,
        behavior_prior: 0,
      });
    }
    return candidateMap.get(noteId)!;
  };

  // Vector channel
  for (const note of vectorNotes) {
    const c = getCandidate(note.id);
    c.retrieval_sources.push("vector");
    // similarity score comes from the DB query; approximate from importance
    c.semantic_similarity = 0.7; // placeholder — real score comes from match_notes RPC
    populateFromNote(c, note, queryMetadata);
  }

  // Structured channel
  for (const note of structuredNotes) {
    const c = getCandidate(note.id);
    if (!c.retrieval_sources.includes("structured")) {
      c.retrieval_sources.push("structured");
    }
    populateFromNote(c, note, queryMetadata);
  }

  // Relationship channel
  for (const note of relationshipNotes) {
    const c = getCandidate(note.id);
    if (!c.retrieval_sources.includes("relationship")) {
      c.retrieval_sources.push("relationship");
    }
    c.dependency = Math.max(c.dependency, 0.6);
    populateFromNote(c, note, queryMetadata);
  }

  // Add behavior priors from user weights
  for (const [, candidate] of candidateMap) {
    const topicKey = queryMetadata.topics?.[0] ?? "general";
    const projectKey = queryMetadata.project ?? "none";
    const contextKey = (context.type as string) ?? "general";
    candidate.behavior_prior = await getUserWeight(userId, contextKey, topicKey, projectKey);
  }

  // Sort by composite score
  const candidates = Array.from(candidateMap.values());
  candidates.sort((a, b) => computeCandidateScore(b) - computeCandidateScore(a));

  return candidates;
}

function populateFromNote(
  candidate: CandidateMemory,
  note: Note,
  queryMetadata: { topics?: string[]; entities?: string[]; project?: string }
): void {
  // Project match
  if (
    queryMetadata.project &&
    note.metadata.project?.primary === queryMetadata.project
  ) {
    candidate.project_match = 1;
  }

  // Entity match
  if (queryMetadata.entities?.length) {
    const noteEntityValues = note.metadata.entities.map((e) => e.value.toLowerCase());
    const matches = queryMetadata.entities.filter((e) =>
      noteEntityValues.includes(e.toLowerCase())
    );
    candidate.entity_match = matches.length > 0 ? 1 : 0;
  }

  // Open loop
  if (note.metadata.status.state === "unsolved") {
    candidate.open_loop = 1;
  }

  // Urgency
  candidate.urgency = Math.max(candidate.urgency, note.metadata.urgency.score);

  // Context match (basic topic overlap)
  if (queryMetadata.topics?.length) {
    const overlap = queryMetadata.topics.filter((t) =>
      note.metadata.topics.includes(t)
    );
    candidate.context_match = Math.min(1, overlap.length / queryMetadata.topics.length);
  }
}
