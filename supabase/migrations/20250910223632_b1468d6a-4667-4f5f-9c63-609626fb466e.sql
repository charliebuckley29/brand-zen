-- Remove mentions that were incorrectly assigned to the wrong user
-- These came from the Angela Rayner Google Alert RSS feed but were assigned to user be2eca70-d3d3-4f44-9668-0de07c21796d
-- instead of the correct user 7dc3d2f3-c942-44c6-9a85-1572818931ec

DELETE FROM mentions 
WHERE user_id = 'be2eca70-d3d3-4f44-9668-0de07c21796d' 
AND source_type = 'google_alert'
AND (content_snippet ILIKE '%angela rayner%' OR full_text ILIKE '%angela rayner%');