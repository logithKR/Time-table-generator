import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

function LoginPage() {
    const { authError, clearError, initializeGoogle, GOOGLE_CLIENT_ID } = useAuth();
    const googleBtnRef = useRef(null);
    const [gsiReady, setGsiReady] = useState(false);

    // Wait for Google Identity Services to load, then render the sign-in button
    useEffect(() => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait

        const checkGsi = setInterval(() => {
            attempts++;
            if (window.google?.accounts?.id) {
                clearInterval(checkGsi);
                setGsiReady(true);

                // Initialize with the auth context (which sets the callback)
                initializeGoogle();

                // Render the Google Sign-In button
                if (googleBtnRef.current) {
                    window.google.accounts.id.renderButton(googleBtnRef.current, {
                        theme: 'filled_blue',
                        size: 'large',
                        width: 320,
                        text: 'signin_with',
                        shape: 'pill',
                        logo_alignment: 'center',
                    });
                }
            }
            if (attempts >= maxAttempts) {
                clearInterval(checkGsi);
            }
        }, 100);

        return () => clearInterval(checkGsi);
    }, [initializeGoogle, GOOGLE_CLIENT_ID]);

    return (
        <div className="login-page">
            {/* Animated background shapes */}
            <div className="login-bg-shapes">
                <div className="login-shape login-shape-1"></div>
                <div className="login-shape login-shape-2"></div>
                <div className="login-shape login-shape-3"></div>
            </div>

            <div className="login-container">
                {/* Logo & Branding */}
                <div className="login-header">
                    <div className="login-logo-wrapper">
                        <img
                            src="./bitsathy-logo.png"
                            alt="BITSATHY Logo"
                            className="login-logo"
                        />
                    </div>
                    <h1 className="login-title">BIT Scheduler</h1>
                    <p className="login-subtitle">
                        Automated Timetable Generation System
                    </p>
                </div>

                {/* Login Card */}
                <div className="login-card">
                    <div className="login-card-header">
                        <h2 className="login-card-title">Welcome</h2>
                        <p className="login-card-desc">
                            Sign in with your institutional email to continue
                        </p>
                    </div>

                    {/* Error Message */}
                    {authError && (
                        <div className="login-error" role="alert">
                            <svg className="login-error-icon" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <div className="login-error-content">
                                <p className="login-error-text">{authError}</p>
                            </div>
                            <button onClick={clearError} className="login-error-dismiss" aria-label="Dismiss error">
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    )}

                    {/* Google Sign-In Button */}
                    <div className="login-btn-area">
                        <div
                            ref={googleBtnRef}
                            id="google-signin-btn"
                            className="login-google-btn"
                        ></div>

                        {!gsiReady && (
                            <div className="login-loading-btn">
                                <div className="login-spinner"></div>
                                <span>Loading Google Sign-In...</span>
                            </div>
                        )}
                    </div>

                    {/* Domain Notice */}
                    <div className="login-domain-notice">
                        <svg className="login-notice-icon" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p>
                            Only <strong>@bitsathy.ac.in</strong> email IDs are allowed
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="login-footer">
                    Bannari Amman Institute of Technology &bull; Sathyamangalam
                </p>
            </div>
        </div>
    );
}

export default LoginPage;
