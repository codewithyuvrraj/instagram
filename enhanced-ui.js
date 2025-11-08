// Enhanced UI Features

// Theme Management
const themes = {
  dark: {
    name: 'Dark',
    primary: '#0095f6',
    background: '#1a1a1a',
    backgroundDarker: '#0f0f0f',
    text: '#ffffff',
    accent: '#ff3040',
    border: 'rgba(255, 255, 255, 0.1)'
  },
  red: {
    name: 'Red Theme',
    primary: '#ff3040',
    background: '#1a0f0f',
    backgroundDarker: '#0f0505',
    text: '#ffffff',
    accent: '#ff6b7a',
    border: 'rgba(255, 48, 64, 0.2)'
  },
  blackWhite: {
    name: 'Black & White',
    primary: '#ffffff',
    background: '#000000',
    backgroundDarker: '#111111',
    text: '#ffffff',
    accent: '#cccccc',
    border: 'rgba(255, 255, 255, 0.2)'
  },
  blue: {
    name: 'Blue Ocean',
    primary: '#1e90ff',
    background: '#0a1929',
    backgroundDarker: '#051219',
    text: '#ffffff',
    accent: '#87ceeb',
    border: 'rgba(30, 144, 255, 0.2)'
  }
};

// Apply theme
function applyTheme(themeName) {
  const theme = themes[themeName];
  if (!theme) return;
  
  const root = document.documentElement;
  root.style.setProperty('--primary', theme.primary);
  root.style.setProperty('--bg-dark', theme.background);
  root.style.setProperty('--bg-darker', theme.backgroundDarker);
  root.style.setProperty('--text-color', theme.text);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--border', theme.border);
  
  // Save theme preference
  localStorage.setItem('selectedTheme', themeName);
  if (window.currentUser) {
    saveThemeToDatabase(themeName);
  }
}

