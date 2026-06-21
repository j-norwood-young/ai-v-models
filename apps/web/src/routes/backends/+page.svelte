<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { Backend } from '$lib/api.js';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let backends = $state<Backend[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let testResults = $state<Record<string, { success: boolean; latency_ms?: number; error?: string; loading: boolean }>>({});
	let deleteConfirm = $state<string | null>(null);

	async function load() {
		try {
			backends = await api.getBackends();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load backends';
		} finally {
			loading = false;
		}
	}

	async function testBackend(id: string) {
		testResults = { ...testResults, [id]: { success: false, loading: true } };
		try {
			const result = await api.testBackend(id);
			testResults = { ...testResults, [id]: { ...result, loading: false } };
			if (result.health) {
				backends = backends.map((b) =>
					b.id === id
						? {
								...b,
								health: result.health!,
								latency_ms: result.latency_ms ?? b.latency_ms
							}
						: b
				);
			}
		} catch (err) {
			testResults = {
				...testResults,
				[id]: { success: false, error: err instanceof Error ? err.message : 'Test failed', loading: false }
			};
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.deleteBackend(id);
			backends = backends.filter((b) => b.id !== id);
			deleteConfirm = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete backend';
		}
	}

	function healthBadge(health: string): string {
		switch (health) {
			case 'healthy': return 'bg-green-500/20 text-green-400 border-green-800';
			case 'degraded': return 'bg-yellow-500/20 text-yellow-400 border-yellow-800';
			case 'unhealthy': return 'bg-red-500/20 text-red-400 border-red-800';
			default: return 'bg-gray-500/20 text-gray-400 border-gray-700';
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>Backends — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<PageHeader title="Backends" subtitle="Manage LLM backend connections">
		{#snippet actions()}
			<a
				href="/backends/new"
				class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
			>
				+ Add Backend
			</a>
		{/snippet}
	</PageHeader>

	{#if error}
		<div class="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm mb-4">
			{error}
		</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-500">Loading…</div>
	{:else if backends.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No backends configured</p>
			<p class="text-sm mb-4">Add your first backend to get started.</p>
			<a href="/backends/new" class="text-cyan-400 hover:text-cyan-300 text-sm">Add Backend →</a>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800 bg-gray-900/50">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Provider</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">URL</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Health</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Latency</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Enabled</th>
						<th class="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each backends as backend (backend.id)}
						<tr class="hover:bg-gray-800/40 transition-colors">
							<td class="px-4 py-3 font-medium text-gray-100">{backend.name}</td>
							<td class="px-4 py-3 text-gray-400 capitalize">{backend.provider}</td>
							<td class="px-4 py-3 text-gray-400 hidden md:table-cell font-mono text-xs truncate max-w-[200px]">{backend.url}</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border capitalize {healthBadge(backend.health)}">
									{backend.health}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-400 hidden lg:table-cell">
								{backend.latency_ms != null ? `${backend.latency_ms}ms` : '—'}
							</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border {backend.enabled ? 'bg-green-500/20 text-green-400 border-green-800' : 'bg-gray-700/40 text-gray-500 border-gray-700'}">
									{backend.enabled ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									{#if testResults[backend.id]?.loading}
										<span class="text-xs text-gray-500">Testing…</span>
									{:else if testResults[backend.id]}
										{@const r = testResults[backend.id]}
										{#if r.success}
											<span class="text-xs text-green-400">{r.latency_ms}ms ✓</span>
										{:else}
											<span class="text-xs text-red-400" title={r.error}>✗ Failed</span>
										{/if}
									{/if}
									<button
										onclick={() => testBackend(backend.id)}
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Test
									</button>
									<a
										href="/backends/{backend.id}/edit"
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Edit
									</a>
									{#if deleteConfirm === backend.id}
										<button
											onclick={() => handleDelete(backend.id)}
											class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors"
										>
											Confirm
										</button>
										<button
											onclick={() => (deleteConfirm = null)}
											class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
										>
											Cancel
										</button>
									{:else}
										<button
											onclick={() => (deleteConfirm = backend.id)}
											class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-md transition-colors"
										>
											Delete
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
