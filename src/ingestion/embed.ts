import OpenAI from "openai";
import type { EmbeddingGenerator } from "@/core/types";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "@/core/constants";
import { log } from "@/observability/logger";

// ──────────────────────────────────────────────
// OpenAI embedding generator (primary)
// ──────────────────────────────────────────────

export class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private openai: OpenAI;
  private model: string;

  constructor(model: string = EMBEDDING_MODEL) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(text: string): Promise<number[]> {
    const input = text.trim();
    if (!input) {
      throw new Error("Cannot embed empty text");
    }

    const response = await this.openai.embeddings.create({
      model: this.model,
      input,
    });

    const embedding = response.data[0]?.embedding;

    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Invalid embedding returned. Expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 0}`
      );
    }

    return embedding;
  }
}

// ──────────────────────────────────────────────
// Placeholder generator — only used when ALLOW_EMBEDDING_FALLBACK=true
// ──────────────────────────────────────────────

export class PlaceholderEmbeddingGenerator implements EmbeddingGenerator {
  async generate(text: string): Promise<number[]> {
    const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % EMBEDDING_DIMENSIONS;
      embedding[idx] += text.charCodeAt(i) / 1000;
    }
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    return embedding;
  }
}

// ──────────────────────────────────────────────
// Factory: returns the right generator based on env
// ──────────────────────────────────────────────

export interface EmbedResult {
  embedding: number[];
  fallback: boolean;
}

/**
 * Generates an embedding for the given text.
 *
 * - Uses OpenAI by default.
 * - If ALLOW_EMBEDDING_FALLBACK=true and OpenAI fails, falls back to the
 *   placeholder generator and sets fallback=true in the result so the caller
 *   can mark the note accordingly.
 * - If ALLOW_EMBEDDING_FALLBACK is not set or false, any OpenAI failure throws.
 */
export async function generateEmbedding(text: string): Promise<EmbedResult> {
  const allowFallback = process.env.ALLOW_EMBEDDING_FALLBACK === "true";

  try {
    const embedder = new OpenAIEmbeddingGenerator();
    const embedding = await embedder.generate(text);
    return { embedding, fallback: false };
  } catch (err) {
    if (!allowFallback) {
      throw err;
    }

    log("embedding.fallback", {
      reason: String(err),
      text_length: text.length,
    }, "warn");

    const fallbackEmbedder = new PlaceholderEmbeddingGenerator();
    const embedding = await fallbackEmbedder.generate(text);
    return { embedding, fallback: true };
  }
}
