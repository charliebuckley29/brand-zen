-- Add X (Twitter) API to the api_keys table
INSERT INTO public.api_keys (source_name, api_key, additional_config, is_active) 
VALUES ('x_twitter', NULL, '{"bearer_token": null}', true)
ON CONFLICT (source_name) DO NOTHING;