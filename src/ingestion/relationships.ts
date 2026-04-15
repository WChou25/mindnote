import type {
  RelationshipDetector,
  RelationshipDetectionResult,
  NoteMetadata,
  Relationship,
  Note,
} from "@/core/types";

/**
 * Stage 2: Relationship Detection
 * Uses heuristics over shared entities, topics, and projects
 * to classify how a new note relates to existing ones.
 */
export class HeuristicRelationshipDetector implements RelationshipDetector {
  async detect(
    noteId: string,
    metadata: NoteMetadata,
    _embedding: number[],
    existingNotes: Note[]
  ): Promise<RelationshipDetectionResult> {
    const relationships: Relationship[] = [];
    const candidatesConsidered: string[] = [];
    const trace: Record<string, unknown> = { rules_applied: [] };

    for (const existing of existingNotes) {
      if (existing.id === noteId) continue;
      candidatesConsidered.push(existing.id);

      const sharedTopics = metadata.topics.filter((t) =>
        existing.metadata.topics.includes(t)
      );
      const sharedEntities = metadata.entities.filter((e) =>
        existing.metadata.entities.some((ex) => ex.value === e.value)
      );
      const sameProject =
        metadata.project &&
        existing.metadata.project &&
        metadata.project.primary === existing.metadata.project.primary;

      // No overlap at all — skip
      if (sharedTopics.length === 0 && sharedEntities.length === 0 && !sameProject) {
        continue;
      }

      const rel = this.classify(metadata, existing.metadata, {
        sharedTopics,
        sharedEntities: sharedEntities.length,
        sameProject: !!sameProject,
      });

      if (rel) {
        relationships.push({
          type: rel.type,
          target_note_id: existing.id,
          weight: rel.weight,
        });
        (trace.rules_applied as unknown[]).push({
          target: existing.id,
          type: rel.type,
          reason: rel.reason,
        });
      }
    }

    return { relationships, candidates_considered: candidatesConsidered, trace };
  }

  private classify(
    newMeta: NoteMetadata,
    existingMeta: NoteMetadata,
    overlap: { sharedTopics: string[]; sharedEntities: number; sameProject: boolean }
  ): { type: Relationship["type"]; weight: number; reason: string } | null {
    // External contact or resource linked to an open issue
    if (
      existingMeta.status.state === "unsolved" &&
      newMeta.personas.length > 0 &&
      overlap.sharedTopics.length > 0
    ) {
      return {
        type: "helps_resolve",
        weight: 0.8,
        reason: "new note has persona that may help resolve open issue",
      };
    }

    // Both unsolved, same project
    if (
      overlap.sameProject &&
      newMeta.status.state === "unsolved" &&
      existingMeta.status.state === "unsolved"
    ) {
      return {
        type: "related_to_existing",
        weight: 0.7,
        reason: "same project, both unsolved",
      };
    }

    // New note resolves existing
    if (
      existingMeta.status.state === "unsolved" &&
      newMeta.status.state === "resolved" &&
      (overlap.sameProject || overlap.sharedEntities > 0)
    ) {
      return {
        type: "resolved_by",
        weight: 0.9,
        reason: "new note marks resolution of related open issue",
      };
    }

    // Shared entities or topics but no strong signal
    if (overlap.sharedEntities > 0 || overlap.sharedTopics.length > 1) {
      return {
        type: "related_to_existing",
        weight: 0.5,
        reason: "shared entities or multiple shared topics",
      };
    }

    // Factual note with weak overlap
    if (newMeta.status.state === "reference" && overlap.sharedTopics.length === 1) {
      return {
        type: "reference_only",
        weight: 0.3,
        reason: "reference note with single topic overlap",
      };
    }

    return null;
  }
}
