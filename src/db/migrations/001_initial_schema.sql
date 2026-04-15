-- Personal Assistant: Initial Schema
-- Requires: pgvector extension enabled in Supabase

create extension if not exists vector;

-- ──────────────────────────────────────────────
-- notes: core memory objects
-- ──────────────────────────────────────────────
create table notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  content       text not null,
  clean_content text not null,
  embedding     vector(1536),
  metadata      jsonb not null default '{}',
  importance_features jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

create index idx_notes_user on notes(user_id);
create index idx_notes_created on notes(created_at desc);
create index idx_notes_embedding on notes using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_notes_metadata on notes using gin (metadata);

-- ──────────────────────────────────────────────
-- relationships: note-to-note edges
-- ──────────────────────────────────────────────
create table relationships (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  source_note_id    uuid not null references notes(id) on delete cascade,
  target_note_id    uuid not null references notes(id) on delete cascade,
  relationship_type text not null,
  weight            real not null default 0.5,
  created_at        timestamptz not null default now()
);

create index idx_rel_source on relationships(source_note_id);
create index idx_rel_target on relationships(target_note_id);
create index idx_rel_user on relationships(user_id);

-- ──────────────────────────────────────────────
-- user_weights: feedback-driven weight adjustments
-- ──────────────────────────────────────────────
create table user_weights (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  context_key text not null,
  topic_key   text not null,
  project_key text not null,
  weight      real not null default 0.0,
  updated_at  timestamptz not null default now(),
  unique(user_id, context_key, topic_key, project_key)
);

create index idx_uw_user on user_weights(user_id);

-- ──────────────────────────────────────────────
-- hint_events: observability + feedback history
-- ──────────────────────────────────────────────
create table hint_events (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null,
  trigger_type        text not null,
  context             jsonb not null default '{}',
  candidate_note_ids  uuid[] not null default '{}',
  selected_note_id    uuid references notes(id) on delete set null,
  selected_hint_type  text,
  score_breakdown     jsonb not null default '{}',
  action_taken        text,
  created_at          timestamptz not null default now()
);

create index idx_he_user on hint_events(user_id);
create index idx_he_created on hint_events(created_at desc);
