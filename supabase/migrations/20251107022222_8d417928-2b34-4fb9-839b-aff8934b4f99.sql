-- Add FPI (Football Power Index) columns to game_snapshots table
ALTER TABLE public.game_snapshots 
ADD COLUMN IF NOT EXISTS home_fpi jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS away_fpi jsonb DEFAULT NULL;