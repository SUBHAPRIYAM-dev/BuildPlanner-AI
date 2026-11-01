import { ApiResponse } from '@buildplanner/shared';

const envUrl = ((import.meta as any).env?.VITE_API_URL as string || '');
const rawBase = envUrl.trim().replace(/\/$/, '');
const API_BASE = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`) : '/api';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('bp_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // In dev mode provide dev fallback header with valid 24-hex ObjectId
    headers['x-dev-user-id'] = '000000000000000000000001';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const json: ApiResponse<T> = await res.json();

  if (!res.ok || !json.success) {
    const errorMsg = json.error?.message || `HTTP ${res.status}: Failed to execute request`;
    throw new Error(errorMsg);
  }

  return json.data as T;
}
