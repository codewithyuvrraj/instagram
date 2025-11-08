-- Fix avatar display for existing real users
-- Generate avatar URLs dynamically based on user's name
UPDATE public.profiles 
SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(COALESCE(full_name, username), ' ', '+') || '&background=random&color=fff&size=150'
WHERE avatar_url IS NULL OR avatar_url = '' OR avatar_url = 'null';

-- Remove test users if they exist
DELETE FROM public.profiles 
WHERE username IN ('testuser1', 'testuser2', 'johndoe') 
AND email LIKE '%@example.com';