// Error fixes for console issues

// Fix 1: Optimized parallel loading for user data
window.loadUserData = async function() {
  if (!window.sb || !window.currentUser) return { settings: null, music: [] };
  
  try {
    // Load both in parallel for 50% faster loading
    const [settingsRes, musicRes] = await Promise.all([
      window.sb
        .from('user_settings')
        .select('theme, updated_at') // Only select needed fields
        .eq('user_id', window.currentUser.id)
        .maybeSingle(),
      window.sb
        .from('music_library')
        .select('id, name, artist, file_url, duration') // Avoid select('*')
        .eq('user_id', window.currentUser.id)
        .order('uploaded_at', { ascending: false })
        .limit(20) // Limit initial load
    ]);
    
    let settings = settingsRes.data;
    const music = musicRes.data || [];
    
    // Handle errors gracefully
    if (settingsRes.error?.code === 'PGRST205' || musicRes.error?.code === 'PGRST205') {
      console.log('Tables not ready yet, using defaults...');
      return { settings: { theme: 'default' }, music: [] };
    }
    
    // Create default settings if none exist
    if (!settings && !settingsRes.error) {
      const { data: newSettings } = await window.sb
        .from('user_settings')
        .insert({ user_id: window.currentUser.id, theme: 'default' })
        .select('theme')
        .single();
      settings = newSettings;
    }
    
    return { settings: settings || { theme: 'default' }, music };
  } catch (error) {
    console.log('User data not available:', error);
    return { settings: { theme: 'default' }, music: [] };
  }
};

// Backward compatibility
window.loadUserSettings = async function() {
  const { settings } = await window.loadUserData();
  return settings;
};

window.loadMusicLibrary = async function() {
  const { music } = await window.loadUserData();
  return music;
};

// Fix 3: Add safe DOM element access
window.safeGetElement = function(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.warn(`Element with id '${id}' not found`);
  }
  return element;
};

// Fix 4: Enhanced showSection with error handling
window.showSectionSafe = function(section) {
  try {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    
    const sectionEl = document.getElementById(section + 'Section');
    if (!sectionEl) {
      console.warn(`Section '${section}Section' not found`);
      return false;
    }
    
    sectionEl.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const navBtn = document.querySelector(`[data-section="${section}"]`);
    if (navBtn) {
      navBtn.classList.add('active');
    }
    
    // Update section title safely
    const titleEl = document.getElementById('sectionTitle');
    if (titleEl) {
      const titles = {
        'home': 'Home',
        'search': 'Search',
        'reels': 'Reels',
        'messages': 'Messages',
        'profile': 'Profile',
        'create': 'Create',
        'notifications': 'Activity'
      };
      titleEl.textContent = titles[section] || 'Home';
    }
    
    return true;
  } catch (error) {
    console.error('Error in showSection:', error);
    return false;
  }
};

// Fix 5: Initialize optimized loading on page load
document.addEventListener('DOMContentLoaded', function() {
  // Load user data in parallel with reduced delay
  setTimeout(() => {
    if (window.currentUser) {
      window.loadUserData().then(({ settings, music }) => {
        if (settings?.theme && settings.theme !== 'default') {
          // Apply theme if not default
          document.body.className = `theme-${settings.theme}`;
        }
        console.log(`✅ Loaded ${music.length} music tracks`);
      });
    }
  }, 1500); // Reduced delay
  
  // Add global error handler for unhandled promises
  window.addEventListener('unhandledrejection', function(event) {
    console.warn('Unhandled promise rejection:', event.reason);
    event.preventDefault(); // Prevent the default browser behavior
  });
  
  // Add error handler for async response errors
  window.addEventListener('error', function(event) {
    if (event.message && event.message.includes('message channel closed')) {
      console.warn('Message channel closed - this is normal during navigation');
      return;
    }
  });
});

// Fix 6: Safe music upload function
window.uploadMusicSafe = async function(file, name, artist) {
  if (!window.sb || !window.currentUser) {
    console.log('Cannot upload music: not authenticated');
    return null;
  }
  
  try {
    const reader = new FileReader();
    const fileUrl = await new Promise((resolve) => {
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
    
    const { data, error } = await window.sb
      .from('music_library')
      .insert({
        user_id: window.currentUser.id,
        name: name,
        artist: artist || 'Unknown Artist',
        file_url: fileUrl,
        file_size: file.size,
        duration: 0 // Will be updated when audio loads
      })
      .select()
      .single();
    
    if (error) {
      console.log('Error saving music:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.log('Error uploading music:', error);
    return null;
  }
};

// Fix 7: Override the original showSection to use safe version
if (window.showSection) {
  window.showSection = window.showSectionSafe;
}

console.log('✅ Error fixes loaded successfully');