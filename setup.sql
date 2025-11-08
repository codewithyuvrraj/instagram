-- Simple test setup for three dots functionality
-- Run this in your Supabase SQL Editor

-- Create a test user profile if it doesn't exist
INSERT INTO public.profiles (id, username, full_name, avatar_url, bio, created_at)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'testuser1', 'Test User One', 'https://via.placeholder.com/150', 'This is a test bio for user one', NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'testuser2', 'Test User Two', NULL, 'Another test user bio', NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'johndoe', 'John Doe', 'https://via.placeholder.com/150/0000FF/FFFFFF?text=JD', 'Software developer and tech enthusiast', NOW())
ON CONFLICT (id) DO NOTHING;

-- Verify the profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;