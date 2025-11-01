-- Fix for shared posts display - ensure proper foreign key relationship
-- Update messages table to properly reference posts
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_shared_post_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_shared_post_id_fkey 
FOREIGN KEY (shared_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_messages_shared_post_id ON public.messages(shared_post_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON public.messages(message_type);