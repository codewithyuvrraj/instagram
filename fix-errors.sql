-- Fix all console errors by creating missing tables and policies

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  theme TEXT DEFAULT 'default',
  notifications BOOLEAN DEFAULT TRUE,
  privacy_mode BOOLEAN DEFAULT FALSE,
  auto_save_drafts BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create music_library table
CREATE TABLE IF NOT EXISTS public.music_library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  artist TEXT,
  file_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  file_size BIGINT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_library ENABLE ROW LEVEL SECURITY;

-- User settings policies
CREATE POLICY "Users can view their own settings" ON public.user_settings 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own settings" ON public.user_settings 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings 
  FOR UPDATE USING (auth.uid() = user_id);

-- Music library policies
CREATE POLICY "Users can view their own music" ON public.music_library 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own music" ON public.music_library 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own music" ON public.music_library 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own music" ON public.music_library 
  FOR DELETE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_music_library_user_id ON public.music_library(user_id);
CREATE INDEX IF NOT EXISTS idx_music_library_uploaded_at ON public.music_library(uploaded_at DESC);

-- Insert default settings for existing users (if any)
INSERT INTO public.user_settings (user_id, theme, notifications, privacy_mode, auto_save_drafts)
SELECT id, 'default', true, false, true 
FROM auth.users 
WHERE id NOT IN (SELECT user_id FROM public.user_settings WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;