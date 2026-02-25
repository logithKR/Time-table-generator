import { useState } from 'react';
import { Calendar, Mail, Lock, User, Phone, Shield, ChevronRight, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import * as api from '../utils/api';

export default function LoginPage({ onLoginSuccess }) {
    const [isRegisterPanel, setIsRegisterPanel] = useState(false);
    const [isSliding, setIsSliding] = useState(false);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [loginLoading, setLoginLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);

    // Register state
    const [adminVerified, setAdminVerified] = useState(false);
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [adminError, setAdminError] = useState('');
    const [adminLoading, setAdminLoading] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);

    // Registration form
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPhone, setRegPhone] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [regConfirm, setRegConfirm] = useState('');
    const [regError, setRegError] = useState('');
    const [regSuccess, setRegSuccess] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [showRegPassword, setShowRegPassword] = useState(false);

    const switchPanel = (toRegister) => {
        setIsSliding(true);
        setTimeout(() => {
            setIsRegisterPanel(toRegister);
            setIsSliding(false);
        }, 300);
        // Reset states
        setLoginError('');
        setAdminError('');
        setRegError('');
        setRegSuccess('');
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        setLoginLoading(true);
        try {
            const res = await api.loginUser({ email_id: loginEmail, password: loginPassword });
            onLoginSuccess(res.data.user);
        } catch (err) {
            setLoginError(err.response?.data?.detail || 'Login failed. Please try again.');
        } finally {
            setLoginLoading(false);
        }
    };

    const handleAdminVerify = async (e) => {
        e.preventDefault();
        setAdminError('');
        setAdminLoading(true);
        try {
            await api.adminVerify({ email_id: adminEmail, password: adminPassword });
            setAdminVerified(true);
        } catch (err) {
            setAdminError(err.response?.data?.detail || 'Admin verification failed.');
        } finally {
            setAdminLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError('');
        setRegSuccess('');

        if (regPassword !== regConfirm) {
            setRegError('Passwords do not match');
            return;
        }
        if (regPassword.length < 4) {
            setRegError('Password must be at least 4 characters');
            return;
        }

        setRegLoading(true);
        try {
            await api.registerUser({
                name: regName,
                email_id: regEmail,
                phone_number: regPhone || null,
                password: regPassword
            });
            setRegSuccess('Registration successful! You can now login.');
            // Reset registration form
            setRegName('');
            setRegEmail('');
            setRegPhone('');
            setRegPassword('');
            setRegConfirm('');
            // Auto-switch to login after 2 seconds
            setTimeout(() => {
                setAdminVerified(false);
                setAdminEmail('');
                setAdminPassword('');
                switchPanel(false);
                setRegSuccess('');
            }, 2000);
        } catch (err) {
            setRegError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setRegLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
            padding: '20px',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decorative elements */}
            <div style={{
                position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)', top: '-150px', right: '-100px'
            }} />
            <div style={{
                position: 'absolute', width: '400px', height: '400px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.03)', bottom: '-100px', left: '-100px'
            }} />
            <div style={{
                position: 'absolute', width: '200px', height: '200px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)', top: '40%', left: '10%'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '480px',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Logo / Title */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '32px',
                    animation: 'fadeInDown 0.6s ease-out'
                }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '64px',
                        height: '64px',
                        background: 'rgba(255,255,255,0.2)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '20px',
                        marginBottom: '16px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                        border: '1px solid rgba(255,255,255,0.3)'
                    }}>
                        <Calendar style={{ width: '32px', height: '32px', color: 'white' }} />
                    </div>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: '800',
                        color: 'white',
                        margin: '0 0 6px 0',
                        letterSpacing: '-0.5px'
                    }}>BIT Scheduler Pro</h1>
                    <p style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.7)',
                        margin: 0,
                        fontWeight: '500'
                    }}>Timetable Management System</p>
                </div>

                {/* Card Container */}
                <div style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '24px',
                    boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.2)',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    transform: isSliding ? 'scale(0.98)' : 'scale(1)',
                    opacity: isSliding ? 0.7 : 1
                }}>
                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #f0f0f0',
                        background: '#fafafa'
                    }}>
                        <button
                            onClick={() => switchPanel(false)}
                            style={{
                                flex: 1,
                                padding: '16px',
                                border: 'none',
                                background: !isRegisterPanel ? 'white' : 'transparent',
                                color: !isRegisterPanel ? '#6366f1' : '#9ca3af',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderBottom: !isRegisterPanel ? '3px solid #6366f1' : '3px solid transparent',
                                letterSpacing: '0.3px'
                            }}
                        >
                            Sign In
                        </button>
                        <button
                            onClick={() => switchPanel(true)}
                            style={{
                                flex: 1,
                                padding: '16px',
                                border: 'none',
                                background: isRegisterPanel ? 'white' : 'transparent',
                                color: isRegisterPanel ? '#6366f1' : '#9ca3af',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderBottom: isRegisterPanel ? '3px solid #6366f1' : '3px solid transparent',
                                letterSpacing: '0.3px'
                            }}
                        >
                            Register
                        </button>
                    </div>

                    <div style={{ padding: '32px' }}>
                        {/* ============ LOGIN PANEL ============ */}
                        {!isRegisterPanel && (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <h2 style={{
                                    fontSize: '22px', fontWeight: '700', color: '#1f2937',
                                    margin: '0 0 4px 0'
                                }}>Welcome Back</h2>
                                <p style={{
                                    fontSize: '13px', color: '#9ca3af', margin: '0 0 28px 0'
                                }}>Sign in to access your timetable dashboard</p>

                                <form onSubmit={handleLogin}>
                                    {/* Email */}
                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{
                                            display: 'block', fontSize: '13px', fontWeight: '600',
                                            color: '#374151', marginBottom: '6px'
                                        }}>Email Address</label>
                                        <div style={{ position: 'relative' }}>
                                            <Mail style={{
                                                position: 'absolute', left: '14px', top: '50%',
                                                transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                color: '#9ca3af'
                                            }} />
                                            <input
                                                type="email"
                                                value={loginEmail}
                                                onChange={e => setLoginEmail(e.target.value)}
                                                placeholder="Enter your email"
                                                required
                                                style={{
                                                    width: '100%', padding: '12px 14px 12px 44px',
                                                    border: '2px solid #e5e7eb', borderRadius: '14px',
                                                    fontSize: '14px', outline: 'none',
                                                    transition: 'all 0.2s ease',
                                                    background: '#fafafa',
                                                    boxSizing: 'border-box'
                                                }}
                                                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{
                                            display: 'block', fontSize: '13px', fontWeight: '600',
                                            color: '#374151', marginBottom: '6px'
                                        }}>Password</label>
                                        <div style={{ position: 'relative' }}>
                                            <Lock style={{
                                                position: 'absolute', left: '14px', top: '50%',
                                                transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                color: '#9ca3af'
                                            }} />
                                            <input
                                                type={showLoginPassword ? 'text' : 'password'}
                                                value={loginPassword}
                                                onChange={e => setLoginPassword(e.target.value)}
                                                placeholder="Enter your password"
                                                required
                                                style={{
                                                    width: '100%', padding: '12px 44px 12px 44px',
                                                    border: '2px solid #e5e7eb', borderRadius: '14px',
                                                    fontSize: '14px', outline: 'none',
                                                    transition: 'all 0.2s ease',
                                                    background: '#fafafa',
                                                    boxSizing: 'border-box'
                                                }}
                                                onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                                                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                style={{
                                                    position: 'absolute', right: '14px', top: '50%',
                                                    transform: 'translateY(-50%)', background: 'none',
                                                    border: 'none', cursor: 'pointer', padding: '2px',
                                                    color: '#9ca3af'
                                                }}
                                            >
                                                {showLoginPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                                            </button>
                                        </div>
                                    </div>

                                    {loginError && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '12px 16px', background: '#fef2f2', borderRadius: '12px',
                                            marginBottom: '18px', border: '1px solid #fecaca'
                                        }}>
                                            <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                                            <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{loginError}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={loginLoading}
                                        style={{
                                            width: '100%', padding: '14px',
                                            background: loginLoading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            color: 'white', border: 'none', borderRadius: '14px',
                                            fontSize: '15px', fontWeight: '700', cursor: loginLoading ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.3s ease',
                                            boxShadow: loginLoading ? 'none' : '0 4px 15px rgba(99,102,241,0.4)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            letterSpacing: '0.3px'
                                        }}
                                    >
                                        {loginLoading ? (
                                            <div style={{
                                                width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)',
                                                borderTopColor: 'white', borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }} />
                                        ) : (
                                            <>Sign In <ChevronRight style={{ width: '18px', height: '18px' }} /></>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ============ REGISTER PANEL ============ */}
                        {isRegisterPanel && (
                            <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                {!adminVerified ? (
                                    /* --- Step 1: Admin Verification --- */
                                    <>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            marginBottom: '6px'
                                        }}>
                                            <Shield style={{ width: '22px', height: '22px', color: '#f59e0b' }} />
                                            <h2 style={{
                                                fontSize: '22px', fontWeight: '700', color: '#1f2937', margin: 0
                                            }}>Admin Verification</h2>
                                        </div>
                                        <p style={{
                                            fontSize: '13px', color: '#9ca3af', margin: '0 0 24px 0'
                                        }}>Enter admin credentials to proceed with registration</p>

                                        <div style={{
                                            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                                            borderRadius: '14px', padding: '14px 16px',
                                            marginBottom: '24px', border: '1px solid #fcd34d',
                                            display: 'flex', alignItems: 'flex-start', gap: '10px'
                                        }}>
                                            <Shield style={{ width: '16px', height: '16px', color: '#d97706', flexShrink: 0, marginTop: '1px' }} />
                                            <p style={{
                                                fontSize: '12px', color: '#92400e', margin: 0, lineHeight: '1.5', fontWeight: '500'
                                            }}>
                                                Registration requires admin authorization. Contact your administrator for the verification credentials.
                                            </p>
                                        </div>

                                        <form onSubmit={handleAdminVerify}>
                                            <div style={{ marginBottom: '18px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Admin Email</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Mail style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type="email"
                                                        value={adminEmail}
                                                        onChange={e => setAdminEmail(e.target.value)}
                                                        placeholder="Admin email address"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 14px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(245,158,11,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                </div>
                                            </div>

                                            <div style={{ marginBottom: '24px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Admin Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type={showAdminPassword ? 'text' : 'password'}
                                                        value={adminPassword}
                                                        onChange={e => setAdminPassword(e.target.value)}
                                                        placeholder="Admin password"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 44px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#f59e0b'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(245,158,11,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAdminPassword(!showAdminPassword)}
                                                        style={{
                                                            position: 'absolute', right: '14px', top: '50%',
                                                            transform: 'translateY(-50%)', background: 'none',
                                                            border: 'none', cursor: 'pointer', padding: '2px',
                                                            color: '#9ca3af'
                                                        }}
                                                    >
                                                        {showAdminPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {adminError && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '12px 16px', background: '#fef2f2', borderRadius: '12px',
                                                    marginBottom: '18px', border: '1px solid #fecaca'
                                                }}>
                                                    <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{adminError}</span>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={adminLoading}
                                                style={{
                                                    width: '100%', padding: '14px',
                                                    background: adminLoading ? '#fcd34d' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                                                    color: 'white', border: 'none', borderRadius: '14px',
                                                    fontSize: '15px', fontWeight: '700', cursor: adminLoading ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: adminLoading ? 'none' : '0 4px 15px rgba(245,158,11,0.4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    letterSpacing: '0.3px'
                                                }}
                                            >
                                                {adminLoading ? (
                                                    <div style={{
                                                        width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: 'white', borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }} />
                                                ) : (
                                                    <>Verify Admin <Shield style={{ width: '18px', height: '18px' }} /></>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                ) : (
                                    /* --- Step 2: Registration Form (after admin verified) --- */
                                    <>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            marginBottom: '6px'
                                        }}>
                                            <CheckCircle style={{ width: '22px', height: '22px', color: '#10b981' }} />
                                            <h2 style={{
                                                fontSize: '22px', fontWeight: '700', color: '#1f2937', margin: 0
                                            }}>Create Account</h2>
                                        </div>
                                        <div style={{
                                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                                            background: '#ecfdf5', padding: '6px 12px', borderRadius: '20px',
                                            marginBottom: '24px', border: '1px solid #a7f3d0'
                                        }}>
                                            <CheckCircle style={{ width: '14px', height: '14px', color: '#10b981' }} />
                                            <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>Admin Verified</span>
                                        </div>

                                        {regSuccess && (
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '12px 16px', background: '#ecfdf5', borderRadius: '12px',
                                                marginBottom: '18px', border: '1px solid #a7f3d0'
                                            }}>
                                                <CheckCircle style={{ width: '18px', height: '18px', color: '#10b981', flexShrink: 0 }} />
                                                <span style={{ fontSize: '13px', color: '#059669', fontWeight: '500' }}>{regSuccess}</span>
                                            </div>
                                        )}

                                        <form onSubmit={handleRegister}>
                                            {/* Name */}
                                            <div style={{ marginBottom: '14px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Full Name</label>
                                                <div style={{ position: 'relative' }}>
                                                    <User style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type="text"
                                                        value={regName}
                                                        onChange={e => setRegName(e.target.value)}
                                                        placeholder="Enter your full name"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 14px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Email */}
                                            <div style={{ marginBottom: '14px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Email Address</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Mail style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type="email"
                                                        value={regEmail}
                                                        onChange={e => setRegEmail(e.target.value)}
                                                        placeholder="Enter your email"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 14px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Phone */}
                                            <div style={{ marginBottom: '14px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Phone Number <span style={{ color: '#9ca3af', fontWeight: '400' }}>(optional)</span></label>
                                                <div style={{ position: 'relative' }}>
                                                    <Phone style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type="tel"
                                                        value={regPhone}
                                                        onChange={e => setRegPhone(e.target.value)}
                                                        placeholder="Enter phone number"
                                                        style={{
                                                            width: '100%', padding: '12px 14px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Password */}
                                            <div style={{ marginBottom: '14px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type={showRegPassword ? 'text' : 'password'}
                                                        value={regPassword}
                                                        onChange={e => setRegPassword(e.target.value)}
                                                        placeholder="Create a password"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 44px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowRegPassword(!showRegPassword)}
                                                        style={{
                                                            position: 'absolute', right: '14px', top: '50%',
                                                            transform: 'translateY(-50%)', background: 'none',
                                                            border: 'none', cursor: 'pointer', padding: '2px',
                                                            color: '#9ca3af'
                                                        }}
                                                    >
                                                        {showRegPassword ? <EyeOff style={{ width: '18px', height: '18px' }} /> : <Eye style={{ width: '18px', height: '18px' }} />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Confirm Password */}
                                            <div style={{ marginBottom: '24px' }}>
                                                <label style={{
                                                    display: 'block', fontSize: '13px', fontWeight: '600',
                                                    color: '#374151', marginBottom: '6px'
                                                }}>Confirm Password</label>
                                                <div style={{ position: 'relative' }}>
                                                    <Lock style={{
                                                        position: 'absolute', left: '14px', top: '50%',
                                                        transform: 'translateY(-50%)', width: '18px', height: '18px',
                                                        color: '#9ca3af'
                                                    }} />
                                                    <input
                                                        type="password"
                                                        value={regConfirm}
                                                        onChange={e => setRegConfirm(e.target.value)}
                                                        placeholder="Re-enter your password"
                                                        required
                                                        style={{
                                                            width: '100%', padding: '12px 14px 12px 44px',
                                                            border: '2px solid #e5e7eb', borderRadius: '14px',
                                                            fontSize: '14px', outline: 'none',
                                                            transition: 'all 0.2s ease',
                                                            background: '#fafafa',
                                                            boxSizing: 'border-box'
                                                        }}
                                                        onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = 'white'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                                                        onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#fafafa'; e.target.style.boxShadow = 'none'; }}
                                                    />
                                                </div>
                                            </div>

                                            {regError && (
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '12px 16px', background: '#fef2f2', borderRadius: '12px',
                                                    marginBottom: '18px', border: '1px solid #fecaca'
                                                }}>
                                                    <AlertCircle style={{ width: '18px', height: '18px', color: '#ef4444', flexShrink: 0 }} />
                                                    <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: '500' }}>{regError}</span>
                                                </div>
                                            )}

                                            <button
                                                type="submit"
                                                disabled={regLoading}
                                                style={{
                                                    width: '100%', padding: '14px',
                                                    background: regLoading ? '#6ee7b7' : 'linear-gradient(135deg, #10b981, #059669)',
                                                    color: 'white', border: 'none', borderRadius: '14px',
                                                    fontSize: '15px', fontWeight: '700', cursor: regLoading ? 'not-allowed' : 'pointer',
                                                    transition: 'all 0.3s ease',
                                                    boxShadow: regLoading ? 'none' : '0 4px 15px rgba(16,185,129,0.4)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                    letterSpacing: '0.3px'
                                                }}
                                            >
                                                {regLoading ? (
                                                    <div style={{
                                                        width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.3)',
                                                        borderTopColor: 'white', borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }} />
                                                ) : (
                                                    <>Create Account <ChevronRight style={{ width: '18px', height: '18px' }} /></>
                                                )}
                                            </button>
                                        </form>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <p style={{
                    textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.5)',
                    marginTop: '24px', fontWeight: '500'
                }}>
                    © 2026 BIT Scheduler Pro — Timetable Management
                </p>
            </div>

            {/* Global Animations */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
