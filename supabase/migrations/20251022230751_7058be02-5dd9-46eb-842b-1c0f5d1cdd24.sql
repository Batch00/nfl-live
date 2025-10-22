-- Create table to store email recipients for halftime reports
CREATE TABLE IF NOT EXISTS public.halftime_email_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.halftime_email_recipients ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to read recipients (public data)
CREATE POLICY "Anyone can read email recipients" 
ON public.halftime_email_recipients 
FOR SELECT 
USING (true);

-- Create policy for anyone to insert recipients (allow self-signup)
CREATE POLICY "Anyone can add email recipients" 
ON public.halftime_email_recipients 
FOR INSERT 
WITH CHECK (true);

-- Create policy for anyone to update recipients
CREATE POLICY "Anyone can update email recipients" 
ON public.halftime_email_recipients 
FOR UPDATE 
USING (true);

-- Create policy for anyone to delete recipients
CREATE POLICY "Anyone can delete email recipients" 
ON public.halftime_email_recipients 
FOR DELETE 
USING (true);

-- Insert the current recipient from environment variable
INSERT INTO public.halftime_email_recipients (email, name, active)
VALUES ('carsonb1723@gmail.com', 'Carson', true)
ON CONFLICT (email) DO NOTHING;