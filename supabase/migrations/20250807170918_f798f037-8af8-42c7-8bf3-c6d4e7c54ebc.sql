-- Create keywords table for brand monitoring
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  variants TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentions table for storing brand mentions
CREATE TABLE public.mentions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.keywords(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL UNIQUE,
  source_name TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL,
  content_snippet TEXT NOT NULL,
  full_text TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  topics TEXT[] DEFAULT '{}',
  flagged BOOLEAN DEFAULT false,
  escalation_type TEXT DEFAULT 'none' CHECK (escalation_type IN ('none', 'legal', 'pr')),
  internal_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table for monthly summaries
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_month TEXT NOT NULL,
  total_mentions INTEGER DEFAULT 0,
  negatives INTEGER DEFAULT 0,
  positives INTEGER DEFAULT 0,
  neutrals INTEGER DEFAULT 0,
  top_sources TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_month)
);

-- Enable Row Level Security
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for keywords
CREATE POLICY "Users can view their own keywords" 
ON public.keywords 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keywords" 
ON public.keywords 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords" 
ON public.keywords 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords" 
ON public.keywords 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for mentions
CREATE POLICY "Users can view their own mentions" 
ON public.mentions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own mentions" 
ON public.mentions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mentions" 
ON public.mentions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mentions" 
ON public.mentions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for reports
CREATE POLICY "Users can view their own reports" 
ON public.reports 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports" 
ON public.reports 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports" 
ON public.reports 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports" 
ON public.reports 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_keywords_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentions_updated_at
  BEFORE UPDATE ON public.mentions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_mentions_user_id ON public.mentions(user_id);
CREATE INDEX idx_mentions_sentiment ON public.mentions(sentiment);
CREATE INDEX idx_mentions_published_at ON public.mentions(published_at);
CREATE INDEX idx_mentions_flagged ON public.mentions(flagged);
CREATE INDEX idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX idx_reports_user_id ON public.reports(user_id);