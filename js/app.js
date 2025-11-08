// Global variables (avoid duplicates)
window.currentUser = window.currentUser || null;
window.currentChat = window.currentChat || null;
window.messageSubscription = window.messageSubscription || null;
// selectedMusic is declared in features.js

// Initialize app - simplified to avoid conflicts
window.initAppFromJS = async function() {
  console.log('🚀 Initializing app from JS...');
  
  if (!window.sb) {
    console.error('❌ Supabase client not available');
    return;
  }

  // Check for existing session
  const { data: { session } } = await window.sb.auth.getSession();
  if (session?.user) {
    console.log('✅ Found existing session');
    await handleUserSession(session.user);
  }

  console.log('✅ App JS initialized successfully');
};

// Handle user session with follow status sync
async function handleUserSession(user) {
  window.currentUser = user;
  const currentUser = window.currentUser;
  
  // Get or create profile
  let { data: profile, error } = await window.sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error && error.code === 'PGRST116') {
    // Profile doesn't exist, create one
    const { data: newProfile, error: createError } = await window.sb
      .from('profiles')
      .insert({
        id: user.id,
        username: user.email.split('@')[0],
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        bio: user.user_metadata?.bio || '',
        links: user.user_metadata?.links || ''
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating profile:', createError);
      return;
    }
    profile = newProfile;
  }

  if (profile) {
    currentUser.profile = profile;
    
    // Sync follow status from database to localStorage
    try {
      const { data: follows } = await window.sb
        .from('follows')
        .select('followee_id')
        .eq('follower_id', user.id);
      
      const followedUserIds = follows?.map(f => f.followee_id) || [];
      localStorage.setItem('followedUsers', JSON.stringify(followedUserIds));
      console.log('✅ Follow status synced from database:', followedUserIds.length, 'users');
    } catch (syncError) {
      console.error('Error syncing follow status:', syncError);
    }
    
    showAppUI();
    await loadInitialData();
    setupGlobalMessageSubscription();
  }
}

// Show app UI - simplified for dedicated auth page
window.showAppUI = function() {
  document.getElementById('appPanel').classList.remove('hidden');
};

// Load initial data
async function loadInitialData() {
  await Promise.all([
    window.loadStories ? window.loadStories() : Promise.resolve(),
    window.loadFeed ? window.loadFeed() : Promise.resolve(),
    window.loadChats ? window.loadChats() : Promise.resolve()
  ]);
  
  // Load highlights for profile section
  if (window.loadHighlights) {
    await window.loadHighlights();
  }
}

// Setup event listeners - simplified for main app
function setupEventListeners() {
  // Only setup logout handler - login/signup handled in auth.html
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // Enhanced search functionality with 2+ character requirement
  const searchInput = document.getElementById('searchQuery');
  if (searchInput) {
    let searchTimeout;
    
    // Search on input with debounce
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length === 0) {
        // Load all users when empty
        searchTimeout = setTimeout(() => {
          loadAllUsers();
        }, 300);
      } else if (query.length >= 2) {
        // Search when 2+ characters
        searchTimeout = setTimeout(() => {
          searchUsers(query);
        }, 300);
      } else {
        // Show hint for 1 character
        searchUsers(query);
      }
    });
    
    // Also search on Enter key press
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        if (query.length >= 2) {
          searchUsers(query);
        } else if (query.length === 0) {
          loadAllUsers();
        } else {
          searchUsers(query); // Show hint
        }
      }
    });
    
    // Load all users when search input is focused and empty
    searchInput.addEventListener('focus', (e) => {
      if (!e.target.value.trim()) {
        loadAllUsers();
      }
    });
  }

  // Message form
  document.getElementById('messageForm')?.addEventListener('submit', handleSendMessage);
  
  // Back to chats
  document.getElementById('backToChats')?.addEventListener('click', () => {
    document.getElementById('chatArea').classList.add('hidden');
    document.getElementById('chatsList').style.display = 'block';
  });

  // Modal close handlers
  setupModalHandlers();
}

// Login/signup handled in HTML - these are helper functions

// Handle logout with data cleanup
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) return;
  
  try {
    await window.sb.auth.signOut();
    window.currentUser = null;
    window.currentChat = null;
    
    // Clean up subscriptions
    if (window.messageSubscription) {
      window.messageSubscription.unsubscribe();
      window.messageSubscription = null;
    }
    
    // Clear all cached data including follow status
    localStorage.removeItem('followedUsers');
    localStorage.removeItem('savedChats');
    localStorage.removeItem('chatLockPassword');
    localStorage.removeItem('chatLockEnabled');
    
    // Redirect to auth page
    window.location.href = 'auth.html';
    console.log('✅ Logged out successfully');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    alert('Failed to logout: ' + error.message);
  }
}

