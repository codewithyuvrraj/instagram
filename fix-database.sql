-- Fix database structure and add missing columns
-- Run this in your Supabase SQL Editor

-- Add missing columns to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS links TEXT,
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivation_password TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Insert test users (will skip if they already exist)
INSERT INTO public.profiles (id, username, full_name, email, avatar_url, bio)
VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'testuser1', 'Test User One', 'testuser1@example.com', 'https://via.placeholder.com/150', 'This is a test bio'),
  ('550e8400-e29b-41d4-a716-446655440002', 'testuser2', 'Test User Two', 'testuser2@example.com', NULL, 'Another test user'),
  ('550e8400-e29b-41d4-a716-446655440003', 'johndoe', 'John Doe', 'johndoe@example.com', 'https://via.placeholder.com/150/0000FF/FFFFFF?text=JD', 'Software developer')
ON CONFLICT (id) DO NOTHING;