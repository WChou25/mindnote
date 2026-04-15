import type { Note } from "@/core/types";
import { getRelatedNoteIds, getNoteById } from "@/db/queries";

/**
 * Relationship expansion channel: follow edges from candidate notes.
 */
export async function expandRelationships(
  noteIds: string[],
  depth: number = 1
): Promise<Note[]> {
  const visited = new Set<string>(noteIds);
  let frontier = [...noteIds];
  const expanded: Note[] = [];

  for (let d = 0; d < depth; d++) {
    const nextFrontier: string[] = [];

    for (const id of frontier) {
      const relatedIds = await getRelatedNoteIds(id);
      for (const relId of relatedIds) {
        if (!visited.has(relId)) {
          visited.add(relId);
          const note = await getNoteById(relId);
          if (note) {
            expanded.push(note);
            nextFrontier.push(relId);
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return expanded;
}
