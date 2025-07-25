'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Fetch user profile data including role
    const fetchUserProfile = async(userId) => {
        try {
            console.log('Fetching profile for user ID:', userId);
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching user profile:', error);
                return null;
            }

            console.log('Profile found:', data);
            return data;
        } catch (error) {
            console.error('Error in fetchUserProfile:', error);
            return null;
        }
    };

    useEffect(() => {
        const setupAuthChangeHandler = async() => {
            const { data: { subscription } } = supabase.auth.onAuthStateChange(async(event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    // Fetch user profile with role information
                    const profile = await fetchUserProfile(session.user.id);
                    setUserProfile(profile);
                } else {
                    setUser(null);
                    setUserProfile(null);
                }
                setLoading(false);
            });

            // Initial session check
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUser(session.user);
                // Fetch user profile with role information
                const profile = await fetchUserProfile(session.user.id);
                setUserProfile(profile);
            }
            setLoading(false);

            return () => subscription.unsubscribe();
        };

        setupAuthChangeHandler();
    }, []);

    // Custom sign in function that verifies the user's role
    const signInWithRole = async(email, password, requiredRole = 'dispatcher') => {
        try {
            // First attempt to sign in with credentials
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                return { error };
            }

            // If sign in succeeds, check the user's role
            if (data?.user) {
                console.log('User signed in successfully, checking profile');
                const profile = await fetchUserProfile(data.user.id);

                if (!profile) {
                    console.error('No profile found for user ID:', data.user.id);
                    // Profile doesn't exist
                    await supabase.auth.signOut(); // Sign out immediately
                    return {
                        error: {
                            message: 'User profile not found. Please contact support.'
                        }
                    };
                }

                if (profile.role !== requiredRole) {
                    // User doesn't have the required role
                    await supabase.auth.signOut(); // Sign out immediately
                    return {
                        error: {
                            message: `Access denied. This application is only for ${requiredRole}s.`
                        }
                    };
                }

                // Set the profile in state
                setUserProfile(profile);
                return data;
            }

            return { error: { message: 'Unknown error during authentication' } };
        } catch (err) {
            console.error('Error in signInWithRole:', err);
            return { error: { message: 'An unexpected error occurred' } };
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        signUp: (email, password) => supabase.auth.signUp({ email, password }),
        signIn: (email, password) => signInWithRole(email, password, 'dispatcher'),
        signOut: () => supabase.auth.signOut(),
        hasRole: (role) => userProfile?.role === role,
        isDispatcher: () => userProfile?.role === 'dispatcher',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}