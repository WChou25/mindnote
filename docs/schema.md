# Database Schema

## Tables

### notes
Core memory objects. Every note captured by the user becomes a row here.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | auto-generated |
| user_id | text | identifies the user |
| content | text | raw note text |
| clean_content | text | normalized text |
| embedding | vector(1536) | pgvector embedding |
| metadata | jsonb | extracted features (topics, entities, personas, etc.) |
| importance_features | jsonb | scoring breakdown (base, recency, urgency, etc.) |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| last_accessed_at | timestamptz | updated on retrieval |

### relationships
Note-to-note edges representing how notes relate to each other.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text | |
| source_note_id | uuid FK→notes | the note that created this edge |
| target_note_id | uuid FK→notes | the related note |
| relationship_type | text | helps_resolve, related_to_existing, new_problem, reference_only, resolved_by |
| weight | real | 0-1, strength of relationship |
| created_at | timestamptz | |

### user_weights
Feedback-driven weight adjustments. Scoped by (context, topic, project) to avoid overgeneralizing.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text | |
| context_key | text | e.g., "home", "work" |
| topic_key | text | e.g., "plumbing" |
| project_key | text | e.g., "bathroom_reno" |
| weight | real | accumulated delta from feedback |
| updated_at | timestamptz | |

### hint_events
Observability log for every hint decision — whether or not a hint was shown.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | text | |
| trigger_type | text | what triggered the hint check |
| context | jsonb | full context object |
| candidate_note_ids | uuid[] | all candidates considered |
| selected_note_id | uuid FK→notes | the note chosen for the hint (nullable) |
| selected_hint_type | text | recall_reminder, next_step_reminder, etc. |
| score_breakdown | jsonb | individual scoring inputs |
| action_taken | text | user feedback: clicked, dismissed, snoozed, etc. |
| created_at | timestamptz | |

## RPC Functions

### match_notes
pgvector similarity search. Returns notes ordered by cosine similarity.

```sql
match_notes(query_embedding vector(1536), match_count int, filter_user_id text)
→ table(id, user_id, content, ..., similarity float)
```

## Setup

1. Create a Supabase project
2. Run `src/db/migrations/001_initial_schema.sql` in the SQL editor
3. Run `src/db/rpc.sql` in the SQL editor
4. Copy `.env.local.example` to `.env.local` and fill in your keys
