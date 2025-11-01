// Fast Supabase Setup
const SUPABASE_URL = "https://mybgfmpzsfecadjeobns.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmdmbXB6c2ZlY2FkamVvYm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTY4MjcsImV4cCI6MjA3NzQ3MjgyN30.iJ9DL_3HdLawOUnzCDNiGZf1esNVjlRLurrenbHWWHU";

// Fast initialization
if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: true }
  });
  console.log('⚡ Supabase ready');
} else {
  console.log('⚡ Using local auth');
}
