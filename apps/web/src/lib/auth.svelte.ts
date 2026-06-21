import { api, ApiError } from './api.js';
import type { LoginResult, User } from './api.js';

function createAuthStore() {
	let user = $state<User | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let pendingTotp = $state<{ token: string; user: User } | null>(null);

	async function login(username: string, password: string): Promise<LoginResult | null> {
		loading = true;
		error = null;
		pendingTotp = null;
		try {
			const result = await api.login(username, password);
			if (result.requiresTotp && result.pendingToken) {
				pendingTotp = { token: result.pendingToken, user: result.user };
				return result;
			}
			user = result.user;
			return result;
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else if (err instanceof TypeError) {
				error =
					'Cannot reach the API. Run `pnpm dev` (API on :4001, UI on :5173) or `pnpm start` (everything on :4000).';
			} else {
				error = 'Login failed';
			}
			return null;
		} finally {
			loading = false;
		}
	}

	async function verifyTotp(code: string): Promise<boolean> {
		if (!pendingTotp) {
			error = 'No pending verification';
			return false;
		}
		loading = true;
		error = null;
		try {
			user = await api.verifyTotp(pendingTotp.token, code);
			pendingTotp = null;
			return true;
		} catch (err) {
			if (err instanceof ApiError) {
				error = err.message;
			} else {
				error = 'Verification failed';
			}
			return false;
		} finally {
			loading = false;
		}
	}

	function cancelTotp(): void {
		pendingTotp = null;
		error = null;
	}

	async function loginWithPasskey(username?: string): Promise<User | null> {
		loading = true;
		error = null;
		try {
			const { loginWithPasskey: doLogin } = await import('./passkeys.js');
			user = await doLogin(username);
			return user;
		} catch (err) {
			const { passkeyErrorMessage } = await import('./passkeys.js');
			error = passkeyErrorMessage(err);
			return null;
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
			pendingTotp = null;
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

	function updateUser(next: User): void {
		user = next;
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
		get pendingTotp() {
			return pendingTotp;
		},
		get mustChangePassword() {
			return user?.mustChangePassword === true;
		},
		login,
		loginWithPasskey,
		verifyTotp,
		cancelTotp,
		logout,
		checkAuth,
		updateUser
	};
}

export const auth = createAuthStore();
