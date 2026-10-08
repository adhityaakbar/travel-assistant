CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  rating TEXT,
  rating_num NUMERIC,
  user_rating_count INTEGER DEFAULT 0,
  popularity_score NUMERIC DEFAULT 0,
  address TEXT,
  icon TEXT,
  maps_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS places_lat_lng_idx ON places (lat, lng);
CREATE INDEX IF NOT EXISTS places_category_idx ON places (category);
