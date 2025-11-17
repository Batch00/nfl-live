-- Add standings columns to game_snapshots table
ALTER TABLE game_snapshots 
ADD COLUMN home_standings JSONB,
ADD COLUMN away_standings JSONB;