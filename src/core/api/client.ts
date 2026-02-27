// API 기본 URL 설정
const configuredApiBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const fallbackApiBase = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';
const canonicalProdApiBase = import.meta.env.PROD ? 'https://api.intruevine.dscloud.biz/api' : null;
const appBase = (import.meta.env.BASE_URL as string | undefined) || '/';
const appScopedApiBase =
  appBase && appBase !== '/' ? `${appBase.replace(/\/+$/, '')}/api` : null;

const baseCandidatesSeed = import.meta.env.DEV
  ? [configuredApiBase || fallbackApiBase, '/api', appScopedApiBase]
  : [configuredApiBase, canonicalProdApiBase];

const API_BASE_URL_CANDIDATES = Array.from(
  new Set(
    baseCandidatesSeed
      .filter(Boolean)
      .map((url) => String(url).replace(/\/+$/, ''))
  )
);
const AUTH_TOKEN_KEY = 'ims-auth-token';

class APIError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'APIError';
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function hasAuthToken(): boolean {
  return Boolean(getAuthToken());
}

export function setAuthToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const isFormData = typeof FormData !== 'undefined' && options?.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options?.headers as Record<string, string> | undefined)
  };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

  let lastError: unknown = null;

  for (let i = 0; i < API_BASE_URL_CANDIDATES.length; i += 1) {
    const apiBase = API_BASE_URL_CANDIDATES[i];
    const url = `${apiBase}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });
      const responseText = await response.text().catch(() => '');

      if (!response.ok) {
        let parsedError: any = null;
        try {
          parsedError = responseText ? JSON.parse(responseText) : null;
        } catch {
          parsedError = null;
        }

        const messageFromJson = parsedError?.error || parsedError?.message || parsedError?.detail;
        const messageFromText = responseText ? responseText.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
        const errorMessage = messageFromJson || messageFromText || `HTTP ${response.status} ${response.statusText || ''}`.trim();
        const apiError = new APIError(errorMessage, response.status);

        // Try another base URL only when endpoint is not found.
        const looksLikeBaseUrlMismatch = /public base url/i.test(responseText);
        if ((response.status === 404 || looksLikeBaseUrlMismatch) && i < API_BASE_URL_CANDIDATES.length - 1) {
          lastError = apiError;
          continue;
        }
        throw apiError;
      }

      if (!responseText) {
        return {} as T;
      }

      try {
        return JSON.parse(responseText) as T;
      } catch (jsonError) {
        const isHtmlResponse = /^\s*</.test(responseText);
        if (i < API_BASE_URL_CANDIDATES.length - 1) {
          lastError = jsonError;
          continue;
        }
        if (isHtmlResponse) {
          throw new APIError(`API returned HTML instead of JSON (${url})`, 502);
        }
        throw jsonError;
      }
    } catch (error) {
      lastError = error;
      // Network-level failure can happen if /api and /MA/api mapping differs by deployment.
      const isNetworkFailure = error instanceof TypeError;
      if (isNetworkFailure && i < API_BASE_URL_CANDIDATES.length - 1) {
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new APIError('API request failed', 500);
}

// 怨꾩빟 API
export const contractsAPI = {
  getAll: (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.set('search', params.search);
    if (params?.status) queryParams.set('status', params.status);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return fetchAPI<{ contracts: any[]; total: number; page: number; limit: number }>(`/contracts${query ? `?${query}` : ''}`);
  },
  
  getById: (id: number) => fetchAPI<any>(`/contracts/${id}`),
  
  create: (data: any) => fetchAPI<{ id: number; message: string }>('/contracts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: any) => fetchAPI<{ message: string }>(`/contracts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => fetchAPI<{ message: string }>(`/contracts/${id}`, {
    method: 'DELETE',
  }),

  uploadFiles: (id: number, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return fetchAPI<{ files: any[]; message: string }>(`/contracts/${id}/files`, {
      method: 'POST',
      body: formData
    });
  },

  getFiles: (id: number) => fetchAPI<any[]>(`/contracts/${id}/files`),

  deleteFile: (id: number, fileId: number) =>
    fetchAPI<{ message: string }>(`/contracts/${id}/files/${fileId}`, {
      method: 'DELETE'
    }),

  downloadFile: async (id: number, fileId: number, fileName: string) => {
    const token = getAuthToken();
    let lastError: unknown = null;

    for (let i = 0; i < API_BASE_URL_CANDIDATES.length; i += 1) {
      const apiBase = API_BASE_URL_CANDIDATES[i];
      const url = `${apiBase}/contracts/${id}/files/${fileId}/download`;

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const errorMessage = text || `HTTP ${response.status}`;
          const error = new APIError(errorMessage, response.status);
          if (response.status === 404 && i < API_BASE_URL_CANDIDATES.length - 1) {
            lastError = error;
            continue;
          }
          throw error;
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(downloadUrl);
        return;
      } catch (error) {
        lastError = error;
        if (error instanceof TypeError && i < API_BASE_URL_CANDIDATES.length - 1) {
          continue;
        }
        throw error;
      }
    }

    throw lastError instanceof Error ? lastError : new APIError('Download failed', 500);
  }
};

