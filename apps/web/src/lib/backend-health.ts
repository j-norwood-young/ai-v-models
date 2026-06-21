export type BackendHealthLevel = 'green' | 'orange' | 'red' | 'gray';

export interface BackendHealthEntry {
	name: string;
	health: string;
	label: string;
}

export interface BackendHealthSnapshot {
	level: BackendHealthLevel;
	summary: string;
	backends: BackendHealthEntry[];
}

export interface BackendHealthInput {
	name: string;
	health: string;
	enabled?: boolean;
}

function isHealthy(health: string): boolean {
	return health === 'healthy';
}

function formatHealthLabel(health: string): string {
	return health.charAt(0).toUpperCase() + health.slice(1);
}

export function healthBadgeClass(health: string): string {
	switch (health) {
		case 'healthy':
			return 'badge badge-green';
		case 'degraded':
			return 'badge badge-yellow';
		case 'unhealthy':
			return 'badge badge-red';
		default:
			return 'badge badge-gray';
	}
}

export function computeBackendHealth(backends: BackendHealthInput[]): BackendHealthSnapshot {
	const enabled = backends.filter((backend) => backend.enabled !== false);

	if (enabled.length === 0) {
		return {
			level: 'gray',
			summary: 'No backends configured',
			backends: []
		};
	}

	const entries: BackendHealthEntry[] = enabled.map((backend) => ({
		name: backend.name,
		health: backend.health,
		label: formatHealthLabel(backend.health)
	}));

	const healthyCount = enabled.filter((backend) => isHealthy(backend.health)).length;

	if (healthyCount === enabled.length) {
		return {
			level: 'green',
			summary: 'All backends healthy',
			backends: entries
		};
	}

	if (healthyCount === 0) {
		return {
			level: 'red',
			summary: 'All backends down',
			backends: entries
		};
	}

	return {
		level: 'orange',
		summary: 'Some backends down',
		backends: entries
	};
}
