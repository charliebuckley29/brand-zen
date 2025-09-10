-- Create a table to track user fetch history
CREATE TABLE public.user_fetch_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  fetch_type TEXT NOT NULL DEFAULT 'manual', -- 'manual' or 'automated'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  successful_keywords INTEGER DEFAULT 0,
  failed_keywords INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_fetch_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own fetch history" 
ON public.user_fetch_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fetch history" 
ON public.user_fetch_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update fetch history" 
ON public.user_fetch_history 
FOR UPDATE 
USING (true);

CREATE POLICY "Moderators can view all fetch history" 
ON public.user_fetch_history 
FOR SELECT 
USING (has_access_level(auth.uid(), 'moderator'::user_type));

-- Create index for performance
CREATE INDEX idx_user_fetch_history_user_id ON public.user_fetch_history(user_id);
CREATE INDEX idx_user_fetch_history_started_at ON public.user_fetch_history(started_at);

-- Function to check if user can fetch based on frequency
CREATE OR REPLACE FUNCTION public.can_user_fetch(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_frequency AS (
    SELECT COALESCE(fetch_frequency_minutes, 15) as frequency_minutes
    FROM profiles 
    WHERE user_id = _user_id
  ),
  last_fetch AS (
    SELECT started_at
    FROM user_fetch_history
    WHERE user_id = _user_id
    ORDER BY started_at DESC
    LIMIT 1
  )
  SELECT CASE
    WHEN last_fetch.started_at IS NULL THEN TRUE
    WHEN EXTRACT(EPOCH FROM (now() - last_fetch.started_at)) / 60 >= user_frequency.frequency_minutes THEN TRUE
    ELSE FALSE
  END
  FROM user_frequency
  LEFT JOIN last_fetch ON true;
$$;

-- Function to get minutes until user can fetch again
CREATE OR REPLACE FUNCTION public.minutes_until_user_can_fetch(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH user_frequency AS (
    SELECT COALESCE(fetch_frequency_minutes, 15) as frequency_minutes
    FROM profiles 
    WHERE user_id = _user_id
  ),
  last_fetch AS (
    SELECT started_at
    FROM user_fetch_history
    WHERE user_id = _user_id
    ORDER BY started_at DESC
    LIMIT 1
  )
  SELECT CASE
    WHEN last_fetch.started_at IS NULL THEN 0
    ELSE GREATEST(0, user_frequency.frequency_minutes - EXTRACT(EPOCH FROM (now() - last_fetch.started_at)) / 60)::INTEGER
  END
  FROM user_frequency
  LEFT JOIN last_fetch ON true;
$$;