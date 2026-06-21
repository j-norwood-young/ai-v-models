<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { ApiKey } from '$lib/api.js';

	let keys = $state<ApiKey[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let newKeyValue = $state<string | null>(null);
	let showCreateForm = $state(false);
	let suspendId = $state<string | null>(null);
	let suspendReason = $state('');
	let deleteConfirm = $state<string | null>(null);

	// Create form
	let newName = $state('');
	let newRpmLimit = $state('');
	let newDayBudget = $state('');
	let newExpires = $state('');
	let newModels = $state('');
	let createError = $state<string | null>(null);
	let createLoading = $state(false);

	async function load() {
		try {
			keys = await api.getKeys();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load keys';
		} finally {
			loading = false;
		}
	}

	async function handleCreate(e: SubmitEvent) {
		e.preventDefault();
		createLoading = true;
		createError = null;
		try {
			const result = await api.createKey({
				name: newName,
				rpm_limit: newRpmLimit ? parseInt(newRpmLimit) : undefined,
				day_budget: newDayBudget ? parseFloat(newDayBudget) : undefined,
				expires_at: newExpires || undefined,
				allowed_models: newModels ? newModels.split(',').map((s) => s.trim()) : undefined
			});
			newKeyValue = result.key;
			keys = [...keys, result];
			showCreateForm = false;
			newName = '';
			newRpmLimit = '';
			newDayBudget = '';
			newExpires = '';
			newModels = '';
		} catch (err) {
			createError = err instanceof Error ? err.message : 'Failed to create key';
		} finally {
			createLoading = false;
		}
	}

	async function handleSuspend(id: string) {
		try {
			const updated = await api.suspendKey(id, suspendReason);
			keys = keys.map((k) => (k.id === id ? updated : k));
			suspendId = null;
			suspendReason = '';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to suspend key';
		}
	}

	async function handleResume(id: string) {
		try {
			const updated = await api.resumeKey(id);
			keys = keys.map((k) => (k.id === id ? updated : k));
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to resume key';
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
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-100">API Keys</h1>
			<p class="text-sm text-gray-400 mt-1">Manage access keys and rate limits</p>
		</div>
		<button
			onclick={() => (showCreateForm = !showCreateForm)}
			class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
		>
			+ Create Key
		</button>
	</div>

	{#if newKeyValue}
		<div class="bg-green-900/20 border border-green-700 rounded-xl p-4 mb-6">
			<p class="text-sm font-medium text-green-400 mb-2">Key created — copy now, it won't be shown again</p>
			<div class="flex items-center gap-3">
				<code class="flex-1 font-mono text-sm text-green-300 bg-gray-900 rounded-lg px-3 py-2 break-all">
					{newKeyValue}
				</code>
				<button
					onclick={() => navigator.clipboard.writeText(newKeyValue ?? '')}
					class="px-3 py-2 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
				>
					Copy
				</button>
			</div>
			<button
				onclick={() => (newKeyValue = null)}
				class="mt-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
			>
				Dismiss
			</button>
		</div>
	{/if}

	{#if showCreateForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-100 mb-4">New API Key</h2>
			<form onsubmit={handleCreate} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div class="sm:col-span-2">
					<label class="block text-xs font-medium text-gray-400 mb-1">Key Name *</label>
					<input bind:value={newName} required placeholder="my-app-key" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">RPM Limit</label>
					<input bind:value={newRpmLimit} type="number" min="1" placeholder="60" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Day Budget ($)</label>
					<input bind:value={newDayBudget} type="number" min="0" step="0.01" placeholder="10.00" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Expires At</label>
					<input bind:value={newExpires} type="datetime-local" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Allowed Models (comma-separated)</label>
					<input bind:value={newModels} placeholder="gpt-4o, claude-3-5-sonnet" class="input w-full" />
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
						{createLoading ? 'Creating…' : 'Create Key'}
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

	{#if suspendId}
		<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
				<h2 class="text-base font-semibold text-gray-100 mb-4">Suspend Key</h2>
				<div class="mb-4">
					<label class="block text-xs font-medium text-gray-400 mb-1">Reason (optional)</label>
					<input bind:value={suspendReason} placeholder="Abuse detected…" class="input w-full" />
				</div>
				<div class="flex gap-3">
					<button
						onclick={() => handleSuspend(suspendId!)}
						class="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-lg text-sm transition-colors"
					>
						Suspend
					</button>
					<button
						onclick={() => { suspendId = null; suspendReason = ''; }}
						class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

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
			<p class="text-sm">Create your first key to grant access.</p>
		</div>
	{:else}
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Prefix</th>
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
									{#if key.suspended}
										<button
											onclick={() => handleResume(key.id)}
											class="px-2.5 py-1 text-xs bg-green-900/40 hover:bg-green-800 text-green-400 rounded-md transition-colors"
										>
											Resume
										</button>
									{:else}
										<button
											onclick={() => (suspendId = key.id)}
											class="px-2.5 py-1 text-xs bg-yellow-900/40 hover:bg-yellow-800 text-yellow-400 rounded-md transition-colors"
										>
											Suspend
										</button>
									{/if}
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
