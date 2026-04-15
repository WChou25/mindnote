// ──────────────────────────────────────────────
// Core data model — canonical shapes for the entire pipeline
// ──────────────────────────────────────────────

export interface Entity {
  type: "person" | "organization" | "place" | "object" | "event" | string;
  value: string;
}

export interface Persona {
  name: string;
  role: string;
}

export interface ProjectRef {
  primary: string;
  confidence: number;
}

export interface Status {
  state: "unsolved" | "in_progress" | "resolved" | "reference";
  confidence: number;
}

export interface Emotion {
  label: string;
  intensity: number; // 1-10
  confidence: number;
}

export interface Urgency {
  score: number; // 0-1
  reason: string;
}

export interface Actionability {
  has_next_step: boolean;
  suggested_next_step: string | null;
}

export interface NoteMetadata {
  topics: string[];
  entities: Entity[];
  personas: Persona[];
  project: ProjectRef | null;
  status: Status;
  emotion: Emotion | null;
  urgency: Urgency;
  actionability: Actionability;
  time_refs: string[];
}

export interface Relationship {
  type: "helps_resolve" | "related_to_existing" | "new_problem" | "reference_only" | "resolved_by";
  target_note_id: string;
  weight: number; // 0-1
}

export interface ImportanceFeatures {
  base: number;
  recency: number;
  open_loop: number;
  urgency: number;
  dependency: number;
  context: number;
  behavior: number;
}

export interface Note {
  id: string;
  user_id: string;
  content: string;
  clean_content: string;
  embedding: number[];
  metadata: NoteMetadata;
  relationships: Relationship[];
  importance_features: ImportanceFeatures;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

// ──────────────────────────────────────────────
// Pipeline stage interfaces — model-agnostic contracts
// ──────────────────────────────────────────────

export interface NormalizeResult {
  raw: string;
  clean: string;
  source: string;
  timestamp: string;
}

export interface ExtractionResult {
  metadata: NoteMetadata;
  trace: Record<string, unknown>; // debug info for each extracted field
}

export interface RelationshipDetectionResult {
  relationships: Relationship[];
  candidates_considered: string[];
  trace: Record<string, unknown>;
}

export interface ImportanceScoringResult {
  features: ImportanceFeatures;
  final_score: number;
  trace: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Retrieval types
// ──────────────────────────────────────────────

export type RetrievalSource = "vector" | "structured" | "relationship";

export interface CandidateMemory {
  note_id: string;
  retrieval_sources: RetrievalSource[];
  semantic_similarity: number;
  project_match: number;  // 0 or 1
  entity_match: number;   // 0 or 1
  open_loop: number;      // 0 or 1
  urgency: number;
  dependency: number;
  context_match: number;
  behavior_prior: number;
}

export interface RetrievalResult {
  candidates: CandidateMemory[];
  trace: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Hinting types
// ──────────────────────────────────────────────

export type HintType = "recall_reminder" | "next_step_reminder" | "resolution_reminder" | "archive_prompt";

export type HintLevel = "interruptive" | "passive" | "none";

export interface Hint {
  id: string;
  note_id: string;
  type: HintType;
  level: HintLevel;
  content: string;
  score: number;
  score_breakdown: Record<string, number>;
}

export interface HintDecision {
  hint: Hint | null;
  reason: string;
  candidates_evaluated: number;
  trace: Record<string, unknown>;
}

export type FeedbackAction = "clicked" | "dismissed" | "snoozed" | "acted_on" | "marked_solved";

export interface HintFeedback {
  hint_id: string;
  action: FeedbackAction;
  context_key: string;
  topic_key: string;
  project_key: string;
}

// ──────────────────────────────────────────────
// API request/response shapes
// ──────────────────────────────────────────────

export interface IngestRequest {
  content: string;
  source?: string;
  user_context?: Record<string, unknown>;
}

export interface IngestResponse {
  note_id: string;
  metadata: NoteMetadata;
  relationships: Relationship[];
  importance_score: number;
}

export interface RetrieveRequest {
  query?: string;
  context?: Record<string, unknown>;
  limit?: number;
}

export interface RetrieveResponse {
  candidates: CandidateMemory[];
  notes: Note[];
}

export interface HintRequest {
  context: Record<string, unknown>;
  current_note_content?: string;
}

export interface HintResponse {
  hint: Hint | null;
  reason: string;
}

export interface HintFeedbackRequest {
  hint_id: string;
  action: FeedbackAction;
}

export interface HintFeedbackResponse {
  success: boolean;
}

// ──────────────────────────────────────────────
// Pipeline stage contracts — implement one of these per strategy
// ──────────────────────────────────────────────

export interface Normalizer {
  normalize(raw: string, source: string): NormalizeResult;
}

export interface FeatureExtractor {
  extract(clean: string, raw: string): Promise<ExtractionResult>;
}

export interface EmbeddingGenerator {
  generate(text: string): Promise<number[]>;
}

export interface RelationshipDetector {
  detect(noteId: string, metadata: NoteMetadata, embedding: number[], existingNotes: Note[]): Promise<RelationshipDetectionResult>;
}

export interface ImportanceScorer {
  score(metadata: NoteMetadata, relationships: Relationship[]): ImportanceScoringResult;
}

export interface CandidateRetriever {
  retrieve(query: string, embedding: number[], context: Record<string, unknown>): Promise<RetrievalResult>;
}

export interface CandidateRanker {
  rank(candidates: CandidateMemory[], context: Record<string, unknown>): CandidateMemory[];
}

export interface HintPolicy {
  decide(candidates: CandidateMemory[], notes: Map<string, Note>, context: Record<string, unknown>): Promise<HintDecision>;
}
