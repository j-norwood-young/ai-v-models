<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { VModel } from '$lib/api.js';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let vmodels = $state<VModel[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		try {
			vmodels = await api.getVModels();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load virtual models';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(id: string) {
		if (!confirm('Delete this virtual model?')) return;
		try {
			await api.deleteVModel(id);
			vmodels = vmodels.filter((v) => v.id !== id);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete virtual model';
		}
	}

	onMount(load);
</script>

<svelte:head>
	<title>Virtual Models — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<PageHeader title="Virtual Models" subtitle="Route model IDs to backend pools">
		{#snippet actions()}
			<a
				href="/vmodels/new"
				class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
			>
				+ Create V-Model
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
	{:else if vmodels.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No virtual models configured</p>
			<p class="text-sm mb-4">Create your first virtual model to start routing requests.</p>
			<a href="/vmodels/new" class="text-cyan-400 hover:text-cyan-300 text-sm">Create V-Model →</a>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Model ID</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Display Name</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Strategy</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Streaming</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Backends</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Enabled</th>
						<th class="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each vmodels as vm (vm.id)}
						<tr class="hover:bg-gray-800/30 transition-colors">
							<td class="px-4 py-3 font-mono text-cyan-400">{vm.model_id}</td>
							<td class="px-4 py-3 text-gray-200">{vm.display_name}</td>
							<td class="px-4 py-3 text-gray-400 capitalize">{vm.strategy.replace(/-/g, ' ')}</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border {vm.streaming ? 'bg-green-500/20 text-green-400 border-green-800' : 'bg-gray-700/40 text-gray-500 border-gray-700'}">
									{vm.streaming ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-400">{vm.backends.length}</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border {vm.enabled ? 'bg-green-500/20 text-green-400 border-green-800' : 'bg-gray-700/40 text-gray-500 border-gray-700'}">
									{vm.enabled ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-2">
									<a
										href="/vmodels/{vm.id}/edit"
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
									>
										Edit
									</a>
									<button
										onclick={() => handleDelete(vm.id)}
										class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-md transition-colors"
									>
										Delete
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
