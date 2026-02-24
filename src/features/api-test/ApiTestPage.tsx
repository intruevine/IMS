import React, { useMemo, useState } from 'react';
import { Button, Card, CardHeader } from '@/shared/components/ui';

type ResultStatus = 'idle' | 'running' | 'success' | 'error';

interface TestResult {
  name: string;
  status: ResultStatus;
  httpStatus?: number;
  durationMs?: number;
  message?: string;
  payload?: unknown;
}

interface ApiResponse<T = unknown> {
  status: number;
  data: T | null;
  text: string;
}

const envApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getDefaultServerBase(apiUrl: string) {
  const normalized = apiUrl.replace(/\/+$/, '');
  if (normalized.endsWith('/api')) return normalized.slice(0, -4);
  return normalized;
}

function statusClassName(status: ResultStatus) {
  if (status === 'success') return 'badge badge-green';
  if (status === 'error') return 'badge badge-red';
  if (status === 'running') return 'badge badge-amber';
  return 'badge badge-blue';
}

async function requestJSON(
  url: string,
  options?: RequestInit
): Promise<ApiResponse> {
  const response = await fetch(url, options);
  const text = await response.text();
  let data: unknown = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    status: response.status,
    data,
    text,
  };
}

const ApiTestPage: React.FC = () => {
  const [serverBaseUrl, setServerBaseUrl] = useState(getDefaultServerBase(envApiUrl));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [token, setToken] = useState('');
  const [isRunningAll, setIsRunningAll] = useState(false);

  const [results, setResults] = useState<Record<string, TestResult>>({
    health: { name: 'Health', status: 'idle' },
    apiRoot: { name: 'API Root', status: 'idle' },
    login: { name: 'Login', status: 'idle' },
    contracts: { name: 'Contracts (Auth)', status: 'idle' },
  });

  const trimmedBase = useMemo(() => serverBaseUrl.replace(/\/+$/, ''), [serverBaseUrl]);

  const updateResult = (key: string, patch: Partial<TestResult>) => {
    setResults((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        ...patch,
      },
    }));
  };

  const runHealthTest = async () => {
    const started = Date.now();
    updateResult('health', { status: 'running', message: undefined });
    try {
      const res = await requestJSON(`${trimmedBase}/health`);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
      updateResult('health', {
        status: 'success',
        httpStatus: res.status,
        durationMs: Date.now() - started,
        payload: res.data,
        message: 'OK',
      });
      return true;
    } catch (error) {
      updateResult('health', {
        status: 'error',
        durationMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Health test failed',
      });
      return false;
    }
  };

  const runApiRootTest = async () => {
    const started = Date.now();
    updateResult('apiRoot', { status: 'running', message: undefined });
    try {
      const res = await requestJSON(`${trimmedBase}/api`);
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
      updateResult('apiRoot', {
        status: 'success',
        httpStatus: res.status,
        durationMs: Date.now() - started,
        payload: res.data,
        message: 'OK',
      });
      return true;
    } catch (error) {
      updateResult('apiRoot', {
        status: 'error',
        durationMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'API root test failed',
      });
      return false;
    }
  };

  const runLoginTest = async () => {
    const started = Date.now();
    updateResult('login', { status: 'running', message: undefined });
    try {
      const res = await requestJSON(`${trimmedBase}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }

      const tokenValue =
        res.data && typeof res.data === 'object' && 'token' in res.data
          ? String((res.data as { token?: string }).token || '')
          : '';
      setToken(tokenValue);

      updateResult('login', {
        status: 'success',
        httpStatus: res.status,
        durationMs: Date.now() - started,
        payload: res.data,
        message: tokenValue ? 'Token issued' : 'No token in response',
      });
      return tokenValue;
    } catch (error) {
      updateResult('login', {
        status: 'error',
        durationMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Login test failed',
      });
      return '';
    }
  };

  const runContractsTest = async (providedToken?: string) => {
    const started = Date.now();
    const authToken = (providedToken || token).trim();
    updateResult('contracts', { status: 'running', message: undefined });
    try {
      if (!authToken) {
        throw new Error('Token is empty. Run Login test first.');
      }
      const res = await requestJSON(`${trimmedBase}/api/contracts`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status !== 200) {
        throw new Error(`Expected 200, got ${res.status}`);
      }
      updateResult('contracts', {
        status: 'success',
        httpStatus: res.status,
        durationMs: Date.now() - started,
        payload: res.data,
        message: 'Authorized request OK',
      });
      return true;
    } catch (error) {
      updateResult('contracts', {
        status: 'error',
        durationMs: Date.now() - started,
        message: error instanceof Error ? error.message : 'Contracts test failed',
      });
      return false;
    }
  };

  const runAll = async () => {
    setIsRunningAll(true);
    const okHealth = await runHealthTest();
    const okApiRoot = await runApiRootTest();
    const issuedToken = await runLoginTest();
    if (okHealth && okApiRoot && issuedToken) {
      await runContractsTest(issuedToken);
    }
    setIsRunningAll(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader
          title="API Integration Test"
          subtitle="Check backend connectivity, login, and protected endpoint access."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Server Base URL</label>
            <input
              className="input"
              value={serverBaseUrl}
              onChange={(e) => setServerBaseUrl(e.target.value)}
              placeholder="http://localhost:3001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Token (optional)</label>
            <input
              className="input"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Bearer token without prefix"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
            <input
              className="input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="admin"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          <Button onClick={runAll} isLoading={isRunningAll}>
            Run All
          </Button>
          <Button variant="secondary" onClick={runHealthTest}>Health</Button>
          <Button variant="secondary" onClick={runApiRootTest}>API Root</Button>
          <Button variant="secondary" onClick={runLoginTest}>Login</Button>
          <Button variant="secondary" onClick={() => runContractsTest()}>Contracts</Button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Results" subtitle="Each test shows HTTP status, duration, and payload." />
        <div className="space-y-3">
          {Object.entries(results).map(([key, result]) => (
            <div key={key} className="border border-slate-200 rounded-lg p-4 bg-slate-50/40">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-semibold text-slate-900">{result.name}</span>
                <span className={statusClassName(result.status)}>{result.status.toUpperCase()}</span>
                {typeof result.httpStatus === 'number' && (
                  <span className="badge badge-blue">HTTP {result.httpStatus}</span>
                )}
                {typeof result.durationMs === 'number' && (
                  <span className="badge badge-amber">{result.durationMs} ms</span>
                )}
              </div>

              {result.message && (
                <p className="text-sm text-slate-600 mb-2">{result.message}</p>
              )}

              {Boolean(result.payload) && (
                <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-auto">
{JSON.stringify(result.payload, null, 2)}
                </pre>
              )}

              {!Boolean(result.payload) && result.status === 'idle' && (
                <p className="text-sm text-slate-500">Not executed yet.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-500">
        Tip: default credentials are usually <code>admin/admin</code> and <code>user/user</code>.
      </p>
    </div>
  );
};

export default ApiTestPage;
