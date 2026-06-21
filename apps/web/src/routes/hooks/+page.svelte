<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import type { Hook } from '$lib/api.js';

	let hooks = $state<Hook[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let showWebhookForm = $state(false);
	let showInternalForm = $state(false);
	let testResults = $state<Record<string, { success: boolean; error?: string; loading: boolean }>>({});
	let deleteConfirm = $state<string | null>(null);

	// Webhook form
	let whName = $state('');
	let whTrigger = $state('request.complete');
	let whUrl = $state('');
	let whError = $state<string | null>(null);
	let whLoading = $state(false);

	// Internal hook form
	let ihName = $state('');
	let ihTrigger = $state('request.complete');
	let ihModule = $state('');
	let ihError = $state<string | null>(null);
	let ihLoading = $state(false);

	const triggers = [
		'request.start',
		'request.complete',
		'request.error',
		'key.suspended',
		'key.budget_exceeded',
		'backend.unhealthy'
	];

	async function load() {
		try {
			hooks = await api.getHooks();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load hooks';
		} finally {
			loading = false;
		}
	}

	async function handleAddWebhook(e: SubmitEvent) {
		e.preventDefault();
		whLoading = true;
		whError = null;
		try {
			const hook = await api.createHook({
				name: whName,
				type: 'webhook',
				trigger: whTrigger,
				url: whUrl,
				enabled: true
			});
			hooks = [...hooks, hook];
			showWebhookForm = false;
			whName = '';
			whUrl = '';
		} catch (err) {
			whError = err instanceof Error ? err.message : 'Failed to add webhook';
		} finally {
			whLoading = false;
		}
	}

	async function handleAddInternal(e: SubmitEvent) {
		e.preventDefault();
		ihLoading = true;
		ihError = null;
		try {
			const hook = await api.createHook({
				name: ihName,
				type: 'internal',
				trigger: ihTrigger,
				module: ihModule,
				enabled: true
			});
			hooks = [...hooks, hook];
			showInternalForm = false;
			ihName = '';
			ihModule = '';
		} catch (err) {
			ihError = err instanceof Error ? err.message : 'Failed to add internal hook';
		} finally {
			ihLoading = false;
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
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-100">Hooks</h1>
			<p class="text-sm text-gray-400 mt-1">Event-driven webhooks and internal handlers</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => { showWebhookForm = !showWebhookForm; showInternalForm = false; }}
				class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white font-medium rounded-lg text-sm transition-colors"
			>
				+ Add Webhook
			</button>
			<button
				onclick={() => { showInternalForm = !showInternalForm; showWebhookForm = false; }}
				class="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg text-sm transition-colors"
			>
				+ Add Internal
			</button>
		</div>
	</div>

	{#if showWebhookForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-100 mb-4">New Webhook</h2>
			<form onsubmit={handleAddWebhook} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Name *</label>
					<input bind:value={whName} required placeholder="my-webhook" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Trigger *</label>
					<select bind:value={whTrigger} class="input w-full">
						{#each triggers as t}<option value={t}>{t}</option>{/each}
					</select>
				</div>
				<div class="sm:col-span-2">
					<label class="block text-xs font-medium text-gray-400 mb-1">URL *</label>
					<input bind:value={whUrl} required type="url" placeholder="https://example.com/webhook" class="input w-full" />
				</div>
				{#if whError}
					<div class="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{whError}</div>
				{/if}
				<div class="sm:col-span-2 flex gap-3">
					<button type="submit" disabled={whLoading} class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white font-medium rounded-lg text-sm transition-colors">
						{whLoading ? 'Adding…' : 'Add Webhook'}
					</button>
					<button type="button" onclick={() => (showWebhookForm = false)} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition-colors">Cancel</button>
				</div>
			</form>
		</div>
	{/if}

	{#if showInternalForm}
		<div class="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
			<h2 class="text-base font-semibold text-gray-100 mb-4">New Internal Hook</h2>
			<form onsubmit={handleAddInternal} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Name *</label>
					<input bind:value={ihName} required placeholder="budget-alerter" class="input w-full" />
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-400 mb-1">Trigger *</label>
					<select bind:value={ihTrigger} class="input w-full">
						{#each triggers as t}<option value={t}>{t}</option>{/each}
					</select>
				</div>
				<div class="sm:col-span-2">
					<label class="block text-xs font-medium text-gray-400 mb-1">Module *</label>
					<input bind:value={ihModule} required placeholder="hooks/budget_alert" class="input w-full" />
				</div>
				{#if ihError}
					<div class="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{ihError}</div>
				{/if}
				<div class="sm:col-span-2 flex gap-3">
					<button type="submit" disabled={ihLoading} class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white font-medium rounded-lg text-sm transition-colors">
						{ihLoading ? 'Adding…' : 'Add Internal Hook'}
					</button>
					<button type="button" onclick={() => (showInternalForm = false)} class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition-colors">Cancel</button>
				</div>
			</form>
		</div>
	{/if}

	{#if error}
		<div class="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-500">Loading…</div>
	{:else if hooks.length === 0}
		<div class="text-center py-16 text-gray-500">
			<p class="text-lg mb-2">No hooks configured</p>
			<p class="text-sm">Add webhooks or internal handlers to react to events.</p>
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
	.input:focus { border-color: #06b6d4; }
	.input::placeholder { color: #6b7280; }
</style>