// Load stories - simplified version to avoid conflicts
window.loadStoriesFromApp = async function() {
  if (!window.currentUser) return;

  try {
    // Try with media_type column first
    let { data: stories, error } = await window.sb
      .from('stories')
      .select(`
        *,
        profiles:user_id (username, avatar_url, full_name)
      `)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    // If media_type column doesn't exist, try without it
    if (error && error.message.includes('media_type')) {
      const result = await window.sb
        .from('stories')
        .select(`
          id, user_id, media_url, audience, expires_at, created_at,
          profiles:user_id (username, avatar_url, full_name)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      stories = result.data;
      error = result.error;
    }

    if (error) throw error;

    const storiesRow = document.getElementById('storiesRow');
    if (!storiesRow) return;

    // Get current user profile for "Add Story" button
    const currentProfile = window.currentUser?.profile;

    // Add "Add Story" button with user's avatar
    let html = `
      <div class="story add-story" onclick="openStoryCamera()">
        <div class="ring">
          <div class="avatar">
            <div class="avatar-inner">
              ${currentProfile?.avatar_url && currentProfile.avatar_url.trim() ? 
                `<img src="${currentProfile.avatar_url}" alt="You" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : 
                `<span style="color:#fff;font-weight:600;">${currentProfile?.username?.[0]?.toUpperCase() || 'Y'}</span>`
              }
              <div class="add-icon">+</div>
            </div>
          </div>
        </div>
        <label>Your story</label>
      </div>
    `;

    // Group stories by user
    const userStories = {};
    stories?.forEach(story => {
      const userId = story.user_id;
      if (!userStories[userId]) {
        userStories[userId] = {
          user: story.profiles,
          stories: []
        };
      }
      userStories[userId].stories.push(story);
    });

    // Add user stories with Instagram-like ring
    Object.values(userStories).forEach(({ user, stories }) => {
      const avatar = user?.avatar_url || '';
      const username = user?.username || 'User';
      
      html += `
        <div class="story" onclick="viewStory('${stories[0].user_id}')">
          <div class="ring">
            <div class="avatar">
              <div class="avatar-inner">
                ${avatar ? 
                  `<img src="${avatar}" alt="${username}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />` : 
                  `<span style="color:#fff;font-weight:600;">${username[0]?.toUpperCase()}</span>`
                }
              </div>
            </div>
          </div>
          <label>${username}</label>
        </div>
      `;
    });

    storiesRow.innerHTML = html;

  } catch (error) {
    console.error('❌ Error loading stories:', error);
    const storiesRow = document.getElementById('storiesRow');
    if (storiesRow) {
      storiesRow.innerHTML = `
        <div class="story add-story" onclick="openStoryCamera()">
          <div class="ring">
            <div class="avatar">
              <div class="avatar-inner">
                <span style="color:#fff;font-weight:600;">+</span>
              </div>
            </div>
          </div>
          <label>Your story</label>
        </div>
      `;
    }
  }
};

// Load feed - simplified version to avoid conflicts (excluding reels/videos)
window.loadFeedFromApp = async function() {
  if (!window.currentUser) return;

  try {
    const { data: posts, error } = await window.sb
      .from('posts')
      .select(`
        *,
        profiles:user_id (username, avatar_url, full_name)
      `)
      .not('media_type', 'eq', 'video')  // Exclude video posts (reels)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const feed = document.getElementById('feed');
    if (!feed) return;

    let html = '';
    posts?.forEach(post => {
      const user = post.profiles;
      
      // Skip video posts as an additional filter
      if (post.image_url && (post.image_url.includes('video') || post.image_url.startsWith('data:video'))) {
        return;
      }
      
      html += `
        <div class="post">
          <div class="post-header">
            <div class="post-avatar">
              ${user?.avatar_url ? `<img src="${user.avatar_url}" alt="${user.username}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />` : `<span style="width: 32px; height: 32px; border-radius: 50%; background: #e1306c; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${user?.username?.[0]?.toUpperCase() || 'U'}</span>`}
            </div>
            <div class="post-username">${user?.username || 'User'}</div>
            <button class="post-more">⋯</button>
          </div>
          
          ${post.image_url ? `<img src="${post.image_url}" alt="Post" class="post-image" style="width: 100%; max-height: 600px; object-fit: cover;" />` : ''}
          
          <div class="post-actions">
            <button class="post-action" onclick="toggleLike('${post.id}')">❤️</button>
            <button class="post-action" onclick="showComments('${post.id}')">💬</button>
            <button class="post-action" onclick="sharePost('${post.id}')">📤</button>
          </div>
          
          <div class="post-likes">0 likes</div>
          
          ${post.caption ? `<div class="post-caption"><strong>${user?.username || 'User'}</strong> ${post.caption}</div>` : ''}
          <div class="post-timestamp">${formatTime(post.created_at)}</div>
        </div>
      `;
    });

    if (html === '') {
      html = '<div class="no-content">No posts yet. Create your first post!</div>';
    }

    feed.innerHTML = html;

  } catch (error) {
    console.error('❌ Error loading feed:', error);
    const feed = document.getElementById('feed');
    if (feed) {
      feed.innerHTML = '<div class="no-content">Error loading posts. Please try again.</div>';
    }
  }
};

// Load chats - Instagram style with last message preview and saved chats
window.loadChats = async function() {
  if (!window.currentUser) return;
  const currentUser = window.currentUser;

  try {
    // Get all users who have exchanged messages with current user OR followed users
    const { data: following, error: followError } = await window.sb
      .from('follows')
      .select('followee_id')
      .eq('follower_id', currentUser.id);
    
    if (followError) {
      console.log('Error fetching follows:', followError);
    }

    // Get saved chats from localStorage
    const savedChats = JSON.parse(localStorage.getItem('savedChats') || '[]');

    // Also get users who have sent messages to current user
    const { data: messageUsers } = await window.sb
      .from('messages')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    // Combine followed users, saved chats, and message users
    const allUserIds = new Set();
    const userProfiles = new Map();

    // Add followed users first (priority)
    if (following?.length) {
      for (const follow of following) {
        allUserIds.add(follow.followee_id);
        // Get profile for followed user
        try {
          const { data: profile } = await window.sb
            .from('profiles')
            .select('username, avatar_url, full_name')
            .eq('id', follow.followee_id)
            .single();
          if (profile) {
            userProfiles.set(follow.followee_id, profile);
          }
        } catch (err) {
          console.log('Profile not found for followed user:', follow.followee_id);
        }
      }
    }

    // Add saved chat users
    if (savedChats?.length) {
      for (const savedChat of savedChats) {
        allUserIds.add(savedChat.partnerId);
        if (!userProfiles.has(savedChat.partnerId)) {
          try {
            const { data: profile } = await window.sb
              .from('profiles')
              .select('username, avatar_url, full_name')
              .eq('id', savedChat.partnerId)
              .single();
            if (profile) {
              userProfiles.set(savedChat.partnerId, profile);
            }
          } catch (err) {
            console.log('Profile not found for saved chat user:', savedChat.partnerId);
          }
        }
      }
    }

    // Add users from messages
    if (messageUsers?.length) {
      for (const msg of messageUsers) {
        const otherUserId = msg.sender_id === currentUser.id ? msg.receiver_id : msg.sender_id;
        if (otherUserId !== currentUser.id) {
          allUserIds.add(otherUserId);
          
          // Get profile if not already loaded
          if (!userProfiles.has(otherUserId)) {
            try {
              const { data: profile } = await window.sb
                .from('profiles')
                .select('username, avatar_url, full_name')
                .eq('id', otherUserId)
                .single();
              if (profile) userProfiles.set(otherUserId, profile);
            } catch (err) {
              console.log('Profile not found for user:', otherUserId);
            }
          }
        }
      }
    }

    const chatsList = document.getElementById('chatsList');
    if (!chatsList) return;

    let html = '';
    
    if (allUserIds.size > 0) {
      // Sort users: saved chats first, then followed users, then others
      const sortedUsers = Array.from(allUserIds).sort((a, b) => {
        const aIsSaved = savedChats.some(chat => chat.partnerId === a);
        const bIsSaved = savedChats.some(chat => chat.partnerId === b);
        const aIsFollowed = following?.some(f => f.followee_id === a);
        const bIsFollowed = following?.some(f => f.followee_id === b);
        
        // Saved chats first
        if (aIsSaved && !bIsSaved) return -1;
        if (!aIsSaved && bIsSaved) return 1;
        
        // Then followed users
        if (aIsFollowed && !bIsFollowed) return -1;
        if (!aIsFollowed && bIsFollowed) return 1;
        
        return 0;
      });

      // Get last message for each user
      for (const userId of sortedUsers) {
        const user = userProfiles.get(userId);
        if (!user) continue;
        
        let lastMessage = null;
        let messageTime = '';
        
        try {
          const { data: messages } = await window.sb
            .from('messages')
            .select('content, created_at, sender_id')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUser.id})`)
            .eq('unsent', false)
            .order('created_at', { ascending: false })
            .limit(1);
          
          if (messages?.length) {
            lastMessage = messages[0];
            messageTime = formatTime(lastMessage.created_at);
          }
        } catch (err) {
          console.log('Error getting last message:', err);
        }
        
        const isOnline = Math.random() > 0.5; // Simulate online status
        const isFollowed = following?.some(f => f.followee_id === userId);
        const isSaved = savedChats.some(chat => chat.partnerId === userId);
        
        html += `
          <div class="chat-item" onclick="openChat('${userId}', '${user?.username || 'User'}')">
            <div class="chat-avatar-container">
              <div class="chat-avatar">
                ${user?.avatar_url && user.avatar_url.trim() && user.avatar_url !== 'null' && user.avatar_url !== '' && user.avatar_url !== 'undefined' ? 
                  `<img src="${user.avatar_url}" alt="${user.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" /><div class="avatar-placeholder" style="display: none;">${user?.username?.[0]?.toUpperCase() || 'U'}</div>` : 
                  `<div class="avatar-placeholder">${user?.username?.[0]?.toUpperCase() || 'U'}</div>`
                }
              </div>
              ${isOnline ? '<div class="online-indicator"></div>' : ''}
              ${isSaved ? '<div class="save-indicator" style="position: absolute; bottom: -2px; left: -2px; background: #ffd700; color: black; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid #000;">💾</div>' : ''}
              ${isFollowed ? '<div class="follow-indicator" style="position: absolute; bottom: -2px; right: -2px; background: #0095f6; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 2px solid #000;">✓</div>' : ''}
            </div>
            <div class="chat-info">
              <div class="chat-header">
                <div class="chat-name">${user?.username || 'User'}</div>
                <div class="chat-time">${messageTime}</div>
              </div>
              <div class="chat-preview">
                ${lastMessage ? 
                  (lastMessage.sender_id === currentUser.id ? 'You: ' : '') + 
                  (lastMessage.content?.length > 30 ? lastMessage.content.substring(0, 30) + '...' : lastMessage.content || 'Media') 
                  : 'Tap to start chatting'
                }
              </div>
            </div>
          </div>
        `;
      }
    } else {
      html = `
        <div class="empty-chats">
          <div class="empty-icon">💬</div>
          <h3>Your Messages</h3>
          <p>Follow people to start messaging them</p>
          <button class="btn btn-primary" onclick="showSection('search')">Find People</button>
        </div>
      `;
    }

    chatsList.innerHTML = html;

  } catch (error) {
    console.error('❌ Error loading chats:', error);
    const chatsList = document.getElementById('chatsList');
    if (chatsList) {
      chatsList.innerHTML = `
        <div class="empty-chats">
          <div class="empty-icon">⚠️</div>
          <h3>Error Loading Chats</h3>
          <p>Please try again later</p>
        </div>
      `;
    }
  }
}

