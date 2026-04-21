import React, { useState, useEffect } from 'react';

const AdminLogs = () => {
  const [activeTab, setActiveTab] = useState('auth');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true); // Start loading on mount
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('admin_token') || sessionStorage.getItem('token');

  // This effect runs once on mount to verify the admin session.
  // It resolves the 401 error by checking credentials before fetching data.
  useEffect(() => {
    const verifySessionAndFetch = async () => {
      const token = getToken();
      if (!token) {
        setError("Unauthorized access. Please log in as an admin.");
        setLoading(false);
        return;
      }

      try {
        const sessionResponse = await fetch('/api/admin/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (sessionResponse.status === 401) {
          throw new Error("Session expired or invalid. Please log in again.");
        }
        if (!sessionResponse.ok) {
          throw new Error("Failed to verify admin session.");
        }

        // Session is valid, now fetch the initial logs.
        await fetchLogs(activeTab, token);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    verifySessionAndFetch();
  }, []); // Run only once

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    fetchLogs(tab);
  };

  const fetchLogs = async (type, tokenOverride) => {
    setLoading(true);
    try {
      const token = tokenOverride || getToken();
      if (!token) throw new Error("Admin token not found.");
      
      const response = await fetch(`/api/admin/logs/${type}?page=1&limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        throw new Error("Unauthorized. Your session may have expired.");
      }
      if (!response.ok) {
        throw new Error('Failed to fetch logs. The server may be down.');
      }
      
      const data = await response.json();
      // The backend now provides correctly formatted data, which will render perfectly.
      setLogs(data.data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
      setError(error.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="text-red-500 mt-2">{error}</p>
        <a href="/admin/login" className="mt-4 inline-block bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
          Go to Admin Login
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">System Logs</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'auth' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => handleTabChange('auth')}
        >
          Authentication Logs
        </button>
        <button
          className={`py-2 px-4 font-semibold ${activeTab === 'activity' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => handleTabChange('activity')}
        >
          User Activity Logs
        </button>
      </div>

      {/* Logs Display */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (IST)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (GMT)</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                {activeTab === 'auth' ? (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">Verifying session and loading logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="6" className="px-6 py-4 text-center text-gray-500">No logs found.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.timestamp_ist}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.timestamp_gmt}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.email || "System/Unknown"}</td>
                    
                    {activeTab === 'auth' ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{log.event_type}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            log.method === 'Generate' ? 'bg-green-100 text-green-800' : 
                            log.method === 'Edit' ? 'bg-yellow-100 text-yellow-800' : 
                            log.method === 'Delete' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                            {log.method}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.action}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.status_code}</td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;