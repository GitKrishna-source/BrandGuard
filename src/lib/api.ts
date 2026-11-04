import type { ApiAuditResponse, BrandPolicyResponse } from '../types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `BrandGuard API request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
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

export function createTextAudit(policyId: string, content: string): Promise<ApiAuditResponse> {
  return request<ApiAuditResponse>('/api/audits', {
    method: 'POST',
    body: JSON.stringify({ policy_id: policyId, content_type: 'text', content }),
  });
}
