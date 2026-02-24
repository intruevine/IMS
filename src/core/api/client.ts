// API ?대씪?댁뼵??- 諛깆뿏???쒕쾭 ?곕룞
const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3001/api' : '/api')
).replace(/\/+$/, '');
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
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new APIError(error.error || `HTTP ${response.status}`, response.status);
  }

  return response.json();
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
};

// ?먯궛 API
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

// ?ъ슜??API
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

  approve: (username: string, role: 'admin' | 'user' = 'user') =>
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

// ?대깽??API
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

// 硫ㅻ쾭 API
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

export { APIError };
export default {
  contracts: contractsAPI,
  assets: assetsAPI,
  users: usersAPI,
  events: eventsAPI,
  members: membersAPI,
};


