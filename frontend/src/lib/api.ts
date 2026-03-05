import { supabase } from './supabase'

const API_BASE = '/api'

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}${path}`, { ...init, headers: { ...headers, ...init?.headers } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(body.detail ?? res.statusText)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json()
}

export interface Scan {
  id: string
  user_id: string
  domain: string
  scan_type: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  options: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
}

export interface ScanResult {
  id: string
  scan_id: string
  record_type: string
  name: string
  address: string
  target: string | null
  port: number | null
  raw_data: Record<string, unknown>
  created_at: string
}

export interface ScanDetail {
  scan: Scan
  results: ScanResult[]
}

export interface Stats {
  total_scans: number
  completed_scans: number
  total_records_found: number
  domains_scanned: number
}

export interface ApiKey {
  id: string
  name: string
  created_at: string
  last_used_at: string | null
}

export interface ApiKeyCreated extends ApiKey {
  key: string
}

export interface UserProfile {
  id: string
  email: string
  role: 'admin' | 'approved' | 'guest'
  display_name: string | null
  created_at: string
}

export const api = {
  createScan: (data: { domain: string; scan_type: string; options?: Record<string, unknown> }) =>
    request<Scan>('/scans', { method: 'POST', body: JSON.stringify(data) }),

  listScans: (page = 1, perPage = 20) =>
    request<{ scans: Scan[]; total: number }>(`/scans?page=${page}&per_page=${perPage}`),

  getScan: (id: string) => request<ScanDetail>(`/scans/${id}`),

  deleteScan: (id: string) => request<void>(`/scans/${id}`, { method: 'DELETE' }),

  getStats: () => request<Stats>('/stats'),

  createApiKey: (name: string) =>
    request<ApiKeyCreated>('/api-keys', { method: 'POST', body: JSON.stringify({ name }) }),

  listApiKeys: () => request<ApiKey[]>('/api-keys'),

  deleteApiKey: (id: string) => request<void>(`/api-keys/${id}`, { method: 'DELETE' }),

  // Admin endpoints
  listUsers: () => request<UserProfile[]>('/admin/users'),

  updateUserRole: (userId: string, role: string) =>
    request<UserProfile>(`/admin/users/${userId}`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  deleteUser: (userId: string) => request<void>(`/admin/users/${userId}`, { method: 'DELETE' }),
}
