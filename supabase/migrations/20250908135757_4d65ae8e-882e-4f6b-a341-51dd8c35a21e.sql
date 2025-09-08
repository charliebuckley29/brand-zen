-- Update API keys table with current environment variable values
UPDATE public.api_keys 
SET api_key = 'configured_in_secrets', 
    updated_at = now()
WHERE source_name = 'google_cse';

UPDATE public.api_keys 
SET api_key = 'configured_in_secrets',
    additional_config = '{"cx_id": "configured_in_secrets"}',
    updated_at = now()
WHERE source_name = 'google_cse';

UPDATE public.api_keys 
SET api_key = 'configured_in_secrets', 
    updated_at = now()
WHERE source_name = 'gnews';

UPDATE public.api_keys 
SET api_key = 'configured_in_secrets',
    additional_config = '{"client_secret": "configured_in_secrets"}',
    updated_at = now()
WHERE source_name = 'reddit';

UPDATE public.api_keys 
SET api_key = 'configured_in_secrets', 
    updated_at = now()
WHERE source_name = 'youtube';