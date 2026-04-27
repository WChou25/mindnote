import { v4 as uuid } from "uuid";
import type { Note, IngestResponse } from "@/core/types";
import { DefaultNormalizer } from "./normalize";
import { HeuristicExtractor } from "./extract";
import { generateEmbedding } from "./embed";
import { HeuristicRelationshipDetector } from "./relationships";
import { DefaultImportanceScorer } from "./importance";
import { getActiveNotes, insertNote, insertRelationships } from "@/db/queries";
import { log } from "@/observability/logger";

/**
 * Full ingestion pipeline: Raw Note → Stored Memory Object
 *
 * Stages:
 *  0. Normalize
 *  1. Extract features
 *  2. Generate embedding
 *  3. Retrieve related active notes
 *  4. Detect relationships
 *  5. Compute importance features
 *  6. Store everything
 */
export async function ingestNote(
  userId: string,
  rawContent: string,
  source: string = "web"
): Promise<IngestResponse> {
  const noteId = uuid();
  const pipelineTrace: Record<string, unknown> = { note_id: noteId };

  // Stage 0: Normalize
  const normalizer = new DefaultNormalizer();
  const normalized = normalizer.normalize(rawContent, source);
  pipelineTrace.normalize = { raw_len: rawContent.length, clean_len: normalized.clean.length };

  // Stage 1: Extract features
  const extractor = new HeuristicExtractor();
  const extraction = await extractor.extract(normalized.clean, normalized.raw);
  pipelineTrace.extraction = extraction.trace;

  // Stage 2: Generate embedding
  const { embedding, fallback: embeddingFallback } = await generateEmbedding(normalized.clean);
  pipelineTrace.embedding = {
    dimensions: embedding.length,
    method: embeddingFallback ? "placeholder_fallback" : "openai",
    fallback: embeddingFallback,
  };

  // Stage 3: Retrieve related active notes
  const activeNotes = await getActiveNotes(userId, 50);
  pipelineTrace.active_notes_retrieved = activeNotes.length;

  // Stage 4: Detect relationships
  const detector = new HeuristicRelationshipDetector();
  const detection = await detector.detect(noteId, extraction.metadata, embedding, activeNotes);
  pipelineTrace.relationships = detection.trace;

  // Stage 5: Compute importance
  const scorer = new DefaultImportanceScorer();
  const scoring = scorer.score(extraction.metadata, detection.relationships);
  pipelineTrace.importance = scoring.trace;

  // Stage 6: Store
  const now = new Date().toISOString();

  // Merge embedding fallback flag into metadata JSONB so it's queryable
  const storedMetadata = embeddingFallback
    ? { ...extraction.metadata, embedding_fallback: true }
    : extraction.metadata;

  const note: Omit<Note, "last_accessed_at"> = {
    id: noteId,
    user_id: userId,
    content: normalized.raw,
    clean_content: normalized.clean,
    embedding,
    metadata: storedMetadata as typeof extraction.metadata,
    relationships: detection.relationships,
    importance_features: scoring.features,
    created_at: now,
    updated_at: now,
  };

  await insertNote(note);
  await insertRelationships(userId, noteId, detection.relationships);

  log("ingestion.complete", pipelineTrace);

  return {
    note_id: noteId,
    metadata: extraction.metadata,
    relationships: detection.relationships,
    importance_score: scoring.final_score,
  };
}
