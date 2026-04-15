import type { NormalizeResult, Normalizer } from "@/core/types";

/**
 * Stage 0: Normalization
 * Cleans raw input while preserving the original text.
 */
export class DefaultNormalizer implements Normalizer {
  normalize(raw: string, source: string = "web"): NormalizeResult {
    const clean = raw
      .trim()
      .replace(/\s+/g, " ")       // collapse whitespace
      .replace(/\n{3,}/g, "\n\n") // limit consecutive newlines
      .replace(/[^\S\n]+/g, " "); // normalize non-newline whitespace

    return {
      raw,
      clean,
      source,
      timestamp: new Date().toISOString(),
    };
  }
}
