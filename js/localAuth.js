// Local Authentication System - Fallback when Supabase is unavailable
console.log('🔐 Local Auth System loaded');

// Local storage keys
const LOCAL_USERS_KEY = 'genzes_local_users';
const LOCAL_SESSION_KEY = 'genzes_local_session';
const LOCAL_PROFILES_KEY = 'genzes_local_profiles';
const LOCAL_MESSAGES_KEY = 'genzes_local_messages';

// Initialize local storage
function initLocalStorage() {
    if (!localStorage.getItem(LOCAL_USERS_KEY)) {
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify({}));
    }
    if (!localStorage.getItem(LOCAL_PROFILES_KEY)) {
        localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify({}));
    }
    if (!localStorage.getItem(LOCAL_MESSAGES_KEY)) {
        localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify([]));
    }
}

// Local Auth API
window.localAuth = {
    // Sign up
    async signUp(email, password, userData = {}) {
        initLocalStorage();
        
        const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY));
        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY));
        
        // Check if user exists
        if (users[email]) {
            throw new Error('User already exists');
        }
        
        // Create user
        const userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        users[email] = {
            id: userId,
            email: email,
            password: btoa(password), // Simple encoding (not secure for production)
            created_at: new Date().toISOString()
        };
        
        // Create profile
        profiles[userId] = {
            id: userId,
            username: userData.username || email.split('@')[0],
            full_name: userData.full_name || '',
            bio: userData.bio || '',
            avatar_url: null,
            links: null,
            is_private: false,
            is_disabled: false,
            created_at: new Date().toISOString()
        };
        
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
        localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
        
        return { user: users[email], profile: profiles[userId] };
    },
    
    // Sign in
    async signIn(email, password) {
        initLocalStorage();
        
        const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY));
        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY));
        
        const user = users[email];
        if (!user || atob(user.password) !== password) {
            throw new Error('Invalid credentials');
        }
        
        // Check if account is disabled
        const profile = profiles[user.id];
        if (profile?.is_disabled) {
            throw new Error('Account is disabled');
        }
        
        // Create session
        const session = {
            user: user,
            profile: profile,
            access_token: 'local_token_' + Date.now(),
            expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
        
        return session;
    },
    
    // Get current session
    async getSession() {
        const sessionData = localStorage.getItem(LOCAL_SESSION_KEY);
        if (!sessionData) return null;
        
        const session = JSON.parse(sessionData);
        
        // Check if session expired
        if (Date.now() > session.expires_at) {
            localStorage.removeItem(LOCAL_SESSION_KEY);
            return null;
        }
        
        return session;
    },
    
    // Sign out
    async signOut() {
        localStorage.removeItem(LOCAL_SESSION_KEY);
        return true;
    },
    
    // Get user profile
    async getProfile(userId) {
        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
        return profiles[userId] || null;
    },
    
    // Update profile
    async updateProfile(userId, updates) {
        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
        if (profiles[userId]) {
            profiles[userId] = { ...profiles[userId], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
            return profiles[userId];
        }
        throw new Error('Profile not found');
    },
    
    // Search users
    async searchUsers(query) {
        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
        const results = [];
        
        for (const profile of Object.values(profiles)) {
            if (profile.username.toLowerCase().includes(query.toLowerCase()) ||
                profile.full_name.toLowerCase().includes(query.toLowerCase())) {
                results.push(profile);
            }
        }
        
        return results;
    },
    
    // Send message
    async sendMessage(senderId, receiverId, content) {
        const messages = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');
        
        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            sender_id: senderId,
            receiver_id: receiverId,
            content: content,
            created_at: new Date().toISOString()
        };
        
        messages.push(message);
        localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
        
        return message;
    },
    
    // Get messages
    async getMessages(userId1, userId2) {
        const messages = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');
        
        return messages.filter(msg => 
            (msg.sender_id === userId1 && msg.receiver_id === userId2) ||
            (msg.sender_id === userId2 && msg.receiver_id === userId1)
        ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
};

// Enhanced Supabase client with local fallback
window.createEnhancedSupabaseClient = function() {
    const originalSb = window.sb;
    
    return {
        // Auth methods
        auth: {
            async signUp(options) {
                if (originalSb) {
                    try {
                        return await originalSb.auth.signUp(options);
                    } catch (error) {
                        console.warn('Supabase signup failed, using local auth:', error);
                    }
                }
                
                // Fallback to local auth
                const result = await window.localAuth.signUp(
                    options.email, 
                    options.password, 
                    options.options?.data || {}
                );
                
                return {
                    data: { user: result.user },
                    error: null
                };
            },
            
            async signInWithPassword(options) {
                if (originalSb) {
                    try {
                        return await originalSb.auth.signInWithPassword(options);
                    } catch (error) {
                        console.warn('Supabase signin failed, using local auth:', error);
                    }
                }
                
                // Fallback to local auth
                const session = await window.localAuth.signIn(options.email, options.password);
                
                return {
                    data: { user: session.user, session: session },
                    error: null
                };
            },
            
            async getSession() {
                if (originalSb) {
                    try {
                        const result = await originalSb.auth.getSession();
                        if (result.data.session) return result;
                    } catch (error) {
                        console.warn('Supabase session check failed:', error);
                    }
                }
                
                // Fallback to local auth
                const session = await window.localAuth.getSession();
                return {
                    data: { session: session },
                    error: null
                };
            },
            
            async signOut() {
                if (originalSb) {
                    try {
                        await originalSb.auth.signOut();
                    } catch (error) {
                        console.warn('Supabase signout failed:', error);
                    }
                }
                
                await window.localAuth.signOut();
                return { error: null };
            },
            
            onAuthStateChange(callback) {
                if (originalSb) {
                    return originalSb.auth.onAuthStateChange(callback);
                }
                
                // Simple local implementation
                return { data: { subscription: { unsubscribe: () => {} } } };
            }
        },
        
        // Database methods
        from(table) {
            return {
                select(columns = '*') {
                    return {
                        async eq(column, value) {
                            if (originalSb) {
                                try {
                                    return await originalSb.from(table).select(columns).eq(column, value);
                                } catch (error) {
                                    console.warn(`Supabase ${table} query failed:`, error);
                                }
                            }
                            
                            // Local fallback for profiles
                            if (table === 'profiles') {
                                const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
                                const results = Object.values(profiles).filter(p => p[column] === value);
                                return { data: results, error: null };
                            }
                            
                            return { data: [], error: null };
                        },
                        
                        async single() {
                            const result = await this.eq();
                            return {
                                data: result.data?.[0] || null,
                                error: result.data?.length === 0 ? { code: 'PGRST116' } : null
                            };
                        }
                    };
                },
                
                async insert(data) {
                    if (originalSb) {
                        try {
                            return await originalSb.from(table).insert(data);
                        } catch (error) {
                            console.warn(`Supabase ${table} insert failed:`, error);
                        }
                    }
                    
                    // Local fallback
                    if (table === 'profiles') {
                        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
                        profiles[data.id] = { ...data, created_at: new Date().toISOString() };
                        localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
                    }
                    
                    return { data: [data], error: null };
                },
                
                update(data) {
                    return {
                        async eq(column, value) {
                            if (originalSb) {
                                try {
                                    return await originalSb.from(table).update(data).eq(column, value);
                                } catch (error) {
                                    console.warn(`Supabase ${table} update failed:`, error);
                                }
                            }
                            
                            // Local fallback
                            if (table === 'profiles') {
                                const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');
                                for (const profile of Object.values(profiles)) {
                                    if (profile[column] === value) {
                                        Object.assign(profile, data, { updated_at: new Date().toISOString() });
                                    }
                                }
                                localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));
                            }
                            
                            return { data: [data], error: null };
                        }
                    };
                }
            };
        }
    };
};

// Initialize enhanced client
setTimeout(() => {
    if (!window.sb || !window.sb.auth) {
        console.log('🔄 Supabase not available, using local auth system');
        window.sb = window.createEnhancedSupabaseClient();
        
        // Create demo users for testing
        window.localAuth.signUp('demo@example.com', 'demo123', {
            username: 'demo_user',
            full_name: 'Demo User',
            bio: 'This is a demo account for testing'
        }).catch(() => {}); // Ignore if already exists
        
        console.log('✅ Local auth system ready');
        console.log('🎯 Demo account: demo@example.com / demo123');
    }
}, 2000);

console.log('✅ Local Auth System initialized');