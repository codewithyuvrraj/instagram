// Supabase client setup using CDN global `supabase`
// Fill in your project credentials below. Get them from your Supabase dashboard.
const SUPABASE_URL = "https://bycvoxwdiivlvotbwyyt.supabase.co"; // e.g. https://xyzcompany.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5Y3ZveHdkaWl2bHZvdGJ3eXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4OTY0NDAsImV4cCI6MjA3NDQ3MjQ0MH0.VHnElCBEwAIYRoFlm9jo13aQzH8LxqhdQQ_AwkU9TDE"; // public anon key

// GitHub Pages domain for global access
const GITHUB_PAGES_URL = "https://codewithyuvrraj.github.io/yuvrajchat/";

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
