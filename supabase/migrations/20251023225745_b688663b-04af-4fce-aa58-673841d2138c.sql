-- Add metadata columns to halftime_exports table for Python script access
ALTER TABLE halftime_exports 
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS week INTEGER,
ADD COLUMN IF NOT EXISTS home_team TEXT,
ADD COLUMN IF NOT EXISTS away_team TEXT,
ADD COLUMN IF NOT EXISTS game_date TEXT,
ADD COLUMN IF NOT EXISTS csv_path TEXT;

-- Add index on game_id for faster lookups and deduplication
CREATE INDEX IF NOT EXISTS idx_halftime_exports_game_id ON halftime_exports(game_id);

-- Add index on year and week for time-based queries
CREATE INDEX IF NOT EXISTS idx_halftime_exports_year_week ON halftime_exports(year, week);