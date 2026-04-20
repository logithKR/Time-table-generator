import React, { useState, useEffect } from 'react';
import { Shield, Mail, Lock, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import * as api from '../utils/api';

function AdminLogin({ onLoginSuccess, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // If already logged in, redirect immediately
    useEffect(() => {
        if (api.getAdminToken()) {
            onLoginSuccess();
        }
    }, [onLoginSuccess]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const res = await api.adminLogin(email, password);
            const token = res.data.token;
            api.setAdminToken(token);
            onLoginSuccess();
        } catch (err) {
            const detail = err.response?.data?.detail;
            if (typeof detail === 'string') {
                setError(detail);
            } else if (detail?.message) {
                setError(detail.message);
            } else if (err.response?.status === 401) {
                setError('Invalid email or password.');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="admin-login-page">
            {/* Background decoration */}
            <div className="admin-login-bg">
                <div className="admin-login-shape admin-login-shape-1"></div>
                <div className="admin-login-shape admin-login-shape-2"></div>
            </div>

            <div className="admin-login-container">
                {/* Back button */}
                <button
                    onClick={onBack}
                    className="admin-login-back-btn"
                    type="button"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to User Login
                </button>

                {/* Card */}
                <div className="admin-login-card">
                    {/* Header */}
                    <div className="admin-login-header">
                        <div className="admin-login-icon-wrap">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="admin-login-title">Admin Access</h1>
                        <p className="admin-login-subtitle">
                            Restricted to authorized administrators only
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="admin-login-error" role="alert">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                            <button onClick={() => setError('')} className="admin-login-error-dismiss" aria-label="Dismiss">×</button>
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="admin-login-form">
                        <div className="admin-login-field">
                            <label htmlFor="admin-email" className="admin-login-label">Email</label>
                            <div className="admin-login-input-wrap">
                                <Mail className="admin-login-input-icon" />
                                <input
                                    id="admin-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    placeholder="admin@bitsathy.ac.in"
                                    className="admin-login-input"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="admin-login-field">
                            <label htmlFor="admin-password" className="admin-login-label">Password</label>
                            <div className="admin-login-input-wrap">
                                <Lock className="admin-login-input-icon" />
                                <input
                                    id="admin-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="admin-login-input"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !email || !password}
                            className="admin-login-submit"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <Shield className="w-4 h-4" />
                                    Sign In as Admin
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer notice */}
                    <div className="admin-login-notice">
                        <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                        <p>This area is monitored. Unauthorized access attempts are logged.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminLogin;
