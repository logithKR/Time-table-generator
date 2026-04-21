import React, { useState, useEffect, useCallback } from 'react';
import {
    Shield, LogOut, RefreshCw, FileText, Clock, AlertCircle,
    CheckCircle, ChevronLeft, ChevronRight, Filter, Loader2, Activity
} from 'lucide-react';
import * as api from '../utils/api';

function AdminDashboard({ onLogout }) {
    // Sync state
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);
    const [syncError, setSyncError] = useState(null);
    const [syncLogs, setSyncLogs] = useState([]);

    // Logs state
    const [logType, setLogType] = useState('auth');  // Changed from 'activity' to 'auth' to show login events
    const [logs, setLogs] = useState([]);
    const [logsPage, setLogsPage] = useState(1);
    const [logsTotal, setLogsTotal] = useState(0);
    const [logsTotalPages, setLogsTotalPages] = useState(0);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsError, setLogsError] = useState(null);
    const logsLimit = 25;

    // Date filters
    const today = new Date().toISOString().split('T')[0];
    const [filterDate, setFilterDate] = useState(today);

    // Active tab
    const [activeTab, setActiveTab] = useState('sync');

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        setLogsLoading(true);
        setLogsError(null);
        try {
            const res = await api.fetchAdminLogs(logType, logsPage, logsLimit, filterDate);
            const payload = res.data;
            setLogs(payload.data || []);
            setLogsTotal(payload.total || 0);
            setLogsTotalPages(payload.total_pages || 0);
        } catch (err) {
            if (err.response?.status === 401) return; // interceptor handles redirect
            setLogsError('Failed to fetch logs. ' + (err.response?.data?.detail || ''));
        } finally {
            setLogsLoading(false);
        }
    }, [logType, logsPage, filterDate]);

    const pollSyncStatus = useCallback(async () => {
        try {
            const res = await api.getAdminSyncStatus();
            const data = res.data;
            if (data.logs) {
                setSyncLogs(data.logs);
            }
            
            if (data.status === 'complete') {
                setIsSyncing(false);
                setSyncMessage('CMS data synced successfully');
            } else if (data.status === 'error') {
                setIsSyncing(false);
                setSyncError(data.error || 'Sync failed.');
            } else if (data.status === 'syncing') {
                setIsSyncing(true);
                setTimeout(pollSyncStatus, 2000); // Poll every 2 seconds
            }
        } catch (err) {
            setIsSyncing(false);
            setSyncError('Failed to fetch sync status.');
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        }
    }, [activeTab, fetchLogs]);

    useEffect(() => {
        // Check if sync is already running when component mounts
        api.getAdminSyncStatus().then(res => {
            if (res.data.status === 'syncing') {
                setIsSyncing(true);
                setSyncLogs(res.data.logs || []);
                pollSyncStatus();
            } else if (res.data.logs && res.data.logs.length > 0) {
                setSyncLogs(res.data.logs);
                if (res.data.status === 'error') setSyncError(res.data.error || 'Sync failed.');
                if (res.data.status === 'complete') setSyncMessage('CMS data synced successfully');
            }
        }).catch(err => console.error("Error checking sync status:", err));
    }, [pollSyncStatus]);

    // Sync handler
    const handleSync = async () => {
        setIsSyncing(true);
        setSyncMessage(null);
        setSyncError(null);
        setSyncLogs([]);
        try {
            const res = await api.triggerAdminSync();
            if (res.data.status === "started" || res.data.status === "already_running") {
                pollSyncStatus();
            }
        } catch (err) {
            if (err.response?.status === 401) return;
            setSyncError(err.response?.data?.detail || 'Sync failed to start.');
            setIsSyncing(false);
        }
    };

    // Logout handler
    const handleLogout = async () => {
        await api.adminLogout();
        onLogout();
    };

    // Format timestamp for display
    const formatTimestamp = (ts) => {
        if (!ts) return '—';
        try {
            const d = new Date(ts);
            return d.toLocaleString();
        } catch {
            return ts;
        }
    };

    const getLevelBadge = (level) => {
        const l = (level || 'info').toLowerCase();
        const map = {
            error: 'admin-log-badge-error',
            warning: 'admin-log-badge-warning',
            info: 'admin-log-badge-info',
            debug: 'admin-log-badge-debug',
        };
        return <span className={`admin-log-badge ${map[l] || map.info}`}>{l.toUpperCase()}</span>;
    };

    return (
        <div className="admin-dashboard">
            {/* Top bar */}
            <header className="admin-dashboard-header">
                <div className="admin-dashboard-brand">
                    <Shield className="w-6 h-6 text-purple-400" />
                    <h1>Admin Dashboard</h1>
                </div>
                <button onClick={handleLogout} className="admin-dashboard-logout">
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </header>

            {/* Tab bar */}
            <nav className="admin-dashboard-tabs">
                <button
                    className={`admin-tab ${activeTab === 'sync' ? 'admin-tab-active' : ''}`}
                    onClick={() => setActiveTab('sync')}
                >
                    <RefreshCw className="w-4 h-4" />
                    CMS Sync
                </button>
                <button
                    className={`admin-tab ${activeTab === 'logs' ? 'admin-tab-active' : ''}`}
                    onClick={() => setActiveTab('logs')}
                >
                    <FileText className="w-4 h-4" />
                    Audit Logs
                </button>
            </nav>

            {/* Content */}
            <main className="admin-dashboard-content">
                {/* ===== SYNC TAB ===== */}
                {activeTab === 'sync' && (
                    <div className="admin-sync-panel">
                        <div className="admin-panel-card">
                            <div className="admin-panel-card-header">
                                <RefreshCw className="w-5 h-5 text-purple-500" />
                                <h2>Sync Data from CMS</h2>
                            </div>
                            <p className="admin-panel-desc">
                                Trigger a full data synchronization from the College Management System.
                                This will import departments, faculty, courses, and student data.
                            </p>

                            {/* Sync feedback */}
                            {syncMessage && (
                                <div className="admin-alert admin-alert-success">
                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{syncMessage}</span>
                                </div>
                            )}
                            {syncError && (
                                <div className="admin-alert admin-alert-error">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                    <span>{syncError}</span>
                                </div>
                            )}

                            {/* Live Logs Terminal */}
                            {syncLogs.length > 0 && (
                                <div className="admin-sync-logs-terminal" style={{ 
                                    backgroundColor: '#111827', 
                                    color: '#d1d5db', 
                                    padding: '1rem', 
                                    borderRadius: '0.5rem', 
                                    minHeight: '100px',
                                    maxHeight: '350px',
                                    overflowY: 'auto',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    boxShadow: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                }}>
                                    {syncLogs.map((log, idx) => {
                                        let color = '#d1d5db'; // default / info
                                        if (log.level === 'error') color = '#ef4444';
                                        else if (log.level === 'success') color = '#10b981';
                                        else if (log.level === 'warning') color = '#f59e0b';
                                        else if (log.level === 'info') color = '#60a5fa';

                                        return (
                                            <div key={idx} style={{ marginBottom: '6px', lineHeight: '1.4' }}>
                                                <span style={{ color: '#6b7280', marginRight: '8px' }}>[{log.ts}]</span>
                                                <span style={{ color }}>{log.message}</span>
                                            </div>
                                        );
                                    })}
                                    {isSyncing && (
                                        <div style={{ marginTop: '8px', color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                                            <Loader2 className="w-3 h-3 animate-spin" style={{ marginRight: '6px' }} />
                                            Working...
                                        </div>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="admin-sync-btn"
                            >
                                {isSyncing ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-5 h-5" />
                                        Start Sync
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== LOGS TAB ===== */}
                {activeTab === 'logs' && (
                    <div className="admin-logs-panel">
                        <div className="admin-logs-tab-bar" style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <button
                                onClick={() => { setLogType('auth'); setLogsPage(1); }}
                                style={{
                                    flex: 1, padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s',
                                    background: logType === 'auth' ? 'white' : 'transparent',
                                    color: logType === 'auth' ? '#4f46e5' : '#6b7280',
                                    boxShadow: logType === 'auth' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    border: 'none', cursor: 'pointer'
                                }}
                            >
                                Authentication Logs
                            </button>
                            <button
                                onClick={() => { setLogType('activity'); setLogsPage(1); }}
                                style={{
                                    flex: 1, padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s',
                                    background: logType === 'activity' ? 'white' : 'transparent',
                                    color: logType === 'activity' ? '#4f46e5' : '#6b7280',
                                    boxShadow: logType === 'activity' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none',
                                    border: 'none', cursor: 'pointer'
                                }}
                            >
                                System Activity Logs
                            </button>
                        </div>

                        {/* Filter bar */}
                        <div className="admin-logs-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div className="admin-logs-filter-group" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'white', padding: '6px 12px', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
                                    <Filter className="w-4 h-4 text-gray-400" />
                                    <span style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Select Date:</span>
                                    <input 
                                        type="date" 
                                        value={filterDate} 
                                        onChange={(e) => { setFilterDate(e.target.value); setLogsPage(1); }}
                                        style={{ border: 'none', outline: 'none', fontSize: '13px', color: '#111827', fontWeight: '600', cursor: 'pointer' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={() => {
                                    setFilterDate(today);
                                    setLogsPage(1);
                                }} className="admin-logs-refresh-btn" style={{ backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' }}>
                                    Reset to Today
                                </button>
                                <button onClick={fetchLogs} className="admin-logs-refresh-btn" disabled={logsLoading}>
                                    <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {logsError && (
                            <div className="admin-alert admin-alert-error">
                                <AlertCircle className="w-4 h-4" />
                                <span>{logsError}</span>
                            </div>
                        )}

                        {/* Table */}
                        <div className="admin-logs-table-wrap">
                            {logsLoading ? (
                                <div className="admin-logs-loading">
                                    <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                                    <span>Loading logs...</span>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="admin-logs-empty">
                                    <Activity className="w-10 h-10 text-gray-300" />
                                    <p>No logs found for this category.</p>
                                </div>
                            ) : (
                                <table className="admin-logs-table">
                                    <thead>
                                        <tr>
                                            <th>Time (IST)</th>
                                            <th>Time (GMT)</th>
                                            <th>Email</th>
                                            {logType === 'auth' ? (
                                                <>
                                                    <th>Event</th>
                                                </>
                                            ) : (
                                                <>
                                                    <th>Action Type</th>
                                                    <th>Endpoint</th>
                                                    <th>Status</th>
                                                </>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log, idx) => (
                                            <tr key={log.id || idx}>
                                                <td>
                                                    <div className="admin-log-ts" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                        <span>{log.timestamp_ist || '—'}</span>
                                                    </div>
                                                </td>
                                                <td style={{ color: '#9ca3af' }}>
                                                    {log.timestamp_gmt || '—'}
                                                </td>
                                                <td className="admin-log-user" style={{ fontWeight: '500' }}>
                                                    {log.email || '—'}
                                                </td>

                                                {logType === 'auth' ? (
                                                    <>
                                                        <td className="admin-log-event">
                                                            <span className={`admin-log-badge ${
                                                                log.event_type === 'LOGIN' ? 'admin-log-badge-info' :
                                                                log.event_type === 'LOGOUT' ? 'admin-log-badge-warning' :
                                                                log.event_type?.includes('FAILED') ? 'admin-log-badge-error' :
                                                                'admin-log-badge-debug'
                                                            }`}>
                                                                {log.event_type}
                                                            </span>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="admin-log-event">
                                                            <span className={`admin-log-badge ${
                                                                log.method === 'GENERATE' ? 'admin-log-badge-info' :
                                                                log.method === 'EDIT' ? 'admin-log-badge-warning' :
                                                                log.method === 'DELETE' ? 'admin-log-badge-error' :
                                                                'admin-log-badge-debug'
                                                            }`}>
                                                                {log.method}
                                                            </span>
                                                        </td>
                                                        <td className="admin-log-detail">
                                                            {log.action || '—'}
                                                        </td>
                                                        <td>
                                                            <span className={`admin-log-badge ${
                                                                log.status_code >= 500 ? 'admin-log-badge-error' :
                                                                log.status_code >= 400 ? 'admin-log-badge-warning' :
                                                                'admin-log-badge-info'
                                                            }`}>
                                                                {log.status_code}
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Pagination */}
                        {logsTotalPages > 1 && (
                            <div className="admin-logs-pagination">
                                <span className="admin-logs-page-info">
                                    Page {logsPage} of {logsTotalPages} ({logsTotal} total)
                                </span>
                                <div className="admin-logs-page-btns">
                                    <button
                                        disabled={logsPage <= 1}
                                        onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                                        className="admin-page-btn"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Prev
                                    </button>
                                    <button
                                        disabled={logsPage >= logsTotalPages}
                                        onClick={() => setLogsPage(p => p + 1)}
                                        className="admin-page-btn"
                                    >
                                        Next <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;