// Enhanced search users function with 2+ character search
window.searchUsers = async function(query) {
  const currentUser = window.currentUser;
  try {
    let users;
    let error;
    
    if (!query || query.trim().length < 2) {
      // Show message for short queries
      const searchResults = document.getElementById('searchResults');
      if (searchResults) {
        if (query && query.trim().length < 2) {
          searchResults.innerHTML = '<div class="search-hint">💡 Type at least 2 characters to search</div>';
        } else {
          // Load all users when no search query
          const result = await window.sb
            .from('profiles')
            .select('id, username, full_name, avatar_url, bio, created_at')
            .order('created_at', { ascending: false })
            .limit(100);
          users = result.data;
          error = result.error;
        }
      }
      if (query && query.trim().length < 2) return;
    } else {
      // Search users by username or full name with partial matching
      const result = await window.sb
        .from('profiles')
        .select('id, username, full_name, avatar_url, bio, created_at')
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
      html += '<div class="all-users-header"><h3>🌍 All Users on GENZES CHATS</h3><p>Discover and connect with people from around the world</p></div>';
    } else {
      html += `<div class="search-results-header"><h3>🔍 Search Results for "${query}"</h3></div>`;
    }
    
    if (users && users.length > 0) {
      // Get current user's follow status from database (most reliable)
      let followingIds = [];
      if (currentUser) {
        try {
          const { data: follows, error: followsError } = await window.sb
            .from('follows')
            .select('followee_id')
            .eq('follower_id', currentUser.id)
            .in('followee_id', users.map(u => u.id));
          
          if (followsError) {
            console.log('Error fetching follows:', followsError);
            // Fallback to localStorage if database fails
            followingIds = JSON.parse(localStorage.getItem('followedUsers') || '[]');
          } else {
            followingIds = follows?.map(f => f.followee_id) || [];
            // Update localStorage with current database state
            localStorage.setItem('followedUsers', JSON.stringify(followingIds));
          }
          
        } catch (err) {
          console.log('Error getting follow status from database, using localStorage:', err);
          // Fallback to localStorage if database fails
          followingIds = JSON.parse(localStorage.getItem('followedUsers') || '[]');
        }
      }
      
      users.forEach(user => {
        // Skip current user from results
        if (currentUser && user.id === currentUser.id) return;
        
        // Debug avatar URL
        console.log('User avatar URL:', user.username, user.avatar_url);
        
        const isFollowing = followingIds.includes(user.id);
        
        html += `
          <div class="user-item" style="position: relative; cursor: default;">
            <div style="display: flex; align-items: center; flex: 1; gap: 12px;">
              <button onclick="handleUserMenuClick(event, '${user.id}', '${user.username}', '${user.id}')" title="More options" style="padding: 10px !important; background: rgba(255, 255, 255, 0.25) !important; border: 3px solid rgba(255, 255, 255, 0.5) !important; border-radius: 50% !important; color: #ffffff !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 42px !important; height: 42px !important; flex-shrink: 0 !important; transition: all 0.2s ease !important; box-shadow: 0 2px 10px rgba(0,0,0,0.5) !important; z-index: 100 !important;" onmouseover="this.style.background='rgba(255,255,255,0.4)'; this.style.transform='scale(1.1)';" onmouseout="this.style.background='rgba(255,255,255,0.25)'; this.style.transform='scale(1)';">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="pointer-events: none; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
              </button>
              <div class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; overflow: hidden; flex-shrink: 0; font-size: 1.2rem;">
                ${(user.avatar_url && user.avatar_url.trim() && user.avatar_url !== 'null' && user.avatar_url !== '' && user.avatar_url !== 'undefined') ? 
                  `<img src="${user.avatar_url}" alt="${user.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span style=\'color: white; font-weight: 600; font-size: 1.2rem;\'>${user.username?.[0]?.toUpperCase() || 'U'}</span>';" />` : 
                  `<span style="color: white; font-weight: 600; font-size: 1.2rem;">${user.username?.[0]?.toUpperCase() || 'U'}</span>`
                }
              </div>
              <div class="user-info" onclick="openUserProfile('${user.id}', '${user.username}')" style="cursor: pointer;">
                <div class="user-name">@${user.username}</div>
                <div class="user-fullname">${user.full_name || 'No name provided'}</div>
                ${user.bio ? `<div class="user-bio">${user.bio.length > 50 ? user.bio.substring(0, 50) + '...' : user.bio}</div>` : ''}
              </div>
            </div>
            <div class="user-actions" style="display: flex; gap: 8px; align-items: center;">
              <button class="btn ${isFollowing ? 'btn-accent' : 'btn-primary'}" onclick="handleActionClick(event, 'followUser', '${user.id}')" title="${isFollowing ? 'Unfollow' : 'Follow'} ${user.username}" style="padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">${isFollowing ? 'Following' : 'Follow'}</button>
              <button class="btn btn-secondary" onclick="handleActionClick(event, 'startDirectMessageFromSearch', '${user.id}', '${user.username}')" title="Message ${user.username}" style="padding: 8px 16px; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 0.9rem; background: #262626; color: #ffffff;">Message</button>
            </div>
            <div class="post-menu" id="userMenu-${user.id}" style="position: absolute; top: 100%; left: 0; background: rgba(20, 20, 30, 0.98); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; min-width: 180px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.4); backdrop-filter: blur(15px); z-index: 1000; display: none; opacity: 0; transform: translateY(-10px); transition: all 0.3s ease; overflow: hidden;">
              <button class="post-menu-item" onclick="handleMenuItemClick(event, 'openUserProfile', '${user.id}', '${user.username}')" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px; background: none; border: none; color: #ffffff; text-align: left; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; font-weight: 500;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                View Profile
              </button>
              <button class="post-menu-item" onclick="handleMenuItemClick(event, 'startDirectMessageFromSearch', '${user.id}', '${user.username}')" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px; background: none; border: none; color: #ffffff; text-align: left; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; font-weight: 500;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                </svg>
                Message
              </button>
              <button class="post-menu-item" onclick="handleMenuItemClick(event, 'followUser', '${user.id}')" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px 18px; background: none; border: none; color: #ffffff; text-align: left; cursor: pointer; transition: all 0.2s ease; font-size: 0.95rem; font-weight: 500;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                ${isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          </div>
        `;
      });
    } else {
      if (query && query.trim()) {
        html += '<div class="no-results">❌ No users found matching your search</div>';
      } else {
        html += '<div class="no-results">👥 No users found on the platform yet</div>';
      }
    }

    searchResults.innerHTML = html;

  } catch (error) {
    console.error('❌ Error searching users:', error);
    const searchResults = document.getElementById('searchResults');
    if (searchResults) {
      searchResults.innerHTML = '<div class="error-message">❌ Error loading users. Please try again.</div>';
    }
  }
}

