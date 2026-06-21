import { api, ApiError } from './api.js';
import type { User } from './api.js';

function createAuthStore() {
	let user = $state<User | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function login(username: string, password: string): Promise<boolean> {
		loading = true;
		error = null;
		try {
			user = await api.login(username, password);
			return true;
		} catch (err) {
			error = err instanceof ApiError ? err.message : 'Login failed';
			return false;
		} finally {
			loading = false;
		}
	}

	async function logout(): Promise<void> {
		loading = true;
		try {
			await api.logout();
		} catch {
			// ignore logout errors
		} finally {
			user = null;
			loading = false;
		}
	}

	async function checkAuth(): Promise<boolean> {
		loading = true;
		error = null;
		try {
			user = await api.getMe();
			return true;
		} catch {
			user = null;
			return false;
		} finally {
			loading = false;
		}
	}

	return {
		get user() {
			return user;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},
		login,
		logout,
		checkAuth
	};
}

export const auth = createAuthStore();
