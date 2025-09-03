-- Remove the problematic notify_n8n function that's causing insertion failures
DROP FUNCTION IF EXISTS public.notify_n8n() CASCADE;