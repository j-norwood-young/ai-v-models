import { env } from '$env/dynamic/public';
import { browser, dev } from '$app/environment';

/**
 * API base URL for management requests.
 * - Set PUBLIC_API_URL when UI and API run on different hosts/ports.
 * - Leave unset in dev: browser uses same origin; Vite proxies /api → :4001.
 */
export function getApiBaseUrl(): string {
	if (env.PUBLIC_API_URL) return env.PUBLIC_API_URL;
	if (browser) return '';
	if (dev) return 'http://localhost:4001';
	return 'http://localhost:4000';
}