// Load all users function
window.loadAllUsers = async function() {
  await searchUsers(''); // Call searchUsers with empty query to load all users
};

// Open chat function - ensure it works globally
window.openChat = async function(partnerId, partnerName) {
  console.log('Opening chat with:', partnerId, partnerName);
  const currentChat = { partnerId, partnerName };
  window.currentChat = currentChat;
  
  // Update UI
  const chatsList = document.getElementById('chatsList');
  const chatArea = document.getElementById('chatArea');
  const chatNameEl = document.querySelector('.chat-name');
  
  if (chatsList) chatsList.style.display = 'none';
  if (chatArea) chatArea.classList.remove('hidden');
  if (chatNameEl) chatNameEl.textContent = partnerName;
  
  // Load messages
  await window.loadMessages(partnerId);
  
  // Setup real-time subscription
  window.setupMessageSubscription(partnerId);
  
  // Focus message input
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    setTimeout(() => messageInput.focus(), 100);
  }
};

// Load messages with Instagram-style UI and usernames
window.loadMessages = async function(partnerId) {
  const currentUser = window.currentUser;
  try {
    // Get messages first
    const { data: messages, error } = await window.sb
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id})`)
      .eq('unsent', false)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get partner profile for username
    const { data: partnerProfile } = await window.sb
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', partnerId)
      .single();

    const partnerName = partnerProfile?.username || 'User';

    if (error) throw error;

    const messagesContainer = document.getElementById('messages');
    if (!messagesContainer) return;

    let html = '';
    let lastDate = '';
    
    messages?.forEach((message, index) => {
      const isMe = message.sender_id === currentUser.id;
      const messageDate = new Date(message.created_at).toDateString();
      const editedText = message.edited ? ' (edited)' : '';
      
      // Get sender name
      const senderName = message.sender_id === currentUser.id ? 'You' : partnerName;
      
      // Add date separator
      if (messageDate !== lastDate) {
        html += `<div class="date-separator">${formatDate(message.created_at)}</div>`;
        lastDate = messageDate;
      }
      
      // Group consecutive messages from same sender
      const prevMessage = messages[index - 1];
      const nextMessage = messages[index + 1];
      const isFirstInGroup = !prevMessage || prevMessage.sender_id !== message.sender_id;
      const isLastInGroup = !nextMessage || nextMessage.sender_id !== message.sender_id;
      
      html += `
        <div class="message-wrapper ${isMe ? 'me' : 'them'}">
          ${!isMe && isFirstInGroup ? `<div class="message-sender">${senderName}</div>` : ''}
          <div class="message ${isFirstInGroup ? 'first' : ''} ${isLastInGroup ? 'last' : ''}" data-message-id="${message.id}">
            <div class="message-content">
              <div class="message-text">${message.content || 'Media'}${editedText}</div>
              ${isLastInGroup ? `<div class="message-time">${formatTime(message.created_at)}</div>` : ''}
            </div>
            ${isMe ? `
              <div class="message-actions">
                <button onclick="editMessage('${message.id}', '${message.content}')" class="message-action-btn" title="Edit">✏️</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    if (!messages?.length) {
      html = `
        <div class="empty-messages">
          <div class="empty-icon">👋</div>
          <p>Start your conversation</p>
        </div>
      `;
    }

    messagesContainer.innerHTML = html;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (error) {
    console.error('❌ Error loading messages:', error);
    const messagesContainer = document.getElementById('messages');
    if (messagesContainer) {
      messagesContainer.innerHTML = `
        <div class="empty-messages">
          <div class="empty-icon">⚠️</div>
          <p>Error loading messages</p>
        </div>
      `;
    }
  }
}

// Setup message subscription
window.setupMessageSubscription = function(partnerId) {
  const currentUser = window.currentUser;
  if (window.messageSubscription) {
    window.messageSubscription.unsubscribe();
  }

  window.messageSubscription = window.sb
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUser.id}))`
    }, (payload) => {
      const message = payload.new;
      const isMe = message.sender_id === currentUser.id;
      
      const messagesContainer = document.getElementById('messages');
      if (messagesContainer) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isMe ? 'me' : 'them'}`;
        messageDiv.innerHTML = `
          ${message.content || 'Media'}
          <time>${formatTime(message.created_at)}</time>
        `;
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    })
    .subscribe();
}

// Handle send message
window.handleSendMessage = async function(e) {
  e.preventDefault();
  
  const currentUser = window.currentUser;
  const currentChat = window.currentChat;
  
  if (!currentChat) return;
  
  const messageInput = document.getElementById('messageInput');
  const content = messageInput.value.trim();
  
  if (!content) return;

  try {
    const { error } = await window.sb
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: currentChat.partnerId,
        content: content
      });

    if (error) throw error;

    messageInput.value = '';
    
    // Reload messages to show new message with proper formatting
    await window.loadMessages(currentChat.partnerId);
    
    // Refresh chats list to show this conversation at the top
    if (window.loadChats) {
      setTimeout(() => window.loadChats(), 100);
    }

  } catch (error) {
    console.error('❌ Error sending message:', error);
    alert('Failed to send message');
  }
}

// Utility functions
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  if (diff < 60000) return 'now';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h';
  if (diff < 604800000) return Math.floor(diff / 86400000) + 'd';
  return date.toLocaleDateString();
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffTime = today - messageDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'long' });
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Modal handlers
function setupModalHandlers() {
  // Close modal handlers
  document.querySelectorAll('.close-btn, .cancel-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });

  // Backdrop click to close
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal');
      if (modal) modal.classList.add('hidden');
    });
  });
}

// Placeholder functions for features
window.viewStory = function(userId) {
  console.log('View story for user:', userId);
};

window.toggleLike = function(postId) {
  console.log('Toggle like for post:', postId);
};

window.showComments = function(postId) {
  console.log('Show comments for post:', postId);
};

window.sharePost = function(postId) {
  console.log('Share post:', postId);
};

window.openEnhancedUserProfile = function(userId, username) {
  console.log('Opening enhanced profile for:', username, userId);
  // TODO: Implement enhanced user profile modal
  alert(`Profile for ${username} - Feature coming soon!`);
};

// Follow user function with UI update and persistence
window.followUser = async function(userId) {
  if (!window.currentUser) {
    alert('Please log in to follow users');
    return;
  }
  
  const followBtn = event.target;
  const originalText = followBtn.textContent;
  
  try {
    followBtn.disabled = true;
    followBtn.textContent = 'Loading...';
    
    // Check if already following
    const { data: existingFollow } = await window.sb
      .from('follows')
      .select('follower_id, followee_id')
      .eq('follower_id', window.currentUser.id)
      .eq('followee_id', userId)
      .maybeSingle();
    
    if (existingFollow) {
      // Unfollow
      const { error } = await window.sb
        .from('follows')
        .delete()
        .eq('follower_id', window.currentUser.id)
        .eq('followee_id', userId);
      
      if (error) throw error;
      
      followBtn.textContent = 'Follow';
      followBtn.className = 'btn btn-primary';
      
      // Update localStorage to persist unfollow
      const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
      const updatedFollowed = followedUsers.filter(id => id !== userId);
      localStorage.setItem('followedUsers', JSON.stringify(updatedFollowed));
      
    } else {
      // Follow
      const { error } = await window.sb
        .from('follows')
        .insert({
          follower_id: window.currentUser.id,
          followee_id: userId
        });
      
      if (error) throw error;
      
      followBtn.textContent = 'Following';
      followBtn.className = 'btn btn-accent';
      
      // Update localStorage to persist follow
      const followedUsers = JSON.parse(localStorage.getItem('followedUsers') || '[]');
      if (!followedUsers.includes(userId)) {
        followedUsers.push(userId);
        localStorage.setItem('followedUsers', JSON.stringify(followedUsers));
      }
    }
    
    // Immediately refresh messages to show followed users
    if (window.loadChats) {
      window.loadChats();
    }
    
    // Refresh search results to update follow status
    if (window.searchUsers) {
      const searchInput = document.getElementById('searchQuery');
      if (searchInput && searchInput.value.trim()) {
        window.searchUsers(searchInput.value);
      } else {
        window.loadAllUsers();
      }
    }
    
  } catch (error) {
    console.error('Error following user:', error);
    followBtn.textContent = originalText;
    alert('Failed to follow/unfollow user');
  } finally {
    followBtn.disabled = false;
  }
};

// Start direct message function from search
window.startDirectMessageFromSearch = function(partnerId, partnerName) {
  console.log('Starting direct message from search with:', partnerId, partnerName);
  
  // Switch to messages section first
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector('[data-section="messages"]')?.classList.add('active');
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById('messagesSection')?.classList.add('active');
  
  // Update section title
  const sectionTitle = document.getElementById('sectionTitle');
  if (sectionTitle) sectionTitle.textContent = 'Messages';
  
  // Small delay to ensure section is loaded and then open chat
  setTimeout(async () => {
    await window.openChat(partnerId, partnerName);
    // Refresh chats list to include this new conversation
    setTimeout(() => {
      if (window.loadChats) window.loadChats();
    }, 500);
  }, 300);
};

// Start direct message function (existing)
window.startDirectMessage = function(partnerId, partnerName) {
  console.log('Starting direct message with:', partnerId, partnerName);
  // Switch to messages section
  if (window.showSection) {
    window.showSection('messages');
  } else {
    // Fallback navigation
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-section="messages"]')?.classList.add('active');
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById('messagesSection')?.classList.add('active');
  }
  
  // Small delay to ensure section is loaded and then open chat
  setTimeout(async () => {
    await window.openChat(partnerId, partnerName);
    // Refresh chats list to include this new conversation
    setTimeout(() => {
      if (window.loadChats) window.loadChats();
    }, 500);
  }, 300);
};



window.openCreatePostModal = function() {
  document.getElementById('createPostModal').classList.remove('hidden');
};

window.openStoryCamera = function() {
  document.getElementById('storyImageInput').click();
};

window.handleStoryUpload = function(input) {
  const file = input.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('createStoryModal').classList.remove('hidden');
    const preview = document.getElementById('storyPreview');
    const tag = file.type.startsWith('image/') ? 'img' : 'video';
    const controls = tag === 'video' ? 'controls' : '';
    preview.innerHTML = `<${tag} src="${e.target.result}" ${controls} style="max-width:100%;max-height:200px;border-radius:8px;" />`;
    document.getElementById('storyMedia').files = input.files;
    document.getElementById('storyMediaSelected').textContent = `Selected: ${file.name}`;
  };
  reader.readAsDataURL(file);
};

// Navigation functions - Chat stays maximized, navigation works within chat
window.showSection = function(sectionName) {
  // Update navigation buttons
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-section="${sectionName}"]`)?.classList.add('active');
  
  // Update content sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.getElementById(sectionName + 'Section')?.classList.add('active');
  
  // Handle back button visibility
  const backBtn = document.getElementById('backBtn');
  if (backBtn) backBtn.style.display = sectionName === 'home' ? 'none' : 'block';
  
  // Load section-specific content
  if (sectionName === 'home') {
    loadFeed();
    loadStories();
  } else if (sectionName === 'search') {
    const searchInput = document.getElementById('searchQuery');
    if (searchInput) {
      searchInput.focus();
      // Load all users immediately when search section is opened
      loadAllUsers();
    }
  } else if (sectionName === 'messages') {
    loadChats();
  } else if (sectionName === 'reels') {
    if (window.loadReels) window.loadReels();
  } else if (sectionName === 'notifications') {
    if (window.loadNotifications) window.loadNotifications();
  } else if (sectionName === 'profile') {
    if (window.loadHighlights) window.loadHighlights();
    loadUserProfile();
  }
};

