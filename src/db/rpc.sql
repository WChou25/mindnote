-- Supabase RPC function for pgvector similarity search
-- Run this in the Supabase SQL editor after creating the tables

create or replace function match_notes(
  query_embedding vector(1536),
  match_count int default 10,
  filter_user_id text default null
)
returns table (
  id uuid,
  user_id text,
  content text,
  clean_content text,
  embedding vector(1536),
  metadata jsonb,
  importance_features jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_accessed_at timestamptz,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    n.id,
    n.user_id,
    n.content,
    n.clean_content,
    n.embedding,
    n.metadata,
    n.importance_features,
    n.created_at,
    n.updated_at,
    n.last_accessed_at,
    1 - (n.embedding <=> query_embedding) as similarity
  from notes n
  where (filter_user_id is null or n.user_id = filter_user_id)
  order by n.embedding <=> query_embedding
  limit match_count;
end;
$$;
