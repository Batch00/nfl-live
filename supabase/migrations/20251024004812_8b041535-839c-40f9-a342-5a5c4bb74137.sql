-- Restrict halftime_exports table to admin-only access
DROP POLICY IF EXISTS "Authenticated users can read exports" ON halftime_exports;

CREATE POLICY "Admins can read exports" ON halftime_exports
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));