import type { ApiAuditReport, ApiAuditResponse, AuthUser, BrandPolicyResponse, ExtractedPage, GovernanceInsightsResponse, GuidelineDocumentResponse, GuidelineExtractionPreview, GuidelineExtractionProgressEvent, LoginResponse, RemediateResponse, ReviewResponse, ReviewedPageInput, Role } from '../types';

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
    const raw = await response.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown };
      if (typeof parsed?.detail === 'string') detail = parsed.detail;
    } catch {
      // Plain text error body
    }
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

export async function demoLogin(role: Role, signal?: AbortSignal): Promise<LoginResponse> {
  const response = await request<LoginResponse>('/api/auth/demo', {
    method: 'POST',
    body: JSON.stringify({ role }),
    signal,
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

export function loadBootwearDemo(signal?: AbortSignal): Promise<GuidelineDocumentResponse> {
  return request('/api/demo/bootwear', { method: 'POST', signal });
}

export function listGuidelines(): Promise<GuidelineDocumentResponse[]> {
  return request('/api/guidelines');
}

export async function extractGuidelineDocument(
  file: File,
  onProgress?: (event: GuidelineExtractionProgressEvent) => void,
): Promise<GuidelineExtractionPreview> {
  onProgress?.({ stage: 'uploading', progress: 5, message: `Uploading ${file.name}…` });
  const form = new FormData();
  form.append('file', file);
  const headers = new Headers();
  const token = window.localStorage.getItem(TOKEN_KEY);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}/api/guidelines/extract?stream=true`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!response.ok) {
    const raw = await response.text();
    let detail = raw;
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown };
      if (typeof parsed?.detail === 'string') detail = parsed.detail;
    } catch {
      // keep raw text
    }
    throw new Error(detail || `Unable to extract document (${response.status})`);
  }

  if (!response.body) {
    const fallback = (await response.json()) as GuidelineExtractionPreview;
    onProgress?.({ stage: 'completed', progress: 100, message: 'Extraction completed.', result: fallback });
    return fallback;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completedPreview: GuidelineExtractionPreview | null = null;

  const processLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed) as GuidelineExtractionProgressEvent;
    onProgress?.(event);
    if (event.stage === 'failed') {
      throw new Error(event.message || 'Document extraction failed.');
    }
    if (event.stage === 'completed' && event.result) {
      completedPreview = event.result;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf('\n');
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      processLine(line);
      newlineIndex = buffer.indexOf('\n');
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) processLine(buffer);

  if (!completedPreview) {
    throw new Error('Extraction did not return page preview data.');
  }
  return completedPreview;
}

export async function retryGuidelinePageOcr(
  file: File,
  page: number,
  enhanced = true,
): Promise<ExtractedPage> {
  const form = new FormData();
  form.append('file', file);
  form.append('page', String(page));
  form.append('enhanced', enhanced ? 'true' : 'false');
  const response = await request<{ page_data: ExtractedPage }>('/api/guidelines/extract-page', {
    method: 'POST',
    body: form,
  });
  return response.page_data;
}

export function importGuidelineDocument(
  brandName: string,
  file: File,
  reviewedPages?: ReviewedPageInput[],
): Promise<GuidelineDocumentResponse> {
  const form = new FormData();
  form.append('brand_name', brandName);
  form.append('file', file);
  if (reviewedPages && reviewedPages.length > 0) {
    form.append('reviewed_pages_json', JSON.stringify(reviewedPages));
  }
  return request('/api/guidelines/import', { method: 'POST', body: form });
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

export function remediateContent(content: string, policyId?: string): Promise<RemediateResponse> {
  return request<RemediateResponse>('/api/audits/remediate', {
    method: 'POST',
    body: JSON.stringify({ content, policy_id: policyId }),
  });
}

