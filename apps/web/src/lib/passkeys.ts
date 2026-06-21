import {
	startRegistration,
	startAuthentication,
	browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { api, ApiError } from './api.js';
import type { User } from './api.js';

export function isPasskeySupported(): boolean {
	return browserSupportsWebAuthn();
}

export async function registerPasskey(name: string): Promise<void> {
	const { options, challengeId } = await api.webauthnRegisterOptions(name);
	const response = await startRegistration({ optionsJSON: options });
	await api.webauthnRegisterVerify(challengeId, response, name);
}

export async function loginWithPasskey(username?: string): Promise<User> {
	const { options, challengeId } = await api.webauthnLoginOptions(username);
	const response = await startAuthentication({ optionsJSON: options });
	const result = await api.webauthnLoginVerify(challengeId, response, username);
	return result.user;
}

export async function passkeysAvailableForUsername(username: string): Promise<boolean> {
	try {
		const result = await api.webauthnAvailable(username);
		return result.available;
	} catch {
		return false;
	}
}

export function passkeyErrorMessage(err: unknown): string {
	if (err instanceof ApiError) return err.message;
	if (err instanceof Error) {
		if (err.name === 'NotAllowedError') {
			return 'Passkey sign-in was cancelled or timed out.';
		}
		return err.message;
	}
	return 'Passkey operation failed';
}

export { ApiError };
