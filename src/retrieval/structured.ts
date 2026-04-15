import type { Note } from "@/core/types";
import { searchByMetadata } from "@/db/queries";

/**
 * Structured retrieval channel: filter by metadata fields.
 */
export async function retrieveByStructured(
  userId: string,
  filters: {
    topics?: string[];
    entities?: string[];
    project?: string;
    status?: string;
  },
  limit: number = 10
): Promise<Note[]> {
  return searchByMetadata(userId, filters, limit);
}
