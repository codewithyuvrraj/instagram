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
        const session = {\n            user: user,\n            profile: profile,\n            access_token: 'local_token_' + Date.now(),\n            expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours\n        };\n        \n        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));\n        \n        return session;\n    },\n    \n    // Get current session\n    async getSession() {\n        const sessionData = localStorage.getItem(LOCAL_SESSION_KEY);\n        if (!sessionData) return null;\n        \n        const session = JSON.parse(sessionData);\n        \n        // Check if session expired\n        if (Date.now() > session.expires_at) {\n            localStorage.removeItem(LOCAL_SESSION_KEY);\n            return null;\n        }\n        \n        return session;\n    },\n    \n    // Sign out\n    async signOut() {\n        localStorage.removeItem(LOCAL_SESSION_KEY);\n        return true;\n    },\n    \n    // Get user profile\n    async getProfile(userId) {\n        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n        return profiles[userId] || null;\n    },\n    \n    // Update profile\n    async updateProfile(userId, updates) {\n        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n        if (profiles[userId]) {\n            profiles[userId] = { ...profiles[userId], ...updates, updated_at: new Date().toISOString() };\n            localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));\n            return profiles[userId];\n        }\n        throw new Error('Profile not found');\n    },\n    \n    // Search users\n    async searchUsers(query) {\n        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n        const results = [];\n        \n        for (const profile of Object.values(profiles)) {\n            if (profile.username.toLowerCase().includes(query.toLowerCase()) ||\n                profile.full_name.toLowerCase().includes(query.toLowerCase())) {\n                results.push(profile);\n            }\n        }\n        \n        return results;\n    },\n    \n    // Send message\n    async sendMessage(senderId, receiverId, content) {\n        const messages = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');\n        \n        const message = {\n            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),\n            sender_id: senderId,\n            receiver_id: receiverId,\n            content: content,\n            created_at: new Date().toISOString()\n        };\n        \n        messages.push(message);\n        localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));\n        \n        return message;\n    },\n    \n    // Get messages\n    async getMessages(userId1, userId2) {\n        const messages = JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '[]');\n        \n        return messages.filter(msg => \n            (msg.sender_id === userId1 && msg.receiver_id === userId2) ||\n            (msg.sender_id === userId2 && msg.receiver_id === userId1)\n        ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));\n    }\n};\n\n// Enhanced Supabase client with local fallback\nwindow.createEnhancedSupabaseClient = function() {\n    const originalSb = window.sb;\n    \n    return {\n        // Auth methods\n        auth: {\n            async signUp(options) {\n                if (originalSb) {\n                    try {\n                        return await originalSb.auth.signUp(options);\n                    } catch (error) {\n                        console.warn('Supabase signup failed, using local auth:', error);\n                    }\n                }\n                \n                // Fallback to local auth\n                const result = await window.localAuth.signUp(\n                    options.email, \n                    options.password, \n                    options.options?.data || {}\n                );\n                \n                return {\n                    data: { user: result.user },\n                    error: null\n                };\n            },\n            \n            async signInWithPassword(options) {\n                if (originalSb) {\n                    try {\n                        return await originalSb.auth.signInWithPassword(options);\n                    } catch (error) {\n                        console.warn('Supabase signin failed, using local auth:', error);\n                    }\n                }\n                \n                // Fallback to local auth\n                const session = await window.localAuth.signIn(options.email, options.password);\n                \n                return {\n                    data: { user: session.user, session: session },\n                    error: null\n                };\n            },\n            \n            async getSession() {\n                if (originalSb) {\n                    try {\n                        const result = await originalSb.auth.getSession();\n                        if (result.data.session) return result;\n                    } catch (error) {\n                        console.warn('Supabase session check failed:', error);\n                    }\n                }\n                \n                // Fallback to local auth\n                const session = await window.localAuth.getSession();\n                return {\n                    data: { session: session },\n                    error: null\n                };\n            },\n            \n            async signOut() {\n                if (originalSb) {\n                    try {\n                        await originalSb.auth.signOut();\n                    } catch (error) {\n                        console.warn('Supabase signout failed:', error);\n                    }\n                }\n                \n                await window.localAuth.signOut();\n                return { error: null };\n            },\n            \n            onAuthStateChange(callback) {\n                if (originalSb) {\n                    return originalSb.auth.onAuthStateChange(callback);\n                }\n                \n                // Simple local implementation\n                return { data: { subscription: { unsubscribe: () => {} } } };\n            }\n        },\n        \n        // Database methods\n        from(table) {\n            return {\n                select(columns = '*') {\n                    return {\n                        async eq(column, value) {\n                            if (originalSb) {\n                                try {\n                                    return await originalSb.from(table).select(columns).eq(column, value);\n                                } catch (error) {\n                                    console.warn(`Supabase ${table} query failed:`, error);\n                                }\n                            }\n                            \n                            // Local fallback for profiles\n                            if (table === 'profiles') {\n                                const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n                                const results = Object.values(profiles).filter(p => p[column] === value);\n                                return { data: results, error: null };\n                            }\n                            \n                            return { data: [], error: null };\n                        },\n                        \n                        async single() {\n                            const result = await this.eq();\n                            return {\n                                data: result.data?.[0] || null,\n                                error: result.data?.length === 0 ? { code: 'PGRST116' } : null\n                            };\n                        }\n                    };\n                },\n                \n                async insert(data) {\n                    if (originalSb) {\n                        try {\n                            return await originalSb.from(table).insert(data);\n                        } catch (error) {\n                            console.warn(`Supabase ${table} insert failed:`, error);\n                        }\n                    }\n                    \n                    // Local fallback\n                    if (table === 'profiles') {\n                        const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n                        profiles[data.id] = { ...data, created_at: new Date().toISOString() };\n                        localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));\n                    }\n                    \n                    return { data: [data], error: null };\n                },\n                \n                update(data) {\n                    return {\n                        async eq(column, value) {\n                            if (originalSb) {\n                                try {\n                                    return await originalSb.from(table).update(data).eq(column, value);\n                                } catch (error) {\n                                    console.warn(`Supabase ${table} update failed:`, error);\n                                }\n                            }\n                            \n                            // Local fallback\n                            if (table === 'profiles') {\n                                const profiles = JSON.parse(localStorage.getItem(LOCAL_PROFILES_KEY) || '{}');\n                                for (const profile of Object.values(profiles)) {\n                                    if (profile[column] === value) {\n                                        Object.assign(profile, data, { updated_at: new Date().toISOString() });\n                                    }\n                                }\n                                localStorage.setItem(LOCAL_PROFILES_KEY, JSON.stringify(profiles));\n                            }\n                            \n                            return { data: [data], error: null };\n                        }\n                    };\n                }\n            };\n        }\n    };\n};\n\n// Initialize enhanced client\nsetTimeout(() => {\n    if (!window.sb || !window.sb.auth) {\n        console.log('🔄 Supabase not available, using local auth system');\n        window.sb = window.createEnhancedSupabaseClient();\n        \n        // Create demo users for testing\n        window.localAuth.signUp('demo@example.com', 'demo123', {\n            username: 'demo_user',\n            full_name: 'Demo User',\n            bio: 'This is a demo account for testing'\n        }).catch(() => {}); // Ignore if already exists\n        \n        console.log('✅ Local auth system ready');\n        console.log('🎯 Demo account: demo@example.com / demo123');\n    }\n}, 2000);\n\nconsole.log('✅ Local Auth System initialized');\n