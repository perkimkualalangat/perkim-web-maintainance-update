import { useState, useCallback } from 'react';

const DEV_API_TOKEN = import.meta.env.VITE_DEV_API_TOKEN || '';

async function devFetch(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Dev-Token': DEV_API_TOKEN,
    ...options.headers,
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    throw new Error(data?.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function useDevApi() {
  const [envConfig, setEnvConfig] = useState({});
  const [aiStatus, setAiStatus] = useState(null);
  const [aiChecks, setAiChecks] = useState([]);
  const [runningChecks, setRunningChecks] = useState(false);
  const [apiTest, setApiTest] = useState({
    endpoint: '/api/ai/status',
    method: 'GET',
    body: '',
    response: null,
    loading: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadEnvConfig = useCallback(async () => {
    try {
      const cfg = await devFetch('/api/dev/env');
      setEnvConfig(cfg);
    } catch (e) {
      console.error('Env config failed:', e);
    }
  }, []);

  const loadAiStatus = useCallback(async () => {
    try {
      const status = await devFetch('/api/ai/status');
      setAiStatus(status);
    } catch (e) {
      console.error('AI status failed:', e);
    }
  }, []);

  const runChecks = useCallback(async () => {
    setRunningChecks(true);
    setError(null);
    try {
      const result = await devFetch('/api/ai/check', { method: 'POST', body: '{}' });
      setAiChecks(result.results || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunningChecks(false);
    }
  }, []);

  const testApi = useCallback(async (endpoint, method, body) => {
    setApiTest(prev => ({ ...prev, loading: true, response: null }));
    try {
      const options = { method };
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        options.body = body;
      }
      const response = await fetch(endpoint, options);
      const text = await response.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      setApiTest(prev => ({ ...prev, loading: false, response: { status: response.status, ok: response.ok, data } }));
    } catch (e) {
      setApiTest(prev => ({ ...prev, loading: false, response: { error: e.message } }));
    }
  }, []);

  const runCommand = useCallback(async (cmd, cwd) => {
    return devFetch('/api/dev/exec', {
      method: 'POST',
      body: JSON.stringify({ cmd, cwd }),
    });
  }, []);

  return {
    // State
    envConfig,
    aiStatus,
    aiChecks,
    runningChecks,
    apiTest,
    loading,
    error,
    // Actions
    loadEnvConfig,
    loadAiStatus,
    runChecks,
    testApi,
    runCommand,
    setApiTest,
    setError,
  };
}