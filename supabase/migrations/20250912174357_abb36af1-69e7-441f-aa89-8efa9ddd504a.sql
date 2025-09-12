-- Create table to track API usage (simplified index)
CREATE TABLE public.api_usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_source TEXT NOT NULL,
  endpoint TEXT,
  calls_count INTEGER NOT NULL DEFAULT 1,
  user_id UUID,
  edge_function TEXT,
  response_status INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Service role can insert API usage" 
ON public.api_usage_tracking 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Admins can view all API usage" 
ON public.api_usage_tracking 
FOR SELECT 
USING (has_access_level(auth.uid(), 'admin'::user_type));

-- Create indexes for better performance
CREATE INDEX idx_api_usage_tracking_source ON public.api_usage_tracking(api_source);
CREATE INDEX idx_api_usage_tracking_created_at ON public.api_usage_tracking(created_at);

-- Create function to log API usage (to be called from edge functions)
CREATE OR REPLACE FUNCTION public.log_api_usage(
  _api_source text,
  _endpoint text DEFAULT null,
  _user_id uuid DEFAULT null,
  _edge_function text DEFAULT null,
  _response_status integer DEFAULT 200,
  _calls_count integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.api_usage_tracking (
    api_source, 
    endpoint, 
    user_id, 
    edge_function, 
    response_status,
    calls_count
  )
  VALUES (
    _api_source, 
    _endpoint, 
    _user_id, 
    _edge_function, 
    _response_status,
    _calls_count
  );
END;
$function$;