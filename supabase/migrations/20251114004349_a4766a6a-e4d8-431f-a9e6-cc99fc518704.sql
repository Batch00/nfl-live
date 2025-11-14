-- Create function to delete old game snapshots in batches
CREATE OR REPLACE FUNCTION delete_old_snapshots_batch(cutoff_date timestamptz, batch_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM game_snapshots
  WHERE id IN (
    SELECT id FROM game_snapshots
    WHERE created_at < cutoff_date
    LIMIT batch_limit
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;