// Load user profile
async function loadUserProfile() {
  if (!window.currentUser?.profile) return;
  
  const profileInfo = document.getElementById('profileInfo');
  if (!profileInfo) return;
  
  const profile = window.currentUser.profile;
  const avatarHtml = profile.avatar_url && profile.avatar_url.trim() ? 
    `<img src="${profile.avatar_url}" alt="${profile.username}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : 
    `<span style="color: white; font-weight: 600; font-size: 2rem;">${profile.username?.[0]?.toUpperCase() || 'U'}</span>`;
  
  profileInfo.innerHTML = `
    <div class="profile-stats">
      <div class="profile-avatar-large" style="width: 120px; height: 120px; border-radius: 50%; background: #ddd; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        ${avatarHtml}
      </div>
      <div class="profile-details">
        <h2>${profile.username || 'User'}</h2>
        <p>${profile.full_name || ''}</p>
        <p>${profile.bio || ''}</p>
        ${profile.links ? `<div class="profile-links">${profile.links.split('\n').map(link => `<a href="${link}" target="_blank">${link}</a>`).join('<br>')}</div>` : ''}
      </div>
    </div>
  `;
}

window.goToHome = function() {
  showSection('home');
};

// Global modal functions
window.openCreatePostModal = function() {
  document.getElementById('createPostModal').classList.remove('hidden');
};

window.openCreateStoryModal = function() {
  document.getElementById('createStoryModal').classList.remove('hidden');
};

window.openCreateReelModal = function() {
  document.getElementById('createReelModal').classList.remove('hidden');
};

window.openCreateHighlightModal = function() {
  document.getElementById('createHighlightModal').classList.remove('hidden');
  if (window.loadStoriesForHighlight) window.loadStoriesForHighlight();
};

window.openStoryCamera = function() {
  document.getElementById('storyImageInput').click();
};

window.handleStoryUpload = function(input) {
  const file = input.files?.[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    document.getElementById('createStoryModal').classList.remove('hidden');
    const preview = document.getElementById('storyPreview');
    const tag = file.type.startsWith('image/') ? 'img' : 'video';
    const controls = tag === 'video' ? 'controls' : '';
    preview.innerHTML = `<${tag} src="${e.target.result}" ${controls} style="max-width:100%;max-height:200px;border-radius:8px;" />`;
    document.getElementById('storyMedia').files = input.files;
    document.getElementById('storyMediaSelected').textContent = `Selected: ${file.name}`;
  };
  reader.readAsDataURL(file);
};

// Chat lock functionality
window.setupChatLock = function() {
  const password = prompt('Set a password for chat lock:');
  if (password) {
    localStorage.setItem('chatLockPassword', password);
    alert('Chat lock enabled!');
  }
};

// Login/signup buttons handled in HTML with onclick attributes

// Refresh messages function
window.refreshMessages = async function() {
  const refreshBtn = document.getElementById('refreshMessages');
  if (refreshBtn) {
    refreshBtn.style.transform = 'rotate(360deg)';
    refreshBtn.style.transition = 'transform 0.5s';
    setTimeout(() => {
      refreshBtn.style.transform = 'rotate(0deg)';
    }, 500);
  }
  await loadChats();
};

// Global message subscription for new messages from any user
function setupGlobalMessageSubscription() {
  if (!window.currentUser) return;
  
  if (window.globalMessageSubscription) {
    window.globalMessageSubscription.unsubscribe();
  }

  window.globalMessageSubscription = window.sb
    .channel('global_messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id.eq.${window.currentUser.id}`
    }, async (payload) => {
      // Refresh chats list when receiving new message from any user
      if (window.loadChats) {
        setTimeout(() => window.loadChats(), 100);
      }
    })
    .subscribe();
}



