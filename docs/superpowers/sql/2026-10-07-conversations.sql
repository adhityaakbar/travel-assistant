CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  source_text TEXT NOT NULL CHECK (length(trim(source_text)) > 0),
  source_language TEXT NOT NULL CHECK (length(trim(source_language)) > 0),
  translated_text TEXT NOT NULL CHECK (length(trim(translated_text)) > 0),
  target_language TEXT NOT NULL CHECK (length(trim(target_language)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations (created_at DESC);
