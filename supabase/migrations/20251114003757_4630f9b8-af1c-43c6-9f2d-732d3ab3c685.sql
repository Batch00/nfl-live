-- Allow service role to delete old game snapshots for cleanup
CREATE POLICY "Service role can delete game snapshots"
ON public.game_snapshots
FOR DELETE
USING (true);