// Toggle user menu function
window.toggleUserMenu = function(event, userId, username, menuId) {
  event.preventDefault();
  event.stopPropagation();
  
  const menu = document.getElementById(`userMenu-${menuId}`);
  if (!menu) return;
  
  const isOpen = menu.style.display === 'block' && menu.style.opacity === '1';
  
  // Close all other menus first
  document.querySelectorAll('.post-menu').forEach(otherMenu => {
    if (otherMenu.id !== `userMenu-${menuId}`) {
      otherMenu.classList.remove('show');
      otherMenu.style.display = 'none';
      otherMenu.style.opacity = '0';
      otherMenu.style.transform = 'translateY(-10px)';
    }
  });
  
  // Toggle current menu
  if (isOpen) {
    // Close menu
    menu.classList.remove('show');
    menu.style.opacity = '0';
    menu.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      menu.style.display = 'none';
    }, 300);
  } else {
    // Open menu
    menu.style.display = 'block';
    menu.classList.add('show');
    setTimeout(() => {
      menu.style.opacity = '1';
      menu.style.transform = 'translateY(0)';
    }, 10);
  }
};

// Close all menus function
window.closeAllMenus = function() {
  document.querySelectorAll('.post-menu').forEach(menu => {
    menu.classList.remove('show');
    menu.style.display = 'none';
    menu.style.opacity = '0';
    menu.style.transform = 'translateY(-10px)';
  });
  
  document.querySelectorAll('.dropdown-menu, .context-menu').forEach(menu => {
    menu.style.display = 'none';
  });
};

