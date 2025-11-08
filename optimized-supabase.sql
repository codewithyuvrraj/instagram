-- Add missing columns to existing tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;

ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.reels ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Performance Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_posts_uploaded_at ON public.posts (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_uploaded_by ON public.posts (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_posts_likes ON public.posts (likes_count DESC);

CREATE INDEX IF NOT EXISTS idx_reels_uploaded_at ON public.reels (uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_uploaded_by ON public.reels (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_reels_views ON public.reels (views_count DESC);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Fast RLS Policies
CREATE POLICY "Fast posts access" ON public.posts FOR ALL USING (true);
CREATE POLICY "Fast reels access" ON public.reels FOR ALL USING (true);

-- Functions for fast pagination
CREATE OR REPLACE FUNCTION get_latest_posts(limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE(
  id BIGINT,
  caption TEXT,
  media_url TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP,
  likes_count INTEGER,
  comments_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.caption, p.media_url, p.uploaded_by, p.uploaded_at, p.likes_count, p.comments_count
  FROM public.posts p
  ORDER BY p.uploaded_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_latest_reels(limit_count INTEGER DEFAULT 20, offset_count INTEGER DEFAULT 0)
RETURNS TABLE(
  id BIGINT,
  caption TEXT,
  media_url TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMP,
  likes_count INTEGER,
  views_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.caption, r.media_url, r.uploaded_by, r.uploaded_at, r.likes_count, r.views_count
  FROM public.reels r
  ORDER BY r.uploaded_at DESC
  LIMIT limit_count OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;