-- Add shared post support to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS shared_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- Update messages table to support different message types
-- message_type can be: 'text', 'file', 'shared_post'