// Save theme to database
async function saveThemeToDatabase(themeName) {
  try {
    await window.sb
      .from('user_settings')
      .upsert({
        user_id: window.currentUser.id,
        theme: themeName,
        updated_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error saving theme:', error);
  }
}

// Load user theme
async function loadUserTheme() {
  try {
    const { data: settings } = await window.sb
      .from('user_settings')
      .select('theme')
      .eq('user_id', window.currentUser.id)
      .single();
    
    const themeName = settings?.theme || localStorage.getItem('selectedTheme') || 'dark';
    applyTheme(themeName);
  } catch (error) {
    const themeName = localStorage.getItem('selectedTheme') || 'dark';
    applyTheme(themeName);
  }
}

// Enhanced search with profile modal
window.searchUsers = async function(query) {
  const currentUser = window.currentUser;
  try {
    let users;
    let error;
    
    if (!query || query.trim().length < 2) {
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        if (query && query.trim().length < 2) {
          searchResults.innerHTML = '<div class="search-hint">💡 Type at least 2 characters to search</div>';
        } else {
          const result = await window.sb
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
          users = result.data;
          error = result.error;
        }
      }
      if (query && query.trim().length < 2) return;
    } else {
      const result = await window.sb
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query.trim()}%,full_name.ilike.%${query.trim()}%`)
        .order('username', { ascending: true })
        .limit(50);
      users = result.data;
      error = result.error;
    }

    if (error) throw error;

    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;

    let html = '';
    
    if (!query || !query.trim()) {
      html += '<div class="all-users-header"><h3>🌍 All Users on GENZES CHATS</h3></div>';
    } else {
      html += `<div class="search-results-header"><h3>🔍 Search Results for "${query}"</h3></div>`;
    }
    
    if (users && users.length > 0) {
      users.forEach(user => {
        if (currentUser && user.id === currentUser.id) return;
        
        html += `
          <div class="user-item" onclick="openUserProfile('${user.id}', '${user.username}')">
            <div class="user-avatar">
              ${user.avatar_url && user.avatar_url.trim() ? 
                `<img src="${user.avatar_url}" alt="${user.username}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" />` : 
                `<div class="avatar-placeholder" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 1.2rem;">${user.username?.[0]?.toUpperCase() || 'U'}</div>`
              }
            </div>
            <div class="user-info">
              <div class="user-name">@${user.username}</div>
              <div class="user-fullname">${user.full_name || 'No name provided'}</div>
              ${user.bio ? `<div class="user-bio">${user.bio.length > 50 ? user.bio.substring(0, 50) + '...' : user.bio}</div>` : ''}
            </div>
          </div>
        `;
      });
    } else {
      html += '<div class="no-results">❌ No users found</div>';
    }

    searchResults.innerHTML = html;

  } catch (error) {
    console.error('❌ Error searching users:', error);
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.innerHTML = '<div class="error-message">❌ Error loading users</div>';
    }
  }
}

// Open user profile modal
window.openUserProfile = async function(userId, username) {
  try {
    // Get user profile with follow status
    const { data: profile } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Check if following
    const { data: followData } = await window.sb
      .from('follows')
      .select('id')
      .eq('follower_id', window.currentUser.id)
      .eq('followee_id', userId)
      .maybeSingle();

    const isFollowing = !!followData;

    // Get posts count
    const { count: postsCount } = await window.sb
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get followers count
    const { count: followersCount } = await window.sb
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', userId);

    // Get following count
    const { count: followingCount } = await window.sb
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    // Show profile modal
    const modal = document.getElementById('userProfileModal') || createUserProfileModal();
    
    modal.innerHTML = `
      <div class="modal-backdrop" onclick="closeUserProfileModal()"></div>
      <div class="modal-dialog" style="max-width: 600px;">
        <div class="modal-header">
          <h3>Profile</h3>
          <button class="close-btn" onclick="closeUserProfileModal()">×</button>
        </div>
        <div class="profile-content" style="padding: 20px;">
          <div class="profile-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
            <div class="profile-avatar-large" style="width: 100px; height: 100px; border-radius: 50%; overflow: hidden; background: #ddd;">
              ${profile.avatar_url ? 
                `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />` :
                `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 2rem; font-weight: 600;">${profile.username?.[0]?.toUpperCase() || 'U'}</div>`
              }
            </div>
            <div class="profile-details" style="flex: 1;">
              <h2 style="margin: 0 0 10px 0;">@${profile.username}</h2>
              <div class="profile-stats" style="display: flex; gap: 20px; margin-bottom: 15px;">
                <span><strong>${postsCount || 0}</strong> posts</span>
                <span><strong>${followersCount || 0}</strong> followers</span>
                <span><strong>${followingCount || 0}</strong> following</span>
              </div>
              <div class="profile-actions" style="display: flex; gap: 10px;">
                <button class="btn ${isFollowing ? 'btn-accent' : 'btn-primary'}" onclick="followUserFromProfile('${userId}')" id="followBtn-${userId}">
                  ${isFollowing ? 'Following' : 'Follow'}
                </button>
                <button class="btn btn-secondary" onclick="startDirectMessageFromProfile('${userId}', '${profile.username}')">
                  Message
                </button>
              </div>
            </div>
          </div>
          
          ${profile.full_name ? `<div style="margin-bottom: 10px;"><strong>${profile.full_name}</strong></div>` : ''}
          ${profile.bio ? `<div style="margin-bottom: 15px; color: #ccc;">${profile.bio}</div>` : ''}
          ${profile.links ? `<div style="margin-bottom: 15px;"><a href="${profile.links}" target="_blank" style="color: #0095f6;">${profile.links}</a></div>` : ''}
        </div>
      </div>
    `;
    
    modal.classList.remove('hidden');
    
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Error loading profile');
  }
}

// Create user profile modal if it doesn't exist
function createUserProfileModal() {
  const modal = document.createElement('div');
  modal.id = 'userProfileModal';
  modal.className = 'modal hidden';
  document.body.appendChild(modal);
  return modal;
}

// Close user profile modal
window.closeUserProfileModal = function() {
  const modal = document.getElementById('userProfileModal');
  if (modal) modal.classList.add('hidden');
}

// Follow user from profile
window.followUserFromProfile = async function(userId) {
  const followBtn = document.getElementById(`followBtn-${userId}`);
  const originalText = followBtn.textContent;
  
  try {
    followBtn.disabled = true;
    followBtn.textContent = 'Loading...';
    
    const { data: existingFollow } = await window.sb
      .from('follows')
      .select('id')
      .eq('follower_id', window.currentUser.id)
      .eq('followee_id', userId)
      .maybeSingle();
    
    if (existingFollow) {
      // Unfollow
      await window.sb
        .from('follows')
        .delete()
        .eq('follower_id', window.currentUser.id)
        .eq('followee_id', userId);
      
      followBtn.textContent = 'Follow';
      followBtn.className = 'btn btn-primary';
    } else {
      // Follow
      await window.sb
        .from('follows')
        .insert({
          follower_id: window.currentUser.id,
          followee_id: userId
        });
      
      followBtn.textContent = 'Following';
      followBtn.className = 'btn btn-accent';
    }
    
    // Refresh chats
    if (window.loadChats) window.loadChats();
    
  } catch (error) {
    console.error('Error following user:', error);
    followBtn.textContent = originalText;
  } finally {
    followBtn.disabled = false;
  }
}

// Start message from profile
window.startDirectMessageFromProfile = function(userId, username) {
  closeUserProfileModal();
  window.showSection('messages');
  setTimeout(() => {
    window.openChat(userId, username);
  }, 300);
}

// Enhanced loadMessages with profile pictures and usernames
window.loadMessages = async function(partnerId) {
  const currentUser = window.currentUser;
  try {
    // Get messages
    const { data: messages, error } = await window.sb
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
      .eq('unsent', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get partner profile
    const { data: partnerProfile } = await window.sb
      .from('profiles')
      .select('username, avatar_url, profile_picture_url')
      .eq('id', partnerId)
      .single();

    // Get current user profile
    const { data: currentProfile } = await window.sb
      .from('profiles')
      .select('username, avatar_url, profile_picture_url')
      .eq('id', currentUser.id)
      .single();

    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    let html = '';
    let lastDate = '';
    
    messages?.forEach((message, index) => {
      const isMe = message.sender_id === currentUser.id;
      const messageDate = new Date(message.created_at).toDateString();
      const editedText = message.edited ? ' (edited)' : '';
      
      // Get sender info
      const senderProfile = isMe ? currentProfile : partnerProfile;
      const senderName = senderProfile?.username || 'User';
      const senderAvatar = senderProfile?.profile_picture_url || senderProfile?.avatar_url;
      
      // Add date separator
      if (messageDate !== lastDate) {
        html += `<div class="date-separator">${formatDate(message.created_at)}</div>`;
        lastDate = messageDate;
      }
      
      // Group consecutive messages
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
      const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
      
      html += `
        <div class="message-wrapper ${isMe ? 'me' : 'them'}">
          ${!isMe && isFirstInGroup ? `
            <div class="message-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              ${senderAvatar ? 
                `<img src="${senderAvatar}" style="width: 20px; height: 20px; border-radius: 50%; object-fit: cover;" />` :
                `<div style="width: 20px; height: 20px; border-radius: 50%; background: #0095f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;">${senderName[0]?.toUpperCase()}</div>`
              }
              <span class="message-sender" style="font-size: 0.75rem; color: #8e8e8e; font-weight: 500;">${senderName}</span>
            </div>
          ` : ''}
          <div class="message ${isFirstInGroup ? 'first' : ''} ${isLastInGroup ? 'last' : ''}" data-message-id="${message.id}">
            <div class="message-content">
              <div class="message-text">${message.content || 'Media'}${editedText}</div>
              ${isLastInGroup ? `<div class="message-time">${formatTime(message.created_at)}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    });
    
    if (!messages?.length) {
      html = `
        <div class="empty-messages">
          <div class="empty-icon">👋</div>
          <p>Start your conversation with ${partnerProfile?.username || 'User'}</p>
        </div>
      `;
    }

    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error('❌ Error loading messages:', error);
  }
}

// Theme selector modal
window.openThemeSelector = function() {
  const modal = document.getElementById('themeModal') || createThemeModal();
  modal.classList.remove('hidden');
}

function createThemeModal() {
  const modal = document.createElement('div');
  modal.id = 'themeModal';
  modal.className = 'modal hidden';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="closeThemeModal()"></div>
    <div class="modal-dialog">
      <div class="modal-header">
        <h3>Choose Theme</h3>
        <button class="close-btn" onclick="closeThemeModal()">×</button>
      </div>
      <div class="theme-grid" style="padding: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
        ${Object.entries(themes).map(([key, theme]) => `
          <div class="theme-option" onclick="selectTheme('${key}')" style="padding: 15px; border-radius: 12px; cursor: pointer; text-align: center; border: 2px solid transparent; background: ${theme.background}; color: ${theme.text};">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${theme.primary}; margin: 0 auto 10px;"></div>
            <div style="font-weight: 600;">${theme.name}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

window.selectTheme = function(themeName) {
  applyTheme(themeName);
  closeThemeModal();
}

window.closeThemeModal = function() {
  const modal = document.getElementById('themeModal');
  if (modal) modal.classList.add('hidden');
}

// Initialize enhanced features
window.initEnhancedFeatures = function() {
  // Load user theme
  if (window.currentUser) {
    loadUserTheme();
  } else {
    applyTheme('dark');
  }
  
  // Add theme button to header if not exists
  const headerActions = document.querySelector('.header-actions');
  if (headerActions && !document.getElementById('themeBtn')) {
    const themeBtn = document.createElement('button');
    themeBtn.id = 'themeBtn';
    themeBtn.className = 'icon-btn';
    themeBtn.innerHTML = '🎨';
    themeBtn.onclick = openThemeSelector;
    themeBtn.title = 'Change Theme';
    headerActions.appendChild(themeBtn);
  }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initEnhancedFeatures);
} else {
  window.initEnhancedFeatures();
}