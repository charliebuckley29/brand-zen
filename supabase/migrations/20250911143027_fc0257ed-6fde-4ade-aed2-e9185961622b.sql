-- Add notification preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN notification_preferences jsonb DEFAULT '{"sms": false, "whatsapp": false}'::jsonb;

-- Create admin settings table for Twilio configuration
CREATE TABLE public.admin_twilio_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_sid text,
  auth_token text,
  whatsapp_from text,
  sms_from text,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_twilio_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for admin Twilio settings
CREATE POLICY "Admins can manage Twilio settings" 
ON public.admin_twilio_settings 
FOR ALL 
USING (has_access_level(auth.uid(), 'admin'::user_type));

-- Create trigger for timestamps on admin_twilio_settings
CREATE TRIGGER update_admin_twilio_settings_updated_at
BEFORE UPDATE ON public.admin_twilio_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();