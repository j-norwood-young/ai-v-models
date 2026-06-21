import { env } from '$env/dynamic/public';

const BASE_URL = env.PUBLIC_API_URL ?? 'http://localhost:4000';

export interface Backend {
	id: string;
	name: string;
	provider: string;
	host: string;
	url: string;
	api_key?: string;
	health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
	latency_ms?: number;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface VModel {
	id: string;
	model_id: string;
	display_name: string;
	strategy: 'round_robin' | 'least_latency' | 'random' | 'failover';
	streaming: boolean;
	enabled: boolean;
	backends: VModelBackend[];
	created_at: string;
}

export interface VModelBackend {
	backend_id: string;
	backend_name?: string;
	weight?: number;
	priority?: number;
}

export interface ApiKey {
	id: string;
	key_prefix: string;
	name: string;
	enabled: boolean;
	suspended: boolean;
	suspended_reason?: string;
	rpm_limit?: number;
	day_budget?: number;
	allowed_models?: string[];
	expires_at?: string;
	last_used_at?: string;
	created_at: string;
}

export interface KeyLog {
	id: string;
	key_id: string;
	endpoint: string;
	status_code: number;
	tokens_in?: number;
	tokens_out?: number;
	duration_ms?: number;
	tps?: number;
	error?: string;
	created_at: string;
}

export interface KeyBudget {
	key_id: string;
	day_budget?: number;
	day_used: number;
	rpm_limit?: number;
	rpm_current: number;
}

export interface Hook {
	id: string;
	name: string;
	type: 'webhook' | 'internal';
	trigger: string;
	enabled: boolean;
	url?: string;
	module?: string;
	created_at: string;
}

export interface MetricsSummary {
	total_requests_24h: number;
	total_tokens_24h: number;
	error_rate_24h: number;
	avg_ttft_ms?: number;
	avg_tps?: number;
	backends: BackendHealth[];
}

export interface BackendHealth {
	id: string;
	name: string;
	health: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
	latency_ms?: number;
}

export interface MetricsRollup {
	timestamp: string;
	requests: number;
	tokens: number;
	errors: number;
	avg_latency_ms?: number;
}

export interface MetricsEvent {
	id: string;
	key_prefix: string;
	vmodel: string;
	endpoint: string;
	status_code: number;
	tokens?: number;
	duration_ms?: number;
	tps?: number;
	error?: string;
	created_at: string;
}

export interface User {
	id: string;
	username: string;
	role: string;
}

class ApiError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
		this.name = 'ApiError';
	}
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await fetch(`${BASE_URL}/api/v1${path}`, {
		...init,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
	if (!res.ok) {
		let msg = `HTTP ${res.status}`;
		try {
			const body = (await res.json()) as { error?: string; message?: string };
			msg = body.error ?? body.message ?? msg;
		} catch {
			// ignore parse errors
		}
		throw new ApiError(res.status, msg);
	}
	if (res.status === 204) return undefined as T;
	return res.json() as Promise<T>;
}

export const api = {
	// Backends
	getBackends: () => request<Backend[]>('/backends'),
	addBackend: (data: Partial<Backend>) =>
		request<Backend>('/backends', { method: 'POST', body: JSON.stringify(data) }),
	updateBackend: (id: string, data: Partial<Backend>) =>
		request<Backend>(`/backends/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
	deleteBackend: (id: string) => request<void>(`/backends/${id}`, { method: 'DELETE' }),
	testBackend: (id: string) =>
		request<{ success: boolean; latency_ms?: number; error?: string }>(`/backends/${id}/test`, {
			method: 'POST'
		}),

	// Virtual Models
	getVModels: () => request<VModel[]>('/vmodels'),
	createVModel: (data: Partial<VModel>) =>
		request<VModel>('/vmodels', { method: 'POST', body: JSON.stringify(data) }),
	updateVModel: (id: string, data: Partial<VModel>) =>
		request<VModel>(`/vmodels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
	deleteVModel: (id: string) => request<void>(`/vmodels/${id}`, { method: 'DELETE' }),
	addVModelBackend: (vmodelId: string, data: VModelBackend) =>
		request<VModel>(`/vmodels/${vmodelId}/backends`, { method: 'POST', body: JSON.stringify(data) }),
	removeVModelBackend: (vmodelId: string, backendId: string) =>
		request<void>(`/vmodels/${vmodelId}/backends/${backendId}`, { method: 'DELETE' }),

	// Keys
	getKeys: () => request<ApiKey[]>('/keys'),
	createKey: (data: Partial<ApiKey>) =>
		request<ApiKey & { key: string }>('/keys', { method: 'POST', body: JSON.stringify(data) }),
	suspendKey: (id: string, reason: string) =>
		request<ApiKey>(`/keys/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) }),
	resumeKey: (id: string) => request<ApiKey>(`/keys/${id}/resume`, { method: 'POST' }),
	deleteKey: (id: string) => request<void>(`/keys/${id}`, { method: 'DELETE' }),
	getKeyLogs: (id: string, limit = 100) =>
		request<KeyLog[]>(`/keys/${id}/logs?limit=${limit}`),
	getKeyBudget: (id: string) => request<KeyBudget>(`/keys/${id}/budget`),

	// Hooks
	getHooks: () => request<Hook[]>('/hooks'),
	createHook: (data: Partial<Hook>) =>
		request<Hook>('/hooks', { method: 'POST', body: JSON.stringify(data) }),
	deleteHook: (id: string) => request<void>(`/hooks/${id}`, { method: 'DELETE' }),
	testHook: (id: string) =>
		request<{ success: boolean; error?: string }>(`/hooks/${id}/test`, { method: 'POST' }),

	// Metrics
	getMetricsSummary: () => request<MetricsSummary>('/metrics/summary'),
	getMetricsRollups: (params: { period?: string; limit?: number }) => {
		const qs = new URLSearchParams(
			Object.entries(params)
				.filter(([, v]) => v !== undefined)
				.map(([k, v]) => [k, String(v)])
		).toString();
		return request<MetricsRollup[]>(`/metrics/rollups${qs ? `?${qs}` : ''}`);
	},
	getMetricsEvents: (params: { limit?: number; before?: string }) => {
		const qs = new URLSearchParams(
			Object.entries(params)
				.filter(([, v]) => v !== undefined)
				.map(([k, v]) => [k, String(v)])
		).toString();
		return request<MetricsEvent[]>(`/metrics/events${qs ? `?${qs}` : ''}`);
	},

	// Auth
	login: (username: string, password: string) =>
		request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
	logout: () => request<void>('/auth/logout', { method: 'POST' }),
	getMe: () => request<User>('/auth/me')
};

export { ApiError };
