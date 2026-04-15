import type { Note } from "@/core/types";
import { vectorSearch } from "@/db/queries";
import { PlaceholderEmbeddingGenerator } from "@/ingestion/embed";

/**
 * Semantic retrieval channel: vector similarity search.
 */
export async function retrieveByVector(
  userId: string,
  queryText: string,
  topK: number = 10
): Promise<{ notes: Note[]; embedding: number[] }> {
  const embedder = new PlaceholderEmbeddingGenerator();
  const embedding = await embedder.generate(queryText);
  const notes = await vectorSearch(userId, embedding, topK);
  return { notes, embedding };
}
