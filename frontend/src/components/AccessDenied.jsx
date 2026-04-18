import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ShieldAlert, LogOut } from 'lucide-react';

function AccessDenied() {
    const { deniedMessage, clearAccessDenied } = useAuth();

    return (
        <div className="login-page text-center">
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
                            className="login-logo relative z-10"
                        />
                    </div>
                    <h1 className="login-title">BIT Scheduler</h1>
                </div>

                {/* Access Denied Card */}
                <div className="bg-white/90 backdrop-blur-xl rounded-[2.5rem] shadow-2xl p-8 sm:p-10 w-full relative z-10 border border-white/50 flex flex-col items-center">
                    
                    <div className="h-24 w-24 bg-red-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center shadow-lg shadow-red-200">
                            <ShieldAlert className="w-8 h-8 text-red-600" strokeWidth={2.5} />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Access Denied</h2>
                    
                    <div className="bg-red-50/80 border border-red-200 text-red-800 p-5 rounded-2xl text-sm leading-relaxed font-semibold w-full mb-8 relative overflow-hidden shadow-sm shadow-red-100">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500 rounded-l-2xl"></div>
                        {deniedMessage || "You do not have permission to access this system."}
                    </div>

                    <p className="text-slate-500 text-sm mb-10 font-medium px-4">
                        If you believe this is an error, please contact the IT Administrator to update your role.
                    </p>

                    <button 
                        onClick={clearAccessDenied}
                        className="w-full flex items-center justify-center gap-2.5 bg-slate-900 hover:bg-slate-800 text-white py-4 px-6 rounded-2xl font-bold transition-all shadow-xl shadow-slate-900/20 hover:-translate-y-0.5 active:scale-95"
                    >
                        <LogOut className="w-5 h-5" />
                        Try Another Account
                    </button>
                    
                </div>

                {/* Footer */}
                <p className="login-footer mt-8">
                    Bannari Amman Institute of Technology &bull; Sathyamangalam
                </p>
            </div>
        </div>
    );
}

export default AccessDenied;
