import type { ApiAuditReport, ApiAuditResponse, AuthUser, BrandPolicyResponse, GovernanceInsightsResponse, GuidelineDocumentResponse, LoginResponse, ReviewResponse, Role } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const TOKEN_KEY = 'brandguard_access_token';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `BrandGuard API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function getAccessToken(): string | null {
  return window.localStorage.getItem(TOKEN_KEY);
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  window.localStorage.setItem(TOKEN_KEY, response.access_token);
  return response;
}

export function logout(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function demoLogin(role: Role): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/auth/demo', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  window.localStorage.setItem(TOKEN_KEY, response.access_token);
  return response;
}

export function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/api/auth/me');
}

export function listPolicies(): Promise<BrandPolicyResponse[]> {
  return request<BrandPolicyResponse[]>('/api/policies');
}

export function createPolicy(policy: Omit<BrandPolicyResponse, 'id' | 'created_at'>): Promise<BrandPolicyResponse> {
  return request<BrandPolicyResponse>('/api/policies', {
    method: 'POST',
    body: JSON.stringify(policy),
  });
}

export function updatePolicy(policyId: string, policy: Partial<Omit<BrandPolicyResponse, 'id' | 'created_at'>>): Promise<BrandPolicyResponse> {
  return request<BrandPolicyResponse>(`/api/policies/${policyId}`, {
    method: 'PATCH',
    body: JSON.stringify(policy),
  });
}

export function createTextAudit(content: string, policyId?: string): Promise<ApiAuditResponse> {
  return request<ApiAuditResponse>('/api/audits', {
    method: 'POST',
    body: JSON.stringify({ content_type: 'text', content, policy_id: policyId }),
  });
}

export function createRevision(auditId: string, content: string): Promise<ApiAuditResponse> {
  return request<ApiAuditResponse>(`/api/audits/${auditId}/revisions`, {
    method: 'POST',
    body: JSON.stringify({ content, summary: 'Creator revised content after explainable findings' }),
  });
}

export function getGovernanceInsights(): Promise<GovernanceInsightsResponse> {
  return request<GovernanceInsightsResponse>('/api/insights');
}

export function listAudits(): Promise<ApiAuditResponse[]> {
  return request('/api/audits');
}

export function listReviews(id: string): Promise<ReviewResponse[]> {
  return request(`/api/audits/${id}/reviews`);
}

export function getAuditReport(id: string): Promise<ApiAuditReport> {
  return request(`/api/audits/${id}/report`);
}

export async function downloadAuditPdf(id: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}/api/audits/${id}/report.pdf`, { headers });
  if (!response.ok) throw new Error('Unable to download the report. Please try again.');
  return response.blob();
}

export function uploadAudit(file: File, policyId?: string): Promise<ApiAuditResponse> {
  const form = new FormData();
  form.append('file', file);
  if (policyId) form.append('policy_id', policyId);
  return request<ApiAuditResponse>('/api/audits/upload', { method: 'POST', body: form, headers: {} });
}

export function loadBootwearDemo(): Promise<GuidelineDocumentResponse> {
  return request('/api/demo/bootwear', { method: 'POST' });
}

export function importGuidelinePdf(brandName: string, file: File): Promise<GuidelineDocumentResponse> {
  const form = new FormData();
  form.append('brand_name', brandName);
  form.append('file', file);
  return request('/api/guidelines/import', { method: 'POST', body: form });
}

export async function downloadGuidelinePdf(documentId?: string): Promise<Blob> {
  const headers = new Headers();
  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const path = documentId ? `/api/guidelines/${documentId}/pdf` : '/api/demo/bootwear/guidelines.pdf';
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) throw new Error('Unable to download guidelines. Sign in and try again.');
  return response.blob();
}

export function createReview(
  auditId: string,
  reviewerRole: Role,
  status: ReviewResponse['status'],
  comment?: string,
): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/api/audits/${auditId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ reviewer_role: reviewerRole, status, comment }),
  });
}
