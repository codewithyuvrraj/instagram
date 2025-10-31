// Supabase client setup using CDN global `supabase`
// Fill in your project credentials below. Get them from your Supabase dashboard.
const SUPABASE_URL = "https://mybgfmpzsfecadjeobns.supabase.co"; // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmdmbXB6c2ZlY2FkamVvYm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTY4MjcsImV4cCI6MjA3NzQ3MjgyN30.iJ9DL_3HdLawOUnzCDNiGZf1esNVjlRLurrenbHWWHU"; // public anon key

// GitHub Pages domain for global access
const GITHUB_PAGES_URL = "https://codewithyuvrraj.github.io/instagram/";

if (!window.supabase) {
  console.error("Supabase JS not loaded. Check the <script> CDN tag in index.html");
}

// Create unique tab ID for session isolation
const TAB_ID = 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
const SESSION_KEY = `sb_session_${TAB_ID}`;

// Tab-specific storage that doesn't persist across tabs
const tabStorage = {
  data: new Map(),
  getItem: function(key) {
    return this.data.get(key) || null;
  },
  setItem: function(key, value) {
    this.data.set(key, value);
  },
  removeItem: function(key) {
    this.data.delete(key);
  }
};

window.sb = undefined;
try {
  if (SUPABASE_URL.startsWith("http") && SUPABASE_ANON_KEY && window.supabase) {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        redirectTo: GITHUB_PAGES_URL
      }
    });
    console.log('✅ Supabase client initialized successfully');
    console.log('🌐 Site URL:', GITHUB_PAGES_URL);
    
    // Test connection
    window.sb.from('profiles').select('count').limit(1).then(result => {
      console.log('🔗 Database connection test:', result.error ? '❌ Failed' : '✅ Success');
    });
  } else {
    console.error('❌ Supabase initialization failed: Missing URL, key, or CDN');
  }
} catch (e) {
  console.error('❌ Supabase client error:', e);
}

// Optimized for speed - minimal cleanup
window.addEventListener('beforeunload', () => {
  // Fast cleanup
});

// Connection status indicator
setTimeout(() => {
  if (window.sb) {
    console.log('🚀 App ready with Supabase connection');
  } else {
    console.error('⚠️ App started without Supabase connection');
  }
}, 1000);
