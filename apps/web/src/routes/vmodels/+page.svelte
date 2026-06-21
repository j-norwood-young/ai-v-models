<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { VModel, Backend } from '$lib/api.js';

	let vmodels = $state<VModel[]>([]);
	let backends = $state<Backend[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showCreateForm = $state(false);
	let expandedId = $state<string | null>(null);

	// Create form
	let newModelId = $state('');
	let newDisplayName = $state('');
	let newStrategy = $state<VModel['strategy']>('round_robin');
	let newStreaming = $state(true);
	let createError = $state<string | null>(null);
	let createLoading = $state(false);

	// Add backend to vmodel
	let addBackendId = $state('');
	let addBackendLoading = $state(false);

	async function load() {
		try {
			[vmodels, backends] = await Promise.all([api.getVModels(), api.getBackends()]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		createLoading = true;
		createError = null;
		try {
			const vm = await api.createVModel({
				model_id: newModelId,
				display_name: newDisplayName,
				strategy: newStrategy,
				streaming: newStreaming
			});
			vmodels = [...vmodels, vm];
			showCreateForm = false;
			newModelId = '';
			newDisplayName = '';
			newStrategy = 'round_robin';
			newStreaming = true;
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create virtual model';
		} finally {
			createLoading = false;
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.deleteVModel(id);
			vmodels = vmodels.filter((v) => v.id !== id);
			if (expandedId === id) expandedId = null;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to delete virtual model';
		}
	}

	async function handleAddBackend(vmodelId: string) {
		if (!addBackendId) return;
		addBackendLoading = true;
		try {
			const updated = await api.addVModelBackend(vmodelId, { backend_id: addBackendId });
			vmodels = vmodels.map((v) => (v.id === vmodelId ? updated : v));
			addBackendId = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add backend';
		} finally {
			addBackendLoading = false;
		}
	}

	async function handleRemoveBackend(vmodelId: string, backendId: string) {
		try {
			await api.removeVModelBackend(vmodelId, backendId);
			vmodels = vmodels.map((v) =>
				v.id === vmodelId
					? { ...v, backends: v.backends.filter((b) => b.backend_id !== backendId) }
					: v
			);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to remove backend';
		}
	}

	async function toggleEnabled(vm: VModel) {
		try {
			const updated = await api.updateVModel(vm.id, { enabled: !vm.enabled });
			vmodels = vmodels.map((v) => (v.id === vm.id ? updated : v));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update virtual model';
		}
	}

	function backendName(backendId: string): string {
		return backends.find((b) => b.id === backendId)?.name ?? backendId;
	}

	onMount(load);
</script>

<svelte:head>
	<title>Virtual Models — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-100">Virtual Models</h1>
			<p class="text-sm text-gray-400 mt-1">Route model IDs to backend pools</p>
		</div>
		<button
			onclick={() => (showCreateForm = !showCreateForm)}
			class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
		>
			+ Create V-Model
		</button>
	</div>

	{#if showCreateForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-100 mb-4">New Virtual Model</h2>
			<form onsubmit={handleCreate} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Model ID *</label>
					<input bind:value={newModelId} required placeholder="gpt-4o" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Display Name *</label>
					<input bind:value={newDisplayName} required placeholder="GPT-4o" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Strategy</label>
					<select bind:value={newStrategy} class="input w-full">
						<option value="round_robin">Round Robin</option>
						<option value="least_latency">Least Latency</option>
						<option value="random">Random</option>
						<option value="failover">Failover</option>
					</select>
				</div>
				<div class="flex items-center gap-3 pt-5">
					<button
						type="button"
						onclick={() => (newStreaming = !newStreaming)}
						class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
						class:bg-cyan-500={newStreaming}
						class:bg-gray-700={!newStreaming}
						role="switch"
						aria-checked={newStreaming}
					>
						<span
							class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
							class:translate-x-4={newStreaming}
							class:translate-x-0={!newStreaming}
						></span>
					</button>
					<span class="text-sm text-gray-300">Enable Streaming</span>
				</div>

				{#if createError}
					<div class="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
						{createError}
					</div>
				{/if}
				<div class="sm:col-span-2 flex gap-3">
					<button
						type="submit"
						disabled={createLoading}
						class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white font-medium rounded-lg text-sm transition-colors"
					>
						{createLoading ? 'Creating…' : 'Create'}
					</button>
					<button
						type="button"
						onclick={() => (showCreateForm = false)}
						class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{/if}

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
			<p class="text-sm">Create your first virtual model to start routing requests.</p>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider w-6"></th>
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
							<td class="px-4 py-3">
								<button
									onclick={() => (expandedId = expandedId === vm.id ? null : vm.id)}
									class="text-gray-400 hover:text-gray-100 transition-colors"
								>
									{expandedId === vm.id ? '▼' : '▶'}
								</button>
							</td>
							<td class="px-4 py-3 font-mono text-cyan-400">{vm.model_id}</td>
							<td class="px-4 py-3 text-gray-200">{vm.display_name}</td>
							<td class="px-4 py-3 text-gray-400 capitalize">{vm.strategy.replace('_', ' ')}</td>
							<td class="px-4 py-3">
								<span class="px-2 py-0.5 rounded-full text-xs border {vm.streaming ? 'bg-green-500/20 text-green-400 border-green-800' : 'bg-gray-700/40 text-gray-500 border-gray-700'}">
									{vm.streaming ? 'Yes' : 'No'}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-400">{vm.backends.length}</td>
							<td class="px-4 py-3">
								<button
									onclick={() => toggleEnabled(vm)}
									class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
									class:bg-cyan-500={vm.enabled}
									class:bg-gray-700={!vm.enabled}
									role="switch"
									aria-checked={vm.enabled}
								>
									<span
										class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
										class:translate-x-4={vm.enabled}
										class:translate-x-0={!vm.enabled}
									></span>
								</button>
							</td>
							<td class="px-4 py-3 text-right">
								<button
									onclick={() => handleDelete(vm.id)}
									class="px-2.5 py-1 text-xs bg-gray-800 hover:bg-red-900/50 hover:text-red-400 text-gray-400 rounded-md transition-colors"
								>
									Delete
								</button>
							</td>
						</tr>
						{#if expandedId === vm.id}
							<tr class="bg-gray-800/20">
								<td colspan="8" class="px-6 py-4">
									<div class="space-y-3">
										<h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Backend Mappings</h3>
										{#if vm.backends.length === 0}
											<p class="text-sm text-gray-500">No backends assigned.</p>
										{:else}
											<div class="space-y-1.5">
												{#each vm.backends as b (b.backend_id)}
													<div class="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
														<span class="text-sm text-gray-200 flex-1">{backendName(b.backend_id)}</span>
														{#if b.weight != null}
															<span class="text-xs text-gray-500">weight: {b.weight}</span>
														{/if}
														<button
															onclick={() => handleRemoveBackend(vm.id, b.backend_id)}
															class="text-xs text-gray-500 hover:text-red-400 transition-colors"
														>
															Remove
														</button>
													</div>
												{/each}
											</div>
										{/if}
										<!-- Add backend -->
										<div class="flex gap-2 mt-2">
											<select bind:value={addBackendId} class="input flex-1 text-xs">
												<option value="">Select backend…</option>
												{#each backends as b (b.id)}
													{#if !vm.backends.some((vb) => vb.backend_id === b.id)}
														<option value={b.id}>{b.name}</option>
													{/if}
												{/each}
											</select>
											<button
												onclick={() => handleAddBackend(vm.id)}
												disabled={!addBackendId || addBackendLoading}
												class="px-3 py-1.5 text-xs bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white rounded-md transition-colors"
											>
												Add
											</button>
										</div>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.input {
		background: #1f2937;
		border: 1px solid #374151;
		border-radius: 0.5rem;
		padding: 0.5rem 0.75rem;
		color: #f3f4f6;
		font-size: 0.875rem;
		outline: none;
		transition: border-color 0.15s;
	}
	.input:focus {
		border-color: #06b6d4;
	}
	.input::placeholder {
		color: #6b7280;
	}
</style>
