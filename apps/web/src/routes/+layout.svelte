<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { auth } from '$lib/auth.svelte.js';
	import { sse } from '$lib/sse.svelte.js';

	interface Props {
		children: import('svelte').Snippet;
	}
	const { children }: Props = $props();

	const isLoginPage = $derived(page.url.pathname === '/login');

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: '⊞' },
		{ href: '/backends', label: 'Backends', icon: '⬡' },
		{ href: '/vmodels', label: 'Virtual Models', icon: '◈' },
		{ href: '/keys', label: 'API Keys', icon: '⚿' },
		{ href: '/hooks', label: 'Hooks', icon: '⇲' },
		{ href: '/logs', label: 'Live Logs', icon: '≡' },
		{ href: '/metrics', label: 'Metrics', icon: '◉' },
		{ href: '/settings', label: 'Settings', icon: '⚙' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	async function handleLogout() {
		await auth.logout();
		goto('/login');
	}

	onMount(async () => {
		if (isLoginPage) return;
		const ok = await auth.checkAuth();
		if (!ok) {
			goto('/login');
			return;
		}
		sse.connect();
	});
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="flex h-screen overflow-hidden">
		<!-- Sidebar -->
		<aside class="flex w-56 flex-shrink-0 flex-col bg-gray-900 border-r border-gray-800">
			<!-- Logo -->
			<div class="flex items-center gap-2 px-4 py-5 border-b border-gray-800">
				<span class="text-cyan-400 text-xl font-bold tracking-tight">ai-v-models</span>
				<span
					class="ml-auto w-2 h-2 rounded-full"
					class:bg-green-400={sse.connected}
					class:bg-gray-600={!sse.connected}
					title={sse.connected ? 'Live' : 'Disconnected'}
				></span>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto py-3 px-2">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors"
						class:bg-cyan-500={isActive(item.href)}
						class:text-white={isActive(item.href)}
						class:text-gray-400={!isActive(item.href)}
						class:hover:bg-gray-800={!isActive(item.href)}
						class:hover:text-gray-100={!isActive(item.href)}
					>
						<span class="text-base w-5 text-center">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>

			<!-- Footer -->
			<div class="border-t border-gray-800 p-3">
				{#if auth.user}
					<div class="flex items-center gap-2 px-2 py-1 mb-2">
						<div class="w-7 h-7 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-bold">
							{auth.user.username.charAt(0).toUpperCase()}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-gray-200 truncate">{auth.user.username}</p>
							<p class="text-xs text-gray-500 truncate">{auth.user.role}</p>
						</div>
					</div>
				{/if}
				<button
					onclick={handleLogout}
					class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
				>
					<span>↩</span>
					Sign out
				</button>
			</div>
		</aside>

		<!-- Main content -->
		<main class="flex-1 overflow-y-auto bg-gray-950">
			{@render children()}
		</main>
	</div>
{/if}
