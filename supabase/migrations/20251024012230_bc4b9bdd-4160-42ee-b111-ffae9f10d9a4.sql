-- Allow anyone to read halftime exports (for Python client access)
CREATE POLICY "Anyone can read halftime exports"
ON public.halftime_exports
FOR SELECT
USING (true);