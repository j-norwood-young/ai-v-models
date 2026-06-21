<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth.svelte.js';
	import { isPasskeySupported, passkeysAvailableForUsername } from '$lib/passkeys.js';

	let username = $state('');
	let password = $state('');
	let totpCode = $state('');
	let submitting = $state(false);
	let passkeySupported = $state(false);
	let passkeysAvailable = $state(false);

	const showTotpStep = $derived(auth.pendingTotp !== null);

	onMount(() => {
		passkeySupported = isPasskeySupported();
	});

	$effect(() => {
		if (!passkeySupported || !username.trim()) {
			passkeysAvailable = false;
			return;
		}
		const currentUsername = username.trim();
		let cancelled = false;
		void passkeysAvailableForUsername(currentUsername).then((available) => {
			if (!cancelled && username.trim() === currentUsername) {
				passkeysAvailable = available;
			}
		});
		return () => {
			cancelled = true;
		};
	});

	async function afterAuth(user: { mustChangePassword?: boolean }) {
		if (user.mustChangePassword) {
			goto('/change-password');
		} else {
			goto('/');
		}
	}

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		const result = await auth.login(username, password);
		submitting = false;
		if (result && !result.requiresTotp) {
			await afterAuth(result.user);
		}
	}

	async function handleTotp(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		const ok = await auth.verifyTotp(totpCode);
		submitting = false;
		if (ok && auth.user) {
			await afterAuth(auth.user);
		}
	}

	async function handlePasskeyLogin() {
		submitting = true;
		const user = await auth.loginWithPasskey(username.trim() || undefined);
		submitting = false;
		if (user) {
			await afterAuth(user);
		}
	}
</script>

<svelte:head>
	<title>Sign in — ai-v-models</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-3xl font-bold text-cyan-400 tracking-tight">ai-v-models</h1>
			<p class="mt-2 text-gray-400 text-sm">LLM Reverse Proxy Admin</p>
		</div>

		<div class="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-2xl">
			{#if showTotpStep}
				<h2 class="text-lg font-semibold text-gray-100 mb-2">Two-factor authentication</h2>
				<p class="text-sm text-gray-400 mb-6">
					Enter the 6-digit code from your authenticator app.
				</p>

				<form onsubmit={handleTotp} class="space-y-4">
					<div>
						<label for="totp" class="block text-sm font-medium text-gray-300 mb-1.5">
							Verification code
						</label>
						<input
							id="totp"
							type="text"
							inputmode="numeric"
							pattern="[0-9]*"
							maxlength="6"
							bind:value={totpCode}
							required
							autocomplete="one-time-code"
							placeholder="000000"
							class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors tracking-widest text-center text-lg"
						/>
					</div>

					{#if auth.error}
						<div class="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
							{auth.error}
						</div>
					{/if}

					<button
						type="submit"
						disabled={submitting || auth.loading}
						class="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
					>
						{submitting ? 'Verifying…' : 'Verify'}
					</button>

					<button
						type="button"
						onclick={() => auth.cancelTotp()}
						class="w-full py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
					>
						← Back to sign in
					</button>
				</form>
			{:else}
				<h2 class="text-lg font-semibold text-gray-100 mb-6">Sign in to your account</h2>

				<form onsubmit={handleLogin} class="space-y-4">
					<div>
						<label for="username" class="block text-sm font-medium text-gray-300 mb-1.5">
							Username
						</label>
						<input
							id="username"
							type="text"
							bind:value={username}
							required
							autocomplete="username webauthn"
							placeholder="admin"
							class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
						/>
					</div>

					<div>
						<label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">
							Password
						</label>
						<input
							id="password"
							type="password"
							bind:value={password}
							required
							autocomplete="current-password"
							placeholder="••••••••"
							class="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors"
						/>
					</div>

					{#if auth.error}
						<div class="rounded-lg bg-red-900/30 border border-red-800 px-3 py-2 text-sm text-red-400">
							{auth.error}
						</div>
					{/if}

					<button
						type="submit"
						disabled={submitting || auth.loading}
						class="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900"
					>
						{submitting ? 'Signing in…' : 'Sign in'}
					</button>
				</form>

				{#if passkeySupported}
					<div class="relative my-6">
						<div class="absolute inset-0 flex items-center" aria-hidden="true">
							<div class="w-full border-t border-gray-800"></div>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-gray-900 px-2 text-gray-500">or</span>
						</div>
					</div>

					<button
						type="button"
						onclick={handlePasskeyLogin}
						disabled={submitting || auth.loading || (Boolean(username.trim()) && !passkeysAvailable)}
						class="w-full py-2.5 px-4 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-100 font-medium rounded-lg border border-gray-700 transition-colors flex items-center justify-center gap-2"
					>
						<span aria-hidden="true">🔐</span>
						{submitting ? 'Waiting for passkey…' : 'Sign in with passkey'}
					</button>
					{#if username.trim() && !passkeysAvailable}
						<p class="mt-2 text-xs text-gray-500 text-center">
							No passkey registered for this account yet.
						</p>
					{/if}
				{/if}
			{/if}
		</div>
	</div>
</div>
