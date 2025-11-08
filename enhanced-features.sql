-- Enhanced features SQL tables

-- Add music columns to posts and reels tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS music_name TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS music_artist TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS music_start_time FLOAT DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS music_duration FLOAT DEFAULT 30;

ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_name TEXT;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_artist TEXT;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_url TEXT;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_start_time FLOAT DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS music_duration FLOAT DEFAULT 30;

-- Create themes table for user preferences
CREATE TABLE IF NOT EXISTS public.user_themes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  theme_name TEXT NOT NULL DEFAULT 'dark',
  primary_color TEXT DEFAULT '#0095f6',
  background_color TEXT DEFAULT '#1a1a1a',
  text_color TEXT DEFAULT '#ffffff',
  accent_color TEXT DEFAULT '#ff3040',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create music library table for uploaded music
CREATE TABLE IF NOT EXISTS public.music_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  file_url TEXT NOT NULL,
  duration FLOAT,
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add profile picture and enhanced profile features
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark';

-- Create user settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  show_profile_pic_in_chat BOOLEAN DEFAULT TRUE,
  show_username_in_chat BOOLEAN DEFAULT TRUE,
  theme TEXT DEFAULT 'dark',
  music_autoplay BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for new tables
ALTER TABLE public.user_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their themes" ON public.user_themes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their music" ON public.music_library FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their settings" ON public.user_settings FOR ALL USING (auth.uid() = user_id);

-- Music library is viewable by all for sharing
CREATE POLICY "Music library viewable by all" ON public.music_library FOR SELECT USING (true);

-- Note: Default themes will be created when users first access the theme system