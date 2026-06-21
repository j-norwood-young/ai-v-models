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
	<title>Virtual Models — AiVM</title>
</svelte:head>

<div class="page">
	<PageHeader title="Virtual Models" subtitle="Route model IDs to backend pools">
		{#snippet actions()}
			<a href="/vmodels/new" class="btn btn-primary btn-md">
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
		<div class="table-container">
			<table>
				<thead>
					<tr>
						<th>Model ID</th>
						<th>Display Name</th>
						<th>Strategy</th>
						<th>Streaming</th>
						<th>Backends</th>
						<th>Enabled</th>
						<th class="text-right">Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each vmodels as vm (vm.id)}
						<tr>
							<td><span class="font-mono text-cyan-400 text-xs">{vm.model_id}</span></td>
							<td class="text-gray-200">{vm.display_name}</td>
							<td class="text-gray-400 capitalize">{vm.strategy.replace(/-/g, ' ')}</td>
							<td>
								<span class={vm.streaming ? 'badge badge-green' : 'badge badge-gray'}>
									{vm.streaming ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="text-gray-400">{vm.backends.length}</td>
							<td>
								<span class={vm.enabled ? 'badge badge-green' : 'badge badge-gray'}>
									{vm.enabled ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="text-right">
								<div class="flex items-center justify-end gap-2">
									<a href="/vmodels/{vm.id}/edit" class="btn btn-sm btn-secondary">
										Edit
									</a>
									<button
										onclick={() => handleDelete(vm.id)}
										class="btn btn-sm btn-danger"
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
