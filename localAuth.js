// Fast Local Auth System
const LOCAL_USERS_KEY = 'genzes_users';
const LOCAL_SESSION_KEY = 'genzes_session';
const LOCAL_PROFILES_KEY = 'genzes_profiles';
const LOCAL_MESSAGES_KEY = 'genzes_messages';

// Cache for faster access
let cache = {
    users: null,
    profiles: null,
    messages: null,
    session: null
};

// Fast storage operations
const storage = {
    get(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '{}');
        } catch {
            return {};
        }
    },
    set(key, data) {
        localStorage.setItem(key, JSON.stringify(data));
    },
    getArray(key) {
        try {
            return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
            return [];
        }
    }
};

// Initialize once
if (!localStorage.getItem(LOCAL_USERS_KEY)) {
    storage.set(LOCAL_USERS_KEY, {});
    storage.set(LOCAL_PROFILES_KEY, {});
    storage.set(LOCAL_MESSAGES_KEY, []);
}

// Fast Local Auth API
window.localAuth = {
    signUp(email, password, userData = {}) {
        const users = cache.users || (cache.users = storage.get(LOCAL_USERS_KEY));
        const profiles = cache.profiles || (cache.profiles = storage.get(LOCAL_PROFILES_KEY));
        
        if (users[email]) throw new Error('User exists');
        
        const userId = Date.now().toString(36);
        const user = { id: userId, email, password: btoa(password) };
        const profile = {
            id: userId,
            username: userData.username || email.split('@')[0],
            full_name: userData.full_name || '',
            bio: userData.bio || ''
        };
        
        users[email] = user;
        profiles[userId] = profile;
        
        storage.set(LOCAL_USERS_KEY, users);
        storage.set(LOCAL_PROFILES_KEY, profiles);
        
        return { user, profile };
    },
    
    signIn(email, password) {
        const users = cache.users || (cache.users = storage.get(LOCAL_USERS_KEY));
        const profiles = cache.profiles || (cache.profiles = storage.get(LOCAL_PROFILES_KEY));
        
        const user = users[email];
        if (!user || atob(user.password) !== password) {
            throw new Error('Invalid credentials');
        }
        
        const profile = profiles[user.id];
        const session = {
            user,
            profile,
            access_token: 'local_' + Date.now(),
            expires_at: Date.now() + 86400000
        };
        
        cache.session = session;
        storage.set(LOCAL_SESSION_KEY, session);
        return session;
    },
    
    getSession() {
        if (cache.session) {
            if (Date.now() < cache.session.expires_at) return cache.session;
            cache.session = null;
        }
        
        const session = storage.get(LOCAL_SESSION_KEY);
        if (session.expires_at && Date.now() < session.expires_at) {
            cache.session = session;
            return session;
        }
        
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return null;
    },
    
    signOut() {
        cache.session = null;
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return true;
    },
    
    getProfile(userId) {
        const profiles = cache.profiles || (cache.profiles = storage.get(LOCAL_PROFILES_KEY));
        return profiles[userId] || null;
    },
    
    updateProfile(userId, updates) {
        const profiles = cache.profiles || (cache.profiles = storage.get(LOCAL_PROFILES_KEY));
        if (!profiles[userId]) throw new Error('Profile not found');
        
        profiles[userId] = { ...profiles[userId], ...updates };
        storage.set(LOCAL_PROFILES_KEY, profiles);
        return profiles[userId];
    },
    
    searchUsers(query) {
        const profiles = cache.profiles || (cache.profiles = storage.get(LOCAL_PROFILES_KEY));
        const q = query.toLowerCase();
        return Object.values(profiles).filter(p => 
            p.username.toLowerCase().includes(q) || 
            p.full_name.toLowerCase().includes(q)
        );
    },
    
    sendMessage(senderId, receiverId, content) {
        const messages = cache.messages || (cache.messages = storage.getArray(LOCAL_MESSAGES_KEY));
        
        const message = {
            id: Date.now().toString(36),
            sender_id: senderId,
            receiver_id: receiverId,
            content,
            created_at: Date.now()
        };
        
        messages.push(message);
        cache.messages = messages;
        storage.set(LOCAL_MESSAGES_KEY, messages);
        return message;
    },
    
    getMessages(userId1, userId2) {
        const messages = cache.messages || (cache.messages = storage.getArray(LOCAL_MESSAGES_KEY));
        return messages.filter(m => 
            (m.sender_id === userId1 && m.receiver_id === userId2) ||
            (m.sender_id === userId2 && m.receiver_id === userId1)
        );
    }
};

// Create enhanced Supabase client
window.sb = {
    auth: {
        signUp: (opts) => Promise.resolve({ data: { user: localAuth.signUp(opts.email, opts.password, opts.options?.data) }, error: null }),
        signInWithPassword: (opts) => Promise.resolve({ data: { user: localAuth.signIn(opts.email, opts.password) }, error: null }),
        getSession: () => Promise.resolve({ data: { session: localAuth.getSession() }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: (table) => ({
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        insert: () => Promise.resolve({ data: [], error: null }),
        update: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
    })
};

console.log('⚡ Fast Local Auth ready');