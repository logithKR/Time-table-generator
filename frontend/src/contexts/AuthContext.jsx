import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';

const AuthContext = createContext(null);

// Google OAuth Client ID — MUST be set via VITE_GOOGLE_CLIENT_ID env var.
// No fallback: missing value will cause a visible error, not silent misconfiguration.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID) {
    console.error('FATAL: VITE_GOOGLE_CLIENT_ID environment variable is not set.');
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState('');

    // Restore session from server via secure HTTP-only cookies on mount
    useEffect(() => {
        const checkSession = async () => {
            try {
                const res = await api.fetchSession();
                setUser(res.data.user);
                setIsAuthenticated(true);
            } catch (err) {
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        checkSession();
    }, []);

    // Handle the credential response from Google by forwarding securely to the Backend
    const handleCredentialResponse = useCallback(async (response) => {
        setAuthError('');
        setIsLoading(true);

        if (!response || !response.credential) {
            setAuthError('OAuth login failed. Please try again.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await api.loginGoogle(response.credential);
            setUser(res.data.user);
            setIsAuthenticated(true);
        } catch (err) {
            setAuthError(err.response?.data?.detail || 'Authentication failed. Please check your credentials.');
            // Revoke the token so Google doesn't auto-select this account next time
            if (window.google?.accounts?.id) {
                window.google.accounts.id.disableAutoSelect();
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initialize Google Identity Services
    const initializeGoogle = useCallback(() => {
        if (!window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
        });
    }, [handleCredentialResponse]);

    // Trigger the Google Sign-In popup
    const login = useCallback(() => {
        setAuthError('');

        if (!window.google?.accounts?.id) {
            setAuthError('Google Sign-In is not loaded yet. Please wait and try again.');
            return;
        }

        initializeGoogle();
        window.google.accounts.id.prompt((notification) => {
            if (notification.isNotDisplayed()) {
                // Fallback: use renderButton approach or show error
                // This can happen if 3rd party cookies are blocked
                const fallbackDiv = document.getElementById('google-signin-fallback');
                if (fallbackDiv) {
                    window.google.accounts.id.renderButton(fallbackDiv, {
                        theme: 'outline',
                        size: 'large',
                        width: 320,
                        text: 'signin_with',
                        shape: 'pill',
                    });
                }
            }
            if (notification.isSkippedMoment()) {
                // User dismissed the prompt
            }
        });
    }, [initializeGoogle]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await api.logout();
        } catch (err) {
            console.error('Logout failed on backend:', err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setAuthError('');

            if (window.google?.accounts?.id) {
                window.google.accounts.id.disableAutoSelect();
            }
        }
    }, []);

    const clearError = useCallback(() => setAuthError(''), []);

    const value = {
        user,
        isAuthenticated,
        isLoading,
        authError,
        login,
        logout,
        clearError,
        initializeGoogle,
        handleCredentialResponse,
        GOOGLE_CLIENT_ID,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
