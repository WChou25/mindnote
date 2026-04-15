# API Reference

All endpoints accept and return JSON. Auth is placeholder (`default-user`) for now.

## POST /api/ingest

Capture a new note. Runs the full ingestion pipeline: normalize → extract → embed → detect relationships → score → store.

**Request:**
```json
{
  "content": "Plumber Dave said the upstairs leak is a $200 fix but he can't come until Friday.",
  "source": "web",
  "user_context": {}
}
```

**Response (201):**
```json
{
  "note_id": "uuid",
  "metadata": {
    "topics": ["home_maintenance", "finance"],
    "entities": [{"type": "person", "value": "Dave"}, {"type": "object", "value": "$200"}],
    "urgency": {"score": 0.5, "reason": "urgency cues: before"},
    "actionability": {"has_next_step": true, "suggested_next_step": "contact"},
    "status": {"state": "unsolved", "confidence": 0.8},
    "time_refs": ["friday"]
  },
  "relationships": [],
  "importance_score": 0.186
}
```

## POST /api/retrieve

Retrieve candidate memories for a given query or context.

**Request:**
```json
{
  "query": "need to fix the sink before guests come Saturday",
  "context": {},
  "limit": 20
}
```

**Response:**
```json
{
  "candidates": [
    {
      "note_id": "uuid",
      "retrieval_sources": ["vector", "structured"],
      "semantic_similarity": 0.81,
      "project_match": 1,
      "entity_match": 1,
      "open_loop": 1,
      "urgency": 0.7,
      "dependency": 0.8,
      "context_match": 0.2,
      "behavior_prior": 0.0
    }
  ],
  "notes": [...]
}
```

## POST /api/hint

Request a hint based on current context. Runs retrieval + hinting pipeline.

**Request:**
```json
{
  "context": {"trigger": "note_capture"},
  "current_note_content": "Need to fix sink before guests come Saturday."
}
```

**Response:**
```json
{
  "hint": {
    "id": "uuid",
    "note_id": "uuid",
    "type": "recall_reminder",
    "level": "passive",
    "content": "Earlier note: \"Plumber Dave said the upstairs leak is a $200 fix...\" — Relevant?",
    "score": 0.68,
    "score_breakdown": {...}
  },
  "reason": "score 0.68 → passive hint"
}
```

Returns `{"hint": null, "reason": "..."}` when no hint triggers.

## POST /api/hint-feedback

Record user action on a hint. Updates the hint event and adjusts user weights.

**Request:**
```json
{
  "hint_id": "uuid",
  "action": "clicked"
}
```

**Actions:** `clicked`, `dismissed`, `snoozed`, `acted_on`, `marked_solved`

**Response:**
```json
{"success": true}
```
