# GENZES CHATS - Setup Instructions

## Your New Supabase Project

**Project URL:** https://mybgfmpzsfecadjeobns.supabase.co  
**API Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15YmdmbXB6c2ZlY2FkamVvYm5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE4OTY4MjcsImV4cCI6MjA3NzQ3MjgyN30.iJ9DL_3HdLawOUnzCDNiGZf1esNVjlRLurrenbHWWHU

## Setup Steps

### 1. Database Setup
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/mybgfmpzsfecadjeobns
2. Navigate to the SQL Editor
3. Copy and paste the contents of `SETUP_NEW_PROJECT.sql` into the SQL Editor
4. Click "Run" to execute the SQL commands

### 2. Authentication Setup
1. In your Supabase dashboard, go to Authentication > Settings
2. Enable email authentication
3. Set your site URL to your domain (e.g., `https://yourdomain.com` or `http://localhost:3000` for local development)

### 3. Local Fallback System
The app now includes a local authentication fallback system that works when Supabase is unavailable:

- **Demo Account:** email: `demo@example.com`, password: `demo123`
- Data is stored in localStorage when Supabase is not available
- Automatically switches between Supabase and local storage

### 4. File Structure
```
backup/
├── index.html              # Main app
├── auth.html               # Login/signup page
├── js/
│   ├── supabaseClient.js   # Supabase configuration (updated)
│   ├── localAuth.js        # Local authentication fallback (new)
│   └── auth.js             # Authentication logic
├── SETUP_NEW_PROJECT.sql   # Database setup script (new)
└── SETUP_INSTRUCTIONS.md   # This file (new)
```

### 5. Features Available
- ✅ User authentication (signup/login)
- ✅ Real-time messaging
- ✅ Posts and reels creation
- ✅ User profiles
- ✅ Search functionality
- ✅ Local fallback when Supabase is unavailable
- ✅ Chat themes and customization
- ✅ User presence tracking

### 6. Testing the App
1. Open `auth.html` in your browser
2. Try creating a new account or use the demo account
3. If Supabase is working, you'll see "✅ Supabase client initialized successfully" in the browser console
4. If Supabase is not available, the app will automatically use local storage

### 7. Deployment
- Upload all files to your web server
- Make sure the Supabase credentials are correct in `js/supabaseClient.js`
- The app will work both online (with Supabase) and offline (with local storage)

### 8. Troubleshooting
- Check browser console for any errors
- Verify Supabase project URL and API key
- Make sure you've run the SQL setup script
- The local fallback system will activate automatically if Supabase is unavailable

## Demo Account
If you want to test the app immediately:
- Email: `demo@example.com`
- Password: `demo123`

This account is automatically created in the local storage system for testing purposes.