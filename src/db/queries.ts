import { getSupabaseClient } from "./client";
import type { Note, Relationship, HintFeedback } from "@/core/types";

const supabase = () => getSupabaseClient();

// ──────────────────────────────────────────────
// Notes
// ──────────────────────────────────────────────

export async function insertNote(note: Omit<Note, "last_accessed_at">): Promise<Note> {
  const { data, error } = await supabase()
    .from("notes")
    .insert({
      id: note.id,
      user_id: note.user_id,
      content: note.content,
      clean_content: note.clean_content,
      embedding: note.embedding,
      metadata: note.metadata,
      importance_features: note.importance_features,
      created_at: note.created_at,
      updated_at: note.updated_at,
    })
    .select()
    .single();

  if (error) throw new Error(`insertNote failed: ${error.message}`);
  return data as Note;
}

export async function getNoteById(id: string): Promise<Note | null> {
  const { data, error } = await supabase()
    .from("notes")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(`getNoteById failed: ${error.message}`);
  return data as Note | null;
}

export async function getActiveNotes(userId: string, limit = 50): Promise<Note[]> {
  const { data, error } = await supabase()
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getActiveNotes failed: ${error.message}`);
  return (data ?? []) as Note[];
}

export async function vectorSearch(
  userId: string,
  embedding: number[],
  topK: number = 10
): Promise<Note[]> {
  // Uses Supabase's RPC for pgvector similarity search
  const { data, error } = await supabase().rpc("match_notes", {
    query_embedding: embedding,
    match_count: topK,
    filter_user_id: userId,
  });

  if (error) throw new Error(`vectorSearch failed: ${error.message}`);
  return (data ?? []) as Note[];
}

export async function searchByMetadata(
  userId: string,
  filters: {
    topics?: string[];
    entities?: string[];
    project?: string;
    status?: string;
  },
  limit = 10
): Promise<Note[]> {
  let query = supabase()
    .from("notes")
    .select("*")
    .eq("user_id", userId);

  if (filters.topics?.length) {
    query = query.contains("metadata", { topics: filters.topics });
  }
  if (filters.project) {
    query = query.contains("metadata", { project: { primary: filters.project } });
  }
  if (filters.status) {
    query = query.contains("metadata", { status: { state: filters.status } });
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`searchByMetadata failed: ${error.message}`);
  return (data ?? []) as Note[];
}

// ──────────────────────────────────────────────
// Relationships
// ──────────────────────────────────────────────

export async function insertRelationships(
  userId: string,
  sourceNoteId: string,
  relationships: Relationship[]
): Promise<void> {
  if (relationships.length === 0) return;

  const rows = relationships.map((r) => ({
    user_id: userId,
    source_note_id: sourceNoteId,
    target_note_id: r.target_note_id,
    relationship_type: r.type,
    weight: r.weight,
  }));

  const { error } = await supabase().from("relationships").insert(rows);
  if (error) throw new Error(`insertRelationships failed: ${error.message}`);
}

export async function getRelatedNoteIds(noteId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from("relationships")
    .select("target_note_id")
    .eq("source_note_id", noteId);

  if (error) throw new Error(`getRelatedNoteIds failed: ${error.message}`);
  return (data ?? []).map((r: { target_note_id: string }) => r.target_note_id);
}

// ──────────────────────────────────────────────
// User Weights (feedback)
// ──────────────────────────────────────────────

export async function upsertUserWeight(
  userId: string,
  contextKey: string,
  topicKey: string,
  projectKey: string,
  delta: number
): Promise<void> {
  // Try to get existing weight
  const { data: existing } = await supabase()
    .from("user_weights")
    .select("id, weight")
    .eq("user_id", userId)
    .eq("context_key", contextKey)
    .eq("topic_key", topicKey)
    .eq("project_key", projectKey)
    .single();

  if (existing) {
    const { error } = await supabase()
      .from("user_weights")
      .update({ weight: existing.weight + delta, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error(`upsertUserWeight update failed: ${error.message}`);
  } else {
    const { error } = await supabase()
      .from("user_weights")
      .insert({
        user_id: userId,
        context_key: contextKey,
        topic_key: topicKey,
        project_key: projectKey,
        weight: delta,
      });
    if (error) throw new Error(`upsertUserWeight insert failed: ${error.message}`);
  }
}

export async function getUserWeight(
  userId: string,
  contextKey: string,
  topicKey: string,
  projectKey: string
): Promise<number> {
  const { data } = await supabase()
    .from("user_weights")
    .select("weight")
    .eq("user_id", userId)
    .eq("context_key", contextKey)
    .eq("topic_key", topicKey)
    .eq("project_key", projectKey)
    .single();

  return data?.weight ?? 0;
}

// ──────────────────────────────────────────────
// Hint Events
// ──────────────────────────────────────────────

export async function insertHintEvent(event: {
  user_id: string;
  trigger_type: string;
  context: Record<string, unknown>;
  candidate_note_ids: string[];
  selected_note_id: string | null;
  selected_hint_type: string | null;
  score_breakdown: Record<string, number>;
  action_taken: string | null;
}): Promise<string> {
  const { data, error } = await supabase()
    .from("hint_events")
    .insert(event)
    .select("id")
    .single();

  if (error) throw new Error(`insertHintEvent failed: ${error.message}`);
  return data.id;
}

export async function updateHintEventAction(
  eventId: string,
  action: string
): Promise<void> {
  const { error } = await supabase()
    .from("hint_events")
    .update({ action_taken: action })
    .eq("id", eventId);

  if (error) throw new Error(`updateHintEventAction failed: ${error.message}`);
}
