-- Shared posts table
CREATE TABLE IF NOT EXISTS public.shared_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies for shared posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_posts' AND policyname = 'Users can view shared posts sent to them') THEN
    CREATE POLICY "Users can view shared posts sent to them" ON public.shared_posts FOR SELECT USING (auth.uid() = receiver_id OR auth.uid() = sender_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'shared_posts' AND policyname = 'Users can share posts') THEN
    CREATE POLICY "Users can share posts" ON public.shared_posts FOR INSERT WITH CHECK (auth.uid() = sender_id);
  END IF;
END $$;