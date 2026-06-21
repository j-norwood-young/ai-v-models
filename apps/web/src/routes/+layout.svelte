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

	let sidebarOpen = $state(false);

	const navItems = [
		{ href: '/', label: 'Dashboard', icon: '⊞' },
		{ href: '/backends', label: 'Backends', icon: '⬡' },
		{ href: '/vmodels', label: 'Virtual Models', icon: '◈' },
		{ href: '/keys', label: 'API Keys', icon: '⚿' },
		{ href: '/hooks', label: 'Hooks', icon: '⇲' },
		{ href: '/logs', label: 'Live Logs', icon: '≡' },
		{ href: '/analytics', label: 'Metrics', icon: '◉' },
		{ href: '/settings', label: 'Settings', icon: '⚙' }
	];

	function isActive(href: string): boolean {
		if (href === '/') return page.url.pathname === '/';
		return page.url.pathname.startsWith(href);
	}

	function closeSidebar() {
		sidebarOpen = false;
	}

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
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
		<!-- Mobile header -->
		<header
			class="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800"
		>
			<button
				type="button"
				onclick={toggleSidebar}
				class="p-2 -ml-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
				aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
				aria-expanded={sidebarOpen}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
					{#if sidebarOpen}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					{:else}
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					{/if}
				</svg>
			</button>
			<span class="text-cyan-400 text-lg font-bold tracking-tight">ai-v-models</span>
			<span
				class="ml-auto w-2 h-2 rounded-full"
				class:bg-green-400={sse.connected}
				class:bg-gray-600={!sse.connected}
				title={sse.connected ? 'Live' : 'Disconnected'}
			></span>
		</header>

		<!-- Mobile backdrop -->
		{#if sidebarOpen}
			<button
				type="button"
				class="md:hidden fixed inset-0 z-40 bg-black/50"
				onclick={closeSidebar}
				aria-label="Close menu"
			></button>
		{/if}

		<!-- Sidebar -->
		<aside
			class="fixed md:relative inset-y-0 left-0 z-50 flex w-56 flex-shrink-0 flex-col bg-gray-900 border-r border-gray-800 transition-transform duration-200 ease-in-out -translate-x-full md:translate-x-0"
			class:translate-x-0={sidebarOpen}
		>
			<!-- Logo (desktop only) -->
			<div class="hidden md:flex items-center gap-2 px-4 py-5 border-b border-gray-800">
				<span class="text-cyan-400 text-xl font-bold tracking-tight">ai-v-models</span>
				<span
					class="ml-auto w-2 h-2 rounded-full"
					class:bg-green-400={sse.connected}
					class:bg-gray-600={!sse.connected}
					title={sse.connected ? 'Live' : 'Disconnected'}
				></span>
			</div>

			<!-- Mobile sidebar header -->
			<div class="md:hidden flex items-center justify-between px-4 py-4 border-b border-gray-800">
				<span class="text-cyan-400 text-lg font-bold tracking-tight">Menu</span>
				<button
					type="button"
					onclick={closeSidebar}
					class="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-gray-100 transition-colors"
					aria-label="Close menu"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Navigation -->
			<nav class="flex-1 overflow-y-auto py-3 px-2">
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						onclick={closeSidebar}
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
		<main class="flex-1 min-w-0 overflow-y-auto bg-gray-950 pt-14 md:pt-0">
			{@render children()}
		</main>
	</div>
{/if}