// Enhanced menu item click handler
window.handleMenuItemClick = function(event, action, ...args) {
  event.preventDefault();
  event.stopPropagation();
  
  // Close all menus first
  closeAllMenus();
  
  // Execute the action
  if (typeof window[action] === 'function') {
    window[action](...args);
  }
};

// Handle user menu button click
window.handleUserMenuClick = function(event, userId, username, menuId) {
  event.preventDefault();
  event.stopPropagation();
  
  toggleUserMenu(event, userId, username, menuId);
};

// Open user profile function
window.openUserProfile = function(userId, username) {
  // Create user profile modal
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-backdrop" onclick="this.parentElement.remove()"></div>
    <div class="modal-dialog" style="max-width: 600px;">
      <div class="modal-header">
        <h3>@${username}</h3>
        <button onclick="this.closest('.modal').remove()" class="close-btn">×</button>
      </div>
      <div class="modal-body" style="padding: 1rem;">
        <div style="text-align: center; padding: 2rem; color: #8e8e8e;">Loading profile...</div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Load user profile data
  loadUserProfileData(userId, username, modal);
};

// Handle action button clicks
window.handleActionClick = function(event, action, ...args) {
  event.preventDefault();
  event.stopPropagation();
  
  // Execute the action
  if (typeof window[action] === 'function') {
    window[action](...args);
  }
};

