<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte.js';

	let username = $state('');
	let password = $state('');
	let submitting = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		submitting = true;
		const ok = await auth.login(username, password);
		submitting = false;
		if (ok) {
			goto('/');
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
			<h2 class="text-lg font-semibold text-gray-100 mb-6">Sign in to your account</h2>

			<form onsubmit={handleSubmit} class="space-y-4">
				<div>
					<label for="username" class="block text-sm font-medium text-gray-300 mb-1.5">
						Username
					</label>
					<input
						id="username"
						type="text"
						bind:value={username}
						required
						autocomplete="username"
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
		</div>
	</div>
</div>
