import { env } from '$env/dynamic/public';
import { browser, dev } from '$app/environment';

/**
 * Base URL for OpenAI-compatible inference endpoints (/v1/...).
 * - Set PUBLIC_PROXY_URL when the inference API is on a different host than the UI.
 * - Falls back to PUBLIC_API_URL, then sensible defaults for dev vs production.
 */
export function getProxyBaseUrl(): string {
	const configured = env.PUBLIC_PROXY_URL ?? env.PUBLIC_API_URL;
	if (configured) return configured.replace(/\/$/, '');
	if (browser) {
		if (dev) return 'http://localhost:4001';
		return window.location.origin;
	}
	if (dev) return 'http://localhost:4001';
	return 'http://localhost:4000';
}
