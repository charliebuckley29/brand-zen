-- Add columns to track when escalation emails were last sent
ALTER TABLE public.mentions 
ADD COLUMN legal_escalated_at timestamp with time zone,
ADD COLUMN pr_escalated_at timestamp with time zone;