import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

const BASE_URL = env.PUBLIC_API_URL ?? 'http://localhost:4000';

export interface SseEvent {
	type: string;
	data: unknown;
	timestamp: string;
}

function createSseStore() {
	let latestEvent = $state<SseEvent | null>(null);
	let connected = $state(false);
	let es: EventSource | null = null;

	function connect() {
		if (!browser || es) return;

		es = new EventSource(`${BASE_URL}/api/v1/events`, { withCredentials: true });

		es.onopen = () => {
			connected = true;
		};

		es.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data as string) as SseEvent;
				latestEvent = parsed;
			} catch {
				latestEvent = {
					type: 'raw',
					data: event.data,
					timestamp: new Date().toISOString()
				};
			}
		};

		es.onerror = () => {
			connected = false;
			es?.close();
			es = null;
			// Reconnect after 5 seconds
			setTimeout(() => connect(), 5000);
		};
	}

	function disconnect() {
		es?.close();
		es = null;
		connected = false;
	}

	return {
		get latestEvent() {
			return latestEvent;
		},
		get connected() {
			return connected;
		},
		connect,
		disconnect
	};
}

export const sse = createSseStore();
