/**
 * Manual test script for OpenAI embeddings.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... npx ts-node --project tsconfig.json scripts/test-embedding.ts
 *
 * Expected output:
 *   Embedding length: 1536
 *   First 5 values: [ ... ]
 *   PASS: embedding is 1536 dimensions
 */

import { OpenAIEmbeddingGenerator } from "../src/ingestion/embed";
import { EMBEDDING_DIMENSIONS } from "../src/core/constants";

async function main() {
  const testSentence = "The upstairs bathroom faucet is leaking.";

  console.log(`Testing embedding for: "${testSentence}"`);
  console.log(`Expected dimensions: ${EMBEDDING_DIMENSIONS}`);
  console.log("---");

  const embedder = new OpenAIEmbeddingGenerator();
  const embedding = await embedder.generate(testSentence);

  console.log(`Embedding length: ${embedding.length}`);
  console.log(`First 5 values: ${embedding.slice(0, 5).map((v) => v.toFixed(6)).join(", ")}`);

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    console.error(
      `FAIL: expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding.length}`
    );
    process.exit(1);
  }

  console.log(`PASS: embedding is ${EMBEDDING_DIMENSIONS} dimensions`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
