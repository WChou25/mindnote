# Implementation Plan

## Phase 1 — Core Loop (current)

- [x] Project scaffolding (Next.js + TypeScript + Tailwind)
- [x] Core types and interfaces
- [x] Database schema + migrations + RPC
- [x] Supabase client + query helpers
- [x] Ingestion pipeline (normalize, extract, embed, relate, score)
- [x] Retrieval pipeline (vector, structured, relationship, merge, rank)
- [x] Hinting pipeline (policy, compose, rate limits)
- [x] API routes (ingest, retrieve, hint, hint-feedback)
- [x] Frontend: Capture UI
- [x] Frontend: Hint UI
- [x] Frontend: Debug / retrieval inspector
- [x] Observability: structured logging
- [ ] Set up Supabase project and run migrations
- [ ] Swap placeholder embeddings for OpenAI
- [ ] End-to-end test with the "plumber Dave" scenario

## Phase 2 — Better Signals

- [ ] Structured retrieval with richer JSONB queries
- [ ] Relationship detection using embedding similarity (not just heuristics)
- [ ] Score breakdowns visible in hint toast (done in UI, needs wiring)
- [ ] Feedback storage with full (context, topic, project) keys from frontend
- [ ] Emotion extraction (lightweight classifier)
- [ ] Project auto-detection via embedding similarity to active projects

## Phase 3 — Smarter Ranking

- [ ] Context-aware behavior weights (decay stale feedback)
- [ ] More hint types (time-based, location-based)
- [ ] Recency decay curve tuning
- [ ] A/B scoring experiments via observability logs
- [ ] Stronger entity resolution (merge "Dave" + "plumber Dave")

## Deferred

- Advanced graph reasoning
- State-matching across long time horizons
- Dense emotional retrieval
- Complex adaptive learning loops
- Multi-device passive sensing
- Agentic orchestration
