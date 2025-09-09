-- Create storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-report-screenshots', 'bug-report-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for bug report screenshots
CREATE POLICY "Users can upload their own bug report screenshots"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'bug-report-screenshots' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view bug report screenshots"
ON storage.objects
FOR SELECT
USING (bucket_id = 'bug-report-screenshots');

CREATE POLICY "Moderators and admins can manage all bug report screenshots"
ON storage.objects
FOR ALL
USING (
  bucket_id = 'bug-report-screenshots' AND
  has_access_level(auth.uid(), 'moderator'::user_type)
);
