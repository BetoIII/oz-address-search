'use client';

import { useEffect, useState } from 'react';
import { FeatureFlag, ServiceHealthMetrics } from '@/lib/feature-flags';

interface AdminState {
  flags: Record<string, FeatureFlag>;
  metrics: ServiceHealthMetrics;
  currentService: string;
  error?: string;
  loading: boolean;
}

export default function FeatureFlagsAdmin() {
  const [state, setState] = useState<AdminState>({
    flags: {},
    metrics: {
      mcp: { failures: 0, lastFailure: null, consecutiveFailures: 0, lastSuccess: null },
      local: { failures: 0, lastFailure: null, consecutiveFailures: 0, lastSuccess: null },
      currentServiceType: null
    },
    currentService: 'unknown',
    loading: true
  });

  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFeatureFlags();
      // Refresh data every 30 seconds
      const interval = setInterval(fetchFeatureFlags, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  async function fetchFeatureFlags() {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        headers: {
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        }
      });

      if (response.status === 401) {
        setIsAuthenticated(false);
        setState(prev => ({ ...prev, error: 'Authentication failed', loading: false }));
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }

      const data = await response.json();
      setState({
        flags: data.flags,
        metrics: data.metrics,
        currentService: data.currentService,
        loading: false
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred',
        loading: false
      }));
    }
  }

  async function handleToggleFlag(flagName: string, enabled: boolean) {
    try {
      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${credentials.username}:${credentials.password}`)}`
        },
        body: JSON.stringify({
          flagName,
          enabled,
          updatedBy: credentials.username
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update feature flag');
      }

      // Refresh the flags
      await fetchFeatureFlags();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'An error occurred'
      }));
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsAuthenticated(true);
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
        <div className="relative py-3 sm:max-w-xl sm:mx-auto">
          <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
            <div className="max-w-md mx-auto">
              <div className="divide-y divide-gray-200">
                <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                  <h2 className="text-2xl font-bold mb-8">Admin Login</h2>
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={credentials.username}
                        onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Login
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state.loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (state.error) {
    return <div className="p-4 text-red-600">Error: {state.error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200">
              <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                <h2 className="text-2xl font-bold mb-8">Feature Flags Admin</h2>
                
                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Current Service Status</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p>Active Service: <span className="font-semibold">{state.currentService}</span></p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-semibold mb-4">Service Metrics</h3>
                  <div className="space-y-4">
                    {['mcp', 'local'].map(service => (
                      <div key={service} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold uppercase mb-2">{service} Service</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p>Total Failures: {state.metrics[service].failures}</p>
                          <p>Consecutive Failures: {state.metrics[service].consecutiveFailures}</p>
                          <p>Last Failure: {state.metrics[service].lastFailure ? new Date(state.metrics[service].lastFailure).toLocaleString() : 'None'}</p>
                          <p>Last Success: {state.metrics[service].lastSuccess ? new Date(state.metrics[service].lastSuccess).toLocaleString() : 'None'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-4">Feature Flags</h3>
                  <div className="space-y-4">
                    {Object.entries(state.flags).map(([name, flag]) => (
                      <div key={name} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{flag.name}</h4>
                            <p className="text-sm text-gray-600">{flag.description}</p>
                            <p className="text-xs text-gray-500">
                              Last updated: {flag.lastUpdated ? new Date(flag.lastUpdated).toLocaleString() : 'Never'}
                              {flag.updatedBy ? ` by ${flag.updatedBy}` : ''}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={flag.enabled}
                              onChange={(e) => handleToggleFlag(name, e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 