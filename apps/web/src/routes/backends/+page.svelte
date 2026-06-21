<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { Backend } from '$lib/api.js';

	let backends = $state<Backend[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showAddForm = $state(false);
	let testResults = $state<Record<string, { success: boolean; latency_ms?: number; error?: string; loading: boolean }>>({});
	let deleteConfirm = $state<string | null>(null);

	// Add form state
	let newName = $state('');
	let newProvider = $state('openai');
	let newHost = $state('');
	let newUrl = $state('');
	let newApiKey = $state('');
	let addError = $state<string | null>(null);
	let addLoading = $state(false);

	async function load() {
		try {
			backends = await api.getBackends();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load backends';
		} finally {
			loading = false;
		}
	}

	async function handleAdd(e: SubmitEvent) {
		e.preventDefault();
		addLoading = true;
		addError = null;
		try {
			const b = await api.addBackend({
				name: newName,
				provider: newProvider,
				host: newHost,
				url: newUrl,
				api_key: newApiKey || undefined
			});
			backends = [...backends, b];
			showAddForm = false;
			newName = '';
			newProvider = 'openai';
			newHost = '';
			newUrl = '';
			newApiKey = '';
		} catch (err) {
			addError = err instanceof Error ? err.message : 'Failed to add backend';
		} finally {
			addLoading = false;
		}
	}

	async function toggleEnabled(backend: Backend) {
		try {
			const updated = await api.updateBackend(backend.id, { enabled: !backend.enabled });
			backends = backends.map((b) => (b.id === backend.id ? updated : b));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update backend';
		}
	}

	async function testBackend(id: string) {
		testResults = { ...testResults, [id]: { success: false, loading: true } };
		try {
			const result = await api.testBackend(id);
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
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-100">Backends</h1>
			<p class="text-sm text-gray-400 mt-1">Manage LLM backend connections</p>
		</div>
		<button
			onclick={() => (showAddForm = !showAddForm)}
			class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
		>
			+ Add Backend
		</button>
	</div>

	{#if showAddForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-100 mb-4">New Backend</h2>
			<form onsubmit={handleAdd} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Name *</label>
					<input bind:value={newName} required placeholder="my-backend" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Provider *</label>
					<select bind:value={newProvider} class="input w-full">
						<option value="openai">OpenAI</option>
						<option value="anthropic">Anthropic</option>
						<option value="ollama">Ollama</option>
						<option value="other">Other</option>
					</select>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Host *</label>
					<input bind:value={newHost} required placeholder="api.openai.com" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Base URL *</label>
					<input bind:value={newUrl} required placeholder="https://api.openai.com/v1" class="input w-full" />
				</div>
				<div class="sm:col-span-2">
					<label class="block text-xs font-medium text-gray-400 mb-1">API Key</label>
					<input bind:value={newApiKey} type="password" placeholder="sk-…" class="input w-full" />
				</div>

				{#if addError}
					<div class="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
						{addError}
					</div>
				{/if}

				<div class="sm:col-span-2 flex gap-3">
					<button
						type="submit"
						disabled={addLoading}
						class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white font-medium rounded-lg text-sm transition-colors"
					>
						{addLoading ? 'Adding…' : 'Add Backend'}
					</button>
					<button
						type="button"
						onclick={() => (showAddForm = false)}
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
	{:else if backends.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No backends configured</p>
			<p class="text-sm">Add your first backend to get started.</p>
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
								<button
									onclick={() => toggleEnabled(backend)}
									class="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors"
									class:bg-cyan-500={backend.enabled}
									class:bg-gray-700={!backend.enabled}
									role="switch"
									aria-checked={backend.enabled}
								>
									<span
										class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform"
										class:translate-x-4={backend.enabled}
										class:translate-x-0={!backend.enabled}
									></span>
								</button>
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
