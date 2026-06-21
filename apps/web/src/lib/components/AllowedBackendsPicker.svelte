<script lang="ts">
	import { onMount } from 'svelte';
	import { api, type Backend } from '$lib/api.js';

	interface Props {
		restrict: boolean;
		selectedIds: string[];
	}

	let { restrict = $bindable(false), selectedIds = $bindable([]) }: Props = $props();

	let backends = $state<Backend[]>([]);
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	const enabledBackends = $derived(backends.filter((b) => b.enabled));

	onMount(async () => {
		try {
			backends = await api.getBackends();
		} catch (err) {
			loadError = err instanceof Error ? err.message : 'Failed to load backends';
		} finally {
			loading = false;
		}
	});

	const mode = $derived(!restrict ? 'all' : selectedIds.length > 0 ? 'specific' : 'none');

	function setMode(m: 'all' | 'specific' | 'none') {
		if (m === 'all') {
			restrict = false;
			selectedIds = [];
		} else if (m === 'specific') {
			restrict = true;
			if (selectedIds.length === 0) {
				selectedIds = enabledBackends.map((b) => b.id);
			}
		} else {
			restrict = true;
			selectedIds = [];
		}
	}

	function toggleBackend(backendId: string) {
		if (selectedIds.includes(backendId)) {
			selectedIds = selectedIds.filter((id) => id !== backendId);
		} else {
			selectedIds = [...selectedIds, backendId];
		}
	}
</script>

<div class="space-y-2">
	<div class="flex items-center justify-between">
		<span class="text-xs font-medium text-gray-300">Pass-through backends</span>
		{#if !loading && !loadError && enabledBackends.length > 0}
			<div class="flex rounded-md overflow-hidden border border-gray-700 text-xs">
				<button
					type="button"
					onclick={() => setMode('all')}
					class="px-3 py-1 transition-colors"
					class:bg-gray-700={mode === 'all'}
					class:text-white={mode === 'all'}
					class:bg-transparent={mode !== 'all'}
					class:text-gray-400={mode !== 'all'}
					class:hover:text-gray-200={mode !== 'all'}
				>All</button>
				<button
					type="button"
					onclick={() => setMode('specific')}
					class="px-3 py-1 transition-colors border-l border-gray-700"
					class:bg-gray-700={mode === 'specific'}
					class:text-white={mode === 'specific'}
					class:bg-transparent={mode !== 'specific'}
					class:text-gray-400={mode !== 'specific'}
					class:hover:text-gray-200={mode !== 'specific'}
				>Specific</button>
				<button
					type="button"
					onclick={() => setMode('none')}
					class="px-3 py-1 transition-colors border-l border-gray-700"
					class:bg-gray-700={mode === 'none'}
					class:text-white={mode === 'none'}
					class:bg-transparent={mode !== 'none'}
					class:text-gray-400={mode !== 'none'}
					class:hover:text-gray-200={mode !== 'none'}
				>None</button>
			</div>
		{/if}
	</div>

	{#if loading}
		<p class="text-xs text-gray-500">Loading…</p>
	{:else if loadError}
		<p class="text-xs text-red-400">{loadError}</p>
	{:else if enabledBackends.length === 0}
		<p class="text-xs text-gray-500">
			No backends configured. <a href="/backends/new" class="text-cyan-400 hover:text-cyan-300">Add one →</a>
		</p>
	{:else if mode === 'all'}
		<p class="text-xs text-gray-500">This key can see models from all {enabledBackends.length} backend{enabledBackends.length === 1 ? '' : 's'}.</p>
	{:else if mode === 'specific'}
		<div class="space-y-1.5 rounded-lg border border-gray-700 bg-gray-950/50 p-3">
			{#each enabledBackends as backend (backend.id)}
				<label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
					<input
						type="checkbox"
						class="checkbox"
						checked={selectedIds.includes(backend.id)}
						onchange={() => toggleBackend(backend.id)}
					/>
					<span class="font-medium text-gray-200">{backend.name}</span>
					<span class="text-gray-500 text-xs">— {backend.host} · {backend.provider}</span>
				</label>
			{/each}
		</div>
	{:else}
		<p class="text-xs text-gray-500/80">No pass-through backends — direct backend models won't be visible to this key.</p>
	{/if}
</div>
