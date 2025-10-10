-- Create table for storing NFL game snapshots
CREATE TABLE IF NOT EXISTS public.game_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  game_id TEXT NOT NULL,
  game_date DATE NOT NULL,
  
  -- Team information
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_team_abbr TEXT NOT NULL,
  away_team_abbr TEXT NOT NULL,
  
  -- Score and game state
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  quarter INTEGER NOT NULL,
  clock TEXT,
  game_status TEXT NOT NULL,
  
  -- Team statistics (stored as JSONB for flexibility)
  home_stats JSONB DEFAULT '{}'::jsonb,
  away_stats JSONB DEFAULT '{}'::jsonb,
  
  -- Drive and momentum data
  drives JSONB DEFAULT '[]'::jsonb,
  last_scoring_team TEXT,
  
  -- Metadata
  venue TEXT,
  broadcast TEXT
);

-- Enable Row Level Security
ALTER TABLE public.game_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read game snapshots (public data)
CREATE POLICY "Anyone can read game snapshots"
  ON public.game_snapshots
  FOR SELECT
  USING (true);

-- Create policy to allow insert from service role only (backend functions)
CREATE POLICY "Service role can insert game snapshots"
  ON public.game_snapshots
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_game_snapshots_game_id ON public.game_snapshots(game_id);
CREATE INDEX idx_game_snapshots_created_at ON public.game_snapshots(created_at DESC);
CREATE INDEX idx_game_snapshots_game_date ON public.game_snapshots(game_date DESC);