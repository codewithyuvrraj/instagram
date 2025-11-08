-- Posts table (for images only)
CREATE TABLE IF NOT EXISTS public.posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('image')),
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Reels table (for videos only)
CREATE TABLE IF NOT EXISTS public.reels (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  caption TEXT,
  media_url TEXT NOT NULL,
  media_type TEXT CHECK (media_type IN ('video')),
  uploaded_by TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all operations for now - adjust as needed)
CREATE POLICY "Allow all operations on posts" ON public.posts FOR ALL USING (true);
CREATE POLICY "Allow all operations on reels" ON public.reels FOR ALL USING (true);