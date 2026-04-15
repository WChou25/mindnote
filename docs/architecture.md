# Architecture

## System Overview

```
User Input
    |
    v
[Capture UI] ──POST──> [/api/ingest]
                            |
                    ┌───────┴───────────────────────┐
                    v                               v
              [Normalize]                    [Store in DB]
                    |                               ^
                    v                               |
              [Extract Features]                    |
                    |                               |
                    v                               |
              [Generate Embedding]                  |
                    |                               |
                    v                               |
              [Retrieve Active Notes]               |
                    |                               |
                    v                               |
              [Detect Relationships]                |
                    |                               |
                    v                               |
              [Compute Importance] ─────────────────┘

Context Trigger
    |
    v
[Hint UI] ──POST──> [/api/hint]
                        |
                ┌───────┴──────────┐
                v                  v
          [Retrieve          [Rank Candidates]
           Candidates]             |
                |                  v
                |            [Apply Hint Policy]
                |                  |
                └──────────────────┘
                        |
                        v
                  [Generate Hint]
                        |
                        v
                  [Log Event]
                        |
                        v
                  [Display Hint] ──> [Capture Feedback] ──> [Update Weights]
```

## Directory Structure

```
src/
├── app/                    Next.js app router
│   ├── api/
│   │   ├── ingest/         POST — full ingestion pipeline
│   │   ├── retrieve/       POST — multi-channel retrieval
│   │   ├── hint/           POST — hint generation
│   │   └── hint-feedback/  POST — feedback capture
│   ├── components/
│   │   ├── Nav.tsx         Navigation bar
│   │   └── HintToast.tsx   Hint display card
│   ├── hints/              Hint checker page
│   ├── debug/              Retrieval inspector page
│   └── page.tsx            Note capture page
├── core/                   Shared types, constants, scoring
├── ingestion/              Normalize → Extract → Embed → Relate → Score
├── retrieval/              Vector + Structured + Relationship → Merge → Rank
├── hinting/                Policy → Select → Compose
├── db/                     Supabase client, queries, migrations
└── observability/          Structured logging
```

## Design Principles

1. **Model-agnostic pipeline** — Each stage defines an interface. Implementations can be swapped between rules, heuristics, classifiers, embeddings, or LLMs.

2. **Explainable scoring** — No opaque single scores. Every decision exposes feature breakdowns in the debug UI and logs.

3. **Multi-channel retrieval** — Vector similarity alone isn't enough. Structured metadata search and relationship expansion provide complementary signals.

4. **Conservative hinting** — Rate-limited, short, evidence-based. No unsolicited monologues.

5. **Feedback-scoped, not global** — User weights are keyed by (context, topic, project) to avoid overgeneralizing preferences.

## Pipeline Stages

| # | Stage | Module | Strategy (Phase 1) |
|---|---|---|---|
| 0 | Normalize | `ingestion/normalize.ts` | Whitespace cleanup, preserve raw |
| 1 | Extract | `ingestion/extract.ts` | Keyword + regex heuristics |
| 2 | Embed | `ingestion/embed.ts` | Placeholder (swap for OpenAI) |
| 3 | Relate | `ingestion/relationships.ts` | Heuristic classification |
| 4 | Score | `ingestion/importance.ts` | Additive feature computation |
| 5 | Retrieve | `retrieval/pipeline.ts` | Vector + structured + expand |
| 6 | Hint | `hinting/pipeline.ts` | Threshold policy + compose |
