import type { EmbeddingGenerator } from "@/core/types";
import { EMBEDDING_DIMENSIONS } from "@/core/constants";

/**
 * Placeholder embedding generator.
 * Swap this out for OpenAI, Cohere, local model, etc.
 *
 * For now generates a deterministic pseudo-embedding from the text
 * so the rest of the pipeline can run end-to-end without an API key.
 */
export class PlaceholderEmbeddingGenerator implements EmbeddingGenerator {
  async generate(text: string): Promise<number[]> {
    // Simple hash-based pseudo-embedding for development
    const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
    for (let i = 0; i < text.length; i++) {
      const idx = i % EMBEDDING_DIMENSIONS;
      embedding[idx] += text.charCodeAt(i) / 1000;
    }
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    return embedding;
  }
}

/**
 * OpenAI-compatible embedding generator.
 * Requires OPENAI_API_KEY environment variable.
 */
export class OpenAIEmbeddingGenerator implements EmbeddingGenerator {
  private model: string;

  constructor(model: string = "text-embedding-3-small") {
    this.model = model;
  }

  async generate(text: string): Promise<number[]> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text, model: this.model }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI embedding failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }
}
