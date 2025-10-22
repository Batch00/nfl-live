-- Create table to track halftime email exports
CREATE TABLE IF NOT EXISTS public.halftime_exports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id TEXT NOT NULL UNIQUE,
  emailed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  recipient_email TEXT NOT NULL,
  csv_filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.halftime_exports ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read halftime exports (public data)
CREATE POLICY "Anyone can read halftime exports" 
ON public.halftime_exports 
FOR SELECT 
USING (true);

-- Create policy for service role to insert halftime exports
CREATE POLICY "Service role can insert halftime exports" 
ON public.halftime_exports 
FOR INSERT 
WITH CHECK (true);

-- Create index for faster game_id lookups
CREATE INDEX idx_halftime_exports_game_id ON public.halftime_exports(game_id);

-- Create index for email status queries
CREATE INDEX idx_halftime_exports_status ON public.halftime_exports(email_status);