// Load user profile data
window.loadUserProfileData = async function(userId, username, modal) {
  try {
    // Get user profile
    const { data: profile } = await window.sb
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    // Get user posts count
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
    
    // Check if current user follows this user
    let isFollowing = false;
    if (window.currentUser) {
      const { data: followData } = await window.sb
        .from('follows')
        .select('id')
        .eq('follower_id', window.currentUser.id)
        .eq('followee_id', userId)
        .maybeSingle();
      isFollowing = !!followData;
    }
    
    // Update modal content
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = `
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; overflow: hidden;">
          ${profile?.avatar_url ? 
            `<img src="${profile.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />` : 
            `<span style="color: white; font-size: 2rem; font-weight: 600;">${username[0].toUpperCase()}</span>`
          }
        </div>
        <h2 style="margin: 0 0 0.5rem 0; color: #ffffff;">@${username}</h2>
        ${profile?.full_name ? `<p style="margin: 0 0 1rem 0; color: #8e8e8e;">${profile.full_name}</p>` : ''}
        ${profile?.bio ? `<p style="margin: 0 0 1rem 0; color: #ffffff; line-height: 1.4;">${profile.bio}</p>` : ''}
        
        <div style="display: flex; justify-content: center; gap: 2rem; margin: 1.5rem 0;">
          <div style="text-align: center;">
            <div style="font-size: 1.2rem; font-weight: 600; color: #ffffff;">${postsCount || 0}</div>
            <div style="color: #8e8e8e; font-size: 0.9rem;">posts</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.2rem; font-weight: 600; color: #ffffff;">${followersCount || 0}</div>
            <div style="color: #8e8e8e; font-size: 0.9rem;">followers</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 1.2rem; font-weight: 600; color: #ffffff;">${followingCount || 0}</div>
            <div style="color: #8e8e8e; font-size: 0.9rem;">following</div>
          </div>
        </div>
        
        <div style="display: flex; gap: 1rem; justify-content: center;">
          ${window.currentUser && userId !== window.currentUser.id ? `
            <button onclick="followUser('${userId}')" class="btn ${isFollowing ? 'btn-accent' : 'btn-primary'}" style="padding: 8px 24px; border: none; border-radius: 20px; cursor: pointer; font-weight: 600;">
              ${isFollowing ? 'Following' : 'Follow'}
            </button>
            <button onclick="startDirectMessageFromSearch('${userId}', '${username}'); this.closest('.modal').remove();" class="btn btn-secondary" style="padding: 8px 24px; border: none; border-radius: 20px; cursor: pointer; font-weight: 600; background: #262626; color: #ffffff;">
              Message
            </button>
          ` : ''}
        </div>
      </div>
    `;
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    const modalBody = modal.querySelector('.modal-body');
    modalBody.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ff4757;">Error loading profile</div>';
  }
};

// Make functions globally available
if (!window.followUser) window.followUser = followUser;
if (!window.refreshMessages) window.refreshMessages = refreshMessages;
if (!window.handleUserMenuClick) window.handleUserMenuClick = handleUserMenuClick;
if (!window.handleActionClick) window.handleActionClick = handleActionClick;
if (!window.openUserProfile) window.openUserProfile = openUserProfile;
if (!window.loadUserProfileData) window.loadUserProfileData = loadUserProfileData;

// Setup global message subscription when user is logged in
if (window.currentUser) {
  setupGlobalMessageSubscription();
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
  // Close all menus if clicking outside of menu or menu trigger
  if (!event.target.closest('.post-menu') && 
      !event.target.closest('button[onclick*="toggleUserMenu"]') &&
      !event.target.closest('.post-more-container') &&
      !event.target.closest('.message-actions')) {
    
    // Close all post menus
    document.querySelectorAll('.post-menu').forEach(menu => {
      menu.classList.remove('show');
      menu.style.display = 'none';
      menu.style.opacity = '0';
      menu.style.transform = 'translateY(-10px)';
    });
    
    // Close any other open dropdowns or modals
    document.querySelectorAll('.dropdown-menu, .context-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  }
});

// Prevent menu from closing when clicking inside it
document.addEventListener('click', function(event) {
  if (event.target.closest('.post-menu')) {
    event.stopPropagation();
  }
});

// Close menus with ESC key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeAllMenus();
  }
});

// Don't auto-initialize to avoid conflicts with HTML file
console.log('✅ App.js loaded - functions available');