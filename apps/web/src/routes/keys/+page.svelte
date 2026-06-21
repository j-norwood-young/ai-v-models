<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { ApiKey } from '$lib/api.js';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import SecretReveal from '$lib/components/SecretReveal.svelte';
	import KeyConnect from '$lib/components/KeyConnect.svelte';

	let keys = $state<ApiKey[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let deleteConfirm = $state<string | null>(null);

	async function load() {
		try {
			keys = await api.getKeys();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load keys';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.deleteKey(id);
			keys = keys.filter((k) => k.id !== id);
			deleteConfirm = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete key';
		}
	}

	function formatDate(ts?: string): string {
		if (!ts) return '—';
		return new Date(ts).toLocaleDateString();
	}

	onMount(load);
</script>

<svelte:head>
	<title>API Keys — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<PageHeader title="API Keys" subtitle="Manage access keys and rate limits">
		{#snippet actions()}
			<a
				href="/keys/new"
				class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
			>
				+ Create Key
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
	{:else if keys.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No API keys</p>
			<p class="text-sm mb-4">Create your first key to grant access.</p>
			<a href="/keys/new" class="text-cyan-400 hover:text-cyan-300 text-sm">Create Key →</a>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Prefix</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Key</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">RPM</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden md:table-cell">Day Budget</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider hidden lg:table-cell">Last Used</th>
						<th class="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each keys as key (key.id)}
						<tr class="hover:bg-gray-800/40 transition-colors">
							<td class="px-4 py-3 font-mono text-cyan-400 text-xs">{key.key_prefix}…</td>
							<td class="px-4 py-3 max-w-xs">
								<div class="flex items-center gap-2 flex-wrap">
									<SecretReveal
										retrievable={key.retrievable}
										fetchSecret={() => api.revealKey(key.id)}
										unavailableLabel="Not available"
									/>
									<KeyConnect
										keyPrefix={key.key_prefix}
										retrievable={key.retrievable}
										allowedVModels={key.allowed_vmodels}
										fetchSecret={() => api.revealKey(key.id)}
									/>
								</div>
							</td>
							<td class="px-4 py-3 text-gray-200">{key.name}</td>
							<td class="px-4 py-3">
								{#if key.suspended}
									<span class="px-2 py-0.5 rounded-full text-xs border bg-yellow-500/20 text-yellow-400 border-yellow-800">
										Suspended
									</span>
								{:else if key.enabled}
									<span class="px-2 py-0.5 rounded-full text-xs border bg-green-500/20 text-green-400 border-green-800">
										Active
									</span>
								{:else}
									<span class="px-2 py-0.5 rounded-full text-xs border bg-gray-700/40 text-gray-500 border-gray-700">
										Disabled
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-gray-400 hidden md:table-cell">
								{key.rpm_limit != null ? key.rpm_limit : '—'}
							</td>
							<td class="px-4 py-3 text-gray-400 hidden md:table-cell">
								{key.day_budget != null ? `$${key.day_budget}` : '—'}
							</td>
							<td class="px-4 py-3 text-gray-400 hidden lg:table-cell">{formatDate(key.last_used_at)}</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2 flex-wrap">
									<a
										href="/keys/{key.id}/logs"
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Logs
									</a>
									<a
										href="/keys/{key.id}/edit"
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Edit
									</a>
									{#if deleteConfirm === key.id}
										<button
											onclick={() => handleDelete(key.id)}
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
											onclick={() => (deleteConfirm = key.id)}
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
