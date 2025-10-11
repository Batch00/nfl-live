-- Add additional columns to game_snapshots for enhanced data
ALTER TABLE public.game_snapshots
ADD COLUMN IF NOT EXISTS game_start_time timestamp with time zone,
ADD COLUMN IF NOT EXISTS betting_lines jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS play_by_play jsonb DEFAULT '[]'::jsonb;

-- Add index for game_start_time for efficient querying
CREATE INDEX IF NOT EXISTS idx_game_snapshots_start_time ON public.game_snapshots(game_start_time);

-- Add comment to describe the new columns
COMMENT ON COLUMN public.game_snapshots.game_start_time IS 'Scheduled start time of the game';
COMMENT ON COLUMN public.game_snapshots.betting_lines IS 'Pregame betting odds including moneyline, spread, and over/under';
COMMENT ON COLUMN public.game_snapshots.play_by_play IS 'Array of play-by-play data including quarter, time, down, distance, and description';