// 자산 API
export const assetsAPI = {
  getAll: (params?: { category?: string; search?: string; cycle?: string; page?: number; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set('category', params.category);
    if (params?.search) queryParams.set('search', params.search);
    if (params?.cycle) queryParams.set('cycle', params.cycle);
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    
    const query = queryParams.toString();
    return fetchAPI<{ assets: any[]; total: number; page: number; limit: number }>(`/assets${query ? `?${query}` : ''}`);
  },
  
  getByContract: (contractId: number) => fetchAPI<any[]>(`/assets/contract/${contractId}`),
  
  getById: (id: number) => fetchAPI<any>(`/assets/${id}`),
  
  create: (data: any) => fetchAPI<{ id: number; message: string }>('/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: any) => fetchAPI<{ message: string }>(`/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => fetchAPI<{ message: string }>(`/assets/${id}`, {
    method: 'DELETE',
  }),
};

// 사용자 API
export const usersAPI = {
  login: (username: string, password: string) => fetchAPI<{ user: any; token: string; message: string }>('/users/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  }),

  register: (data: { username: string; display_name: string; password: string }) =>
    fetchAPI<{ message: string }>('/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  getAll: () => fetchAPI<any[]>('/users'),

  getPending: () => fetchAPI<any[]>('/users/pending'),
  
  create: (data: any) => fetchAPI<{ message: string }>('/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  approve: (username: string, role: 'admin' | 'manager' | 'user' = 'user') =>
    fetchAPI<{ message: string }>(`/users/${username}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  reject: (username: string) =>
    fetchAPI<{ message: string }>(`/users/${username}/reject`, {
      method: 'PUT',
    }),
  
  update: (username: string, data: any) => fetchAPI<{ message: string }>(`/users/${username}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  updatePassword: (username: string, currentPassword: string, newPassword: string) => fetchAPI<{ message: string }>(`/users/${username}/password`, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  }),
  
  delete: (username: string) => fetchAPI<{ message: string }>(`/users/${username}`, {
    method: 'DELETE',
  }),
};

// 이벤트 API
export const eventsAPI = {
  getAll: (params?: { start?: string; end?: string; type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.start) queryParams.set('start', params.start);
    if (params?.end) queryParams.set('end', params.end);
    if (params?.type) queryParams.set('type', params.type);
    
    const query = queryParams.toString();
    return fetchAPI<any[]>(`/events${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string) => fetchAPI<any>(`/events/${id}`),
  
  create: (data: any) => fetchAPI<{ id: string; message: string }>('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: string, data: any) => fetchAPI<{ message: string }>(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: string) => fetchAPI<{ message: string }>(`/events/${id}`, {
    method: 'DELETE',
  }),
  
  generateContractEndEvents: () => fetchAPI<{ message: string }>('/events/generate/contract-end', {
    method: 'POST',
  }),
  
  generateInspectionEvents: (months?: number) => fetchAPI<{ message: string }>('/events/generate/inspections', {
    method: 'POST',
    body: JSON.stringify({ months }),
  }),
};

// 프로젝트 멤버 API
export const membersAPI = {
  getAll: (params?: { contract_id?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.contract_id) queryParams.set('contract_id', params.contract_id.toString());
    if (params?.status) queryParams.set('status', params.status);
    
    const query = queryParams.toString();
    return fetchAPI<any[]>(`/members${query ? `?${query}` : ''}`);
  },
  
  getById: (id: number) => fetchAPI<any>(`/members/${id}`),
  
  create: (data: any) => fetchAPI<{ id: number; message: string }>('/members', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  update: (id: number, data: any) => fetchAPI<{ message: string }>(`/members/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  
  delete: (id: number) => fetchAPI<{ message: string }>(`/members/${id}`, {
    method: 'DELETE',
  }),
};

export const holidaysAPI = {
  getAll: () => fetchAPI<any[]>('/holidays'),

  create: (data: { date: string; name: string; type: 'national' | 'company' }) =>
    fetchAPI<{ id: number; message: string }>('/holidays', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: { date: string; name: string; type: 'national' | 'company' }) =>
    fetchAPI<{ message: string }>(`/holidays/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/holidays/${id}`, {
      method: 'DELETE'
    })
};

export { APIError };
export default {
  contracts: contractsAPI,
  assets: assetsAPI,
  users: usersAPI,
  events: eventsAPI,
  members: membersAPI,
  holidays: holidaysAPI
};


