import { browser } from '$app/environment';
import { getApiBaseUrl } from './api-base.js';

const SSE_EVENT_TYPES = [
	'backend-health',
	'usage-event',
	'key-event',
	'log',
	'system'
] as const;

export interface SseEvent {
	type: string;
	data: unknown;
	timestamp: number | string;
}

function createSseStore() {
	let latestEvent = $state<SseEvent | null>(null);
	let connected = $state(false);
	let es: EventSource | null = null;

	function handleEvent(event: MessageEvent) {
		try {
			latestEvent = JSON.parse(event.data as string) as SseEvent;
		} catch {
			latestEvent = {
				type: 'raw',
				data: event.data,
				timestamp: Date.now()
			};
		}
	}

	function connect() {
		if (!browser || es) return;

		es = new EventSource(`${getApiBaseUrl()}/api/v1/events`);

		es.onopen = () => {
			connected = true;
		};

		for (const type of SSE_EVENT_TYPES) {
			es.addEventListener(type, handleEvent);
		}

		es.onerror = () => {
			connected = false;
			es?.close();
			es = null;
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
