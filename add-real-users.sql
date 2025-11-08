-- Add real users for testing three dots functionality
INSERT INTO public.profiles (id, username, full_name, email, avatar_url, bio)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'john_smith', 'John Smith', 'john.smith@gmail.com', 'https://ui-avatars.com/api/?name=John+Smith&background=667eea&color=fff&size=150', 'Software Engineer at Tech Corp'),
  ('22222222-2222-2222-2222-222222222222', 'emma_wilson', 'Emma Wilson', 'emma.wilson@gmail.com', 'https://ui-avatars.com/api/?name=Emma+Wilson&background=764ba2&color=fff&size=150', 'UX Designer and Creative Director'),
  ('33333333-3333-3333-3333-333333333333', 'mike_johnson', 'Mike Johnson', 'mike.johnson@gmail.com', 'https://ui-avatars.com/api/?name=Mike+Johnson&background=e1306c&color=fff&size=150', 'Marketing Manager'),
  ('44444444-4444-4444-4444-444444444444', 'sarah_davis', 'Sarah Davis', 'sarah.davis@gmail.com', 'https://ui-avatars.com/api/?name=Sarah+Davis&background=ff6b9d&color=fff&size=150', 'Product Manager'),
  ('55555555-5555-5555-5555-555555555555', 'alex_brown', 'Alex Brown', 'alex.brown@gmail.com', 'https://ui-avatars.com/api/?name=Alex+Brown&background=4facfe&color=fff&size=150', 'Data Scientist')
ON CONFLICT (id) DO NOTHING;