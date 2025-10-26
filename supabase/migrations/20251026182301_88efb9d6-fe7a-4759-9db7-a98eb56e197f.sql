-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create the cron job to run halftime-emailer every 5 minutes
SELECT cron.schedule(
  'halftime-emailer-cron',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
      url:='https://tjazosfjsxqaaspwsgal.supabase.co/functions/v1/halftime-emailer',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqYXpvc2Zqc3hxYWFzcHdzZ2FsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMjE5NzAsImV4cCI6MjA3NTY5Nzk3MH0.UUZ4OgNtEPCTpsuVxbxaq09SDZawKOeN3jUovuCi64A"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);