-- Simpler batch delete function that avoids subquery timeouts
CREATE OR REPLACE FUNCTION delete_old_snapshots_batch(cutoff_date timestamptz, batch_limit integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  WITH to_delete AS (
    SELECT id 
    FROM game_snapshots
    WHERE created_at < cutoff_date
    LIMIT batch_limit
  )
  DELETE FROM game_snapshots
  WHERE id IN (SELECT id FROM to_delete);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;