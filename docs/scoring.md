# Scoring

## Importance Features (per note)

Computed at ingestion time. Each feature is 0-1 normalized.

| Feature | Default Logic | Notes |
|---|---|---|
| base | 0.6 if unsolved, 0.3 otherwise | Unsolved notes start higher |
| recency | 0.1 (fresh) | Decays over time in retrieval |
| open_loop | +0.2 unsolved, +0.15 actionable | Stacks |
| urgency | From extraction (cue matching) | 0.1 baseline, +0.2 per cue, max 1.0 |
| dependency | Avg relationship weight | 0 if no relationships |
| context | 0 at ingestion | Updated during retrieval |
| behavior | 0 at ingestion | Updated by feedback loop |

**Final importance score:**
```
raw = sum(all features)
normalized = clamp(raw / 7, 0, 1)
```

No large multipliers. Conservative baseline.

## Candidate Ranking (at retrieval)

Each candidate gets a composite score from retrieval signals.

| Signal | Weight | Source |
|---|---|---|
| semantic_similarity | 0.25 | Vector search |
| project_match | 0.15 | Metadata filter |
| entity_match | 0.15 | Metadata filter |
| open_loop | 0.15 | Note status |
| urgency | 0.10 | Extracted urgency |
| dependency | 0.10 | Relationship edges |
| context_match | 0.05 | Topic overlap |
| behavior_prior | 0.05 | User weights |

## Hint Thresholds

| Score Range | Level | Behavior |
|---|---|---|
| >= 0.75 | interruptive | Toast notification |
| 0.60 - 0.74 | passive | Card in hints page |
| < 0.60 | none | Not shown |

## Rate Limits

- Max 1 interruptive hint per hour
- Max 3 hints per day

## Feedback Weights

User actions update weights scoped to (context, topic, project):

| Action | Delta |
|---|---|
| clicked | +0.1 |
| acted_on | +0.1 |
| marked_solved | +0.1 |
| dismissed | -0.1 |
| snoozed | 0 |

This prevents overgeneralizing. "home + plumbing + bathroom_reno → positive" doesn't mean "work + plumbing → positive".
