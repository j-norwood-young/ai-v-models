<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/api.js';
	import InfoTip from '$lib/components/InfoTip.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let name = $state('');
	let provider = $state('openai');
	let host = $state('');
	let url = $state('');
	let apiKey = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		loading = true;
		error = null;
		try {
			await api.addBackend({
				name,
				provider,
				host,
				url,
				api_key: apiKey || undefined
			});
			goto('/backends');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to add backend';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>New Backend — AiVM</title>
</svelte:head>

<div class="p-6 max-w-3xl mx-auto">
	<PageHeader
		title="New Backend"
		subtitle="Connect a new LLM backend"
		parentHref="/backends"
		parentLabel="Backends"
	/>

	<div class="bg-gray-900 border border-gray-800 rounded-xl p-5">
		<form onsubmit={handleSubmit} class="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div>
				<label class="block text-xs font-medium text-gray-400 mb-1">Name *</label>
				<input bind:value={name} required placeholder="my-backend" class="input w-full" />
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-400 mb-1">Provider *</label>
				<select bind:value={provider} class="input w-full">
					<option value="openai">OpenAI</option>
					<option value="anthropic">Anthropic</option>
					<option value="ollama">Ollama</option>
					<option value="other">Other</option>
				</select>
			</div>
			<div>
				<div class="mb-1 flex items-center gap-1.5">
					<label for="backend-host" class="text-xs font-medium text-gray-400">Host *</label>
					<InfoTip
						label="What is Host?"
						text="A short label for this backend instance (e.g. bob or my-laptop). It appears in model IDs like qwen3.5-35b:bob:lmstudio so you can tell apart the same model on different machines. This is not the network address — use Base URL for that."
					/>
				</div>
				<input id="backend-host" bind:value={host} required placeholder="my-laptop" class="input w-full" />
			</div>
			<div>
				<label class="block text-xs font-medium text-gray-400 mb-1">Base URL *</label>
				<input bind:value={url} required placeholder="http://192.168.1.100:1234" class="input w-full" />
			</div>
			<div class="sm:col-span-2">
				<label class="block text-xs font-medium text-gray-400 mb-1">API Key</label>
				<input bind:value={apiKey} type="password" placeholder="sk-…" class="input w-full" />
			</div>

			{#if error}
				<div class="sm:col-span-2 text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
					{error}
				</div>
			{/if}

			<div class="sm:col-span-2 flex gap-3">
				<button
					type="submit"
					disabled={loading}
					class="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-800 text-white font-medium rounded-lg text-sm transition-colors"
				>
					{loading ? 'Adding…' : 'Add Backend'}
				</button>
				<a
					href="/backends"
					class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-lg text-sm transition-colors"
				>
					Cancel
				</a>
			</div>
		</form>
	</div>
</div>
