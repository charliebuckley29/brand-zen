-- Create bug reports table
create table "public"."bug_reports" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "title" text not null,
  "description" text not null,
  "steps_to_reproduce" text,
  "expected_behavior" text,
  "actual_behavior" text,
  "browser_info" jsonb,
  "console_logs" text,
  "screenshots" text[], -- URLs to uploaded screenshots
  "status" text not null default 'open',
  "priority" text not null default 'medium',
  "assigned_to" uuid, -- moderator/admin assigned
  "internal_notes" text[],
  "tags" text[],
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "resolved_at" timestamp with time zone
);

-- Add constraints for status and priority
alter table "public"."bug_reports" add constraint "bug_reports_status_check" 
CHECK ((status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'wont_fix'::text])));

alter table "public"."bug_reports" add constraint "bug_reports_priority_check" 
CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])));

-- Add indexes for performance
CREATE INDEX idx_bug_reports_user_id ON public.bug_reports USING btree (user_id);
CREATE INDEX idx_bug_reports_status ON public.bug_reports USING btree (status);
CREATE INDEX idx_bug_reports_priority ON public.bug_reports USING btree (priority);
CREATE INDEX idx_bug_reports_assigned_to ON public.bug_reports USING btree (assigned_to);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports USING btree (created_at DESC);

-- Set primary key
alter table "public"."bug_reports" add constraint "bug_reports_pkey" PRIMARY KEY ("id");

-- Add foreign key constraints
alter table "public"."bug_reports" add constraint "bug_reports_user_id_fkey" 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."bug_reports" add constraint "bug_reports_assigned_to_fkey" 
FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Enable RLS
alter table "public"."bug_reports" enable row level security;

-- RLS Policies
-- Users can view their own bug reports
create policy "Users can view their own bug reports"
on "public"."bug_reports"
as permissive
for select
to public
using ((auth.uid() = user_id));

-- Users can create their own bug reports
create policy "Users can create bug reports"
on "public"."bug_reports"
as permissive
for insert
to public
with check ((auth.uid() = user_id));

-- Users can update their own bug reports (limited fields)
create policy "Users can update their own bug reports"
on "public"."bug_reports"
as permissive
for update
to public
using ((auth.uid() = user_id));

-- Moderators and admins can view all bug reports
create policy "Moderators can view all bug reports"
on "public"."bug_reports"
as permissive
for select
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));

-- Moderators and admins can update all bug reports
create policy "Moderators can update all bug reports"
on "public"."bug_reports"
as permissive
for update
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));

-- Moderators and admins can delete bug reports
create policy "Moderators can delete bug reports"
on "public"."bug_reports"
as permissive
for delete
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));

-- Add updated_at trigger
CREATE TRIGGER update_bug_reports_updated_at 
BEFORE UPDATE ON public.bug_reports 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create bug report comments table for internal notes and user communication
create table "public"."bug_report_comments" (
  "id" uuid not null default gen_random_uuid(),
  "bug_report_id" uuid not null,
  "user_id" uuid not null,
  "comment" text not null,
  "is_internal" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

-- Set primary key and foreign keys for comments
alter table "public"."bug_report_comments" add constraint "bug_report_comments_pkey" PRIMARY KEY ("id");

alter table "public"."bug_report_comments" add constraint "bug_report_comments_bug_report_id_fkey" 
FOREIGN KEY (bug_report_id) REFERENCES bug_reports(id) ON DELETE CASCADE;

alter table "public"."bug_report_comments" add constraint "bug_report_comments_user_id_fkey" 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for comments
CREATE INDEX idx_bug_report_comments_bug_report_id ON public.bug_report_comments USING btree (bug_report_id);
CREATE INDEX idx_bug_report_comments_created_at ON public.bug_report_comments USING btree (created_at DESC);

-- Enable RLS for comments
alter table "public"."bug_report_comments" enable row level security;

-- RLS Policies for comments
-- Users can view non-internal comments on their own bug reports
create policy "Users can view comments on their bug reports"
on "public"."bug_report_comments"
as permissive
for select
to public
using (
  (bug_report_id IN (SELECT id FROM bug_reports WHERE user_id = auth.uid()))
  AND (is_internal = false OR has_access_level(auth.uid(), 'moderator'::user_type))
);

-- Users can add comments to their own bug reports
create policy "Users can comment on their bug reports"
on "public"."bug_report_comments"
as permissive
for insert
to public
with check (
  (bug_report_id IN (SELECT id FROM bug_reports WHERE user_id = auth.uid()))
  AND (auth.uid() = user_id)
  AND (is_internal = false)
);

-- Moderators can view all comments
create policy "Moderators can view all comments"
on "public"."bug_report_comments"
as permissive
for select
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));

-- Moderators can add comments (including internal)
create policy "Moderators can add comments"
on "public"."bug_report_comments"
as permissive
for insert
to public
with check (has_access_level(auth.uid(), 'moderator'::user_type));

-- Moderators can update comments
create policy "Moderators can update comments"
on "public"."bug_report_comments"
as permissive
for update
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));

-- Moderators can delete comments
create policy "Moderators can delete comments"
on "public"."bug_report_comments"
as permissive
for delete
to public
using (has_access_level(auth.uid(), 'moderator'::user_type));
