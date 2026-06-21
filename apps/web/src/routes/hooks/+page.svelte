<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { Hook } from '$lib/api.js';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let hooks = $state<Hook[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let testResults = $state<Record<string, { success: boolean; error?: string; loading: boolean }>>({});
	let deleteConfirm = $state<string | null>(null);

	async function load() {
		try {
			hooks = await api.getHooks();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load hooks';
		} finally {
			loading = false;
		}
	}

	async function testHook(id: string) {
		testResults = { ...testResults, [id]: { success: false, loading: true } };
		try {
			const result = await api.testHook(id);
			testResults = { ...testResults, [id]: { ...result, loading: false } };
		} catch (err) {
			testResults = {
				...testResults,
				[id]: { success: false, error: err instanceof Error ? err.message : 'Test failed', loading: false }
			};
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.deleteHook(id);
			hooks = hooks.filter((h) => h.id !== id);
			deleteConfirm = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete hook';
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>Hooks — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<PageHeader title="Hooks" subtitle="Event-driven webhooks and internal handlers">
		{#snippet actions()}
			<a
				href="/hooks/new?type=webhook"
				class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
			>
				+ Add Webhook
			</a>
			<a
				href="/hooks/new?type=internal"
				class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg text-sm transition-colors"
			>
				+ Add Internal
			</a>
		{/snippet}
	</PageHeader>

	{#if error}
		<div class="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-500">Loading…</div>
	{:else if hooks.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No hooks configured</p>
			<p class="text-sm mb-4">Add webhooks or internal handlers to react to events.</p>
			<div class="flex justify-center gap-4 text-sm">
				<a href="/hooks/new?type=webhook" class="text-cyan-400 hover:text-cyan-300">Add Webhook →</a>
				<a href="/hooks/new?type=internal" class="text-cyan-400 hover:text-cyan-300">Add Internal →</a>
			</div>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Trigger</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Target</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Enabled</th>
						<th class="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each hooks as hook (hook.id)}
						<tr class="hover:bg-gray-800/40 transition-colors">
							<td class="px-4 py-3 text-gray-200 font-medium">{hook.name}</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border {hook.type === 'webhook' ? 'bg-blue-500/20 text-blue-400 border-blue-800' : 'bg-purple-500/20 text-purple-400 border-purple-800'}">
									{hook.type}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-400 font-mono text-xs">{hook.trigger}</td>
							<td class="px-4 py-3 text-gray-400 text-xs truncate max-w-[200px] hidden md:table-cell">
								{hook.url ?? hook.module ?? '—'}
							</td>
							<td class="px-4 py-3">
								<span class="w-2 h-2 rounded-full inline-block {hook.enabled ? 'bg-green-500' : 'bg-gray-600'}"></span>
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									{#if testResults[hook.id]?.loading}
										<span class="text-xs text-gray-500">Testing…</span>
									{:else if testResults[hook.id]}
										{@const r = testResults[hook.id]}
										{#if r.success}
											<span class="text-xs text-green-400">✓ OK</span>
										{:else}
											<span class="text-xs text-red-400" title={r.error}>✗ Failed</span>
										{/if}
									{/if}
									<button
										onclick={() => testHook(hook.id)}
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Test
									</button>
									<a
										href="/hooks/{hook.id}/edit"
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Edit
									</a>
									{#if deleteConfirm === hook.id}
										<button onclick={() => handleDelete(hook.id)} class="px-2.5 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded-md transition-colors">Confirm</button>
										<button onclick={() => (deleteConfirm = null)} class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors">Cancel</button>
									{:else}
										<button onclick={() => (deleteConfirm = hook.id)} class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-md transition-colors">Delete</button>
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
