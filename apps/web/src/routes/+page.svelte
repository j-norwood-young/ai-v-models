<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { sse } from '$lib/sse.svelte.js';
	import type { MetricsSummary, MetricsRollup } from '$lib/api.js';

	let summary = $state<MetricsSummary | null>(null);
	let rollups = $state<MetricsRollup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function load() {
		try {
			[summary, rollups] = await Promise.all([
				api.getMetricsSummary(),
				api.getMetricsRollups({ period: 'hour', limit: 24 })
			]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load metrics';
		} finally {
			loading = false;
		}
	}

	const maxRequests = $derived(
		rollups.length > 0 ? Math.max(...rollups.map((r) => r.requests), 1) : 1
	);

	$effect(() => {
		if (sse.latestEvent?.type === 'metrics_update') {
			load();
		}
	});

	onMount(() => {
		load();
	});

	function formatNum(n: number): string {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
		return String(n);
	}

	function formatPct(n: number): string {
		return `${(n * 100).toFixed(2)}%`;
	}

	function healthColor(health: string): string {
		switch (health) {
			case 'healthy': return 'bg-green-500';
			case 'degraded': return 'bg-yellow-500';
			case 'unhealthy': return 'bg-red-500';
			default: return 'bg-gray-500';
		}
	}

	function formatTime(ts: string): string {
		return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}
</script>

<svelte:head>
	<title>Dashboard — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-100">Dashboard</h1>
		<p class="text-sm text-gray-400 mt-1">24-hour overview</p>
	</div>

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-500">Loading…</div>
	{:else if error}
		<div class="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm">
			{error}
		</div>
	{:else if summary}
		<!-- Stats Cards -->
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Requests (24h)</p>
				<p class="text-2xl font-bold text-gray-100">{formatNum(summary.total_requests_24h)}</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tokens (24h)</p>
				<p class="text-2xl font-bold text-gray-100">{formatNum(summary.total_tokens_24h)}</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Error Rate</p>
				<p class="text-2xl font-bold" class:text-red-400={summary.error_rate_24h > 0.05} class:text-gray-100={summary.error_rate_24h <= 0.05}>
					{formatPct(summary.error_rate_24h)}
				</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg TTFT</p>
				<p class="text-2xl font-bold text-gray-100">
					{summary.avg_ttft_ms != null ? `${summary.avg_ttft_ms.toFixed(0)}ms` : '—'}
				</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Avg TPS</p>
				<p class="text-2xl font-bold text-gray-100">
					{summary.avg_tps != null ? summary.avg_tps.toFixed(1) : '—'}
				</p>
			</div>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Request Volume Chart -->
			<div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-4">
				<h2 class="text-sm font-medium text-gray-300 mb-4">Request Volume (Last 24h)</h2>
				{#if rollups.length > 0}
					<div class="flex items-end gap-1 h-32">
						{#each rollups as rollup}
							{@const pct = (rollup.requests / maxRequests) * 100}
							<div class="flex-1 flex flex-col items-center gap-1 group relative">
								<div
									class="w-full bg-cyan-500/80 hover:bg-cyan-400 rounded-sm transition-colors cursor-default"
									style="height: {Math.max(pct, 2)}%"
									title="{rollup.requests} requests at {formatTime(rollup.timestamp)}"
								></div>
							</div>
						{/each}
					</div>
					<div class="flex justify-between mt-2 text-xs text-gray-500">
						<span>{formatTime(rollups[0]?.timestamp ?? '')}</span>
						<span>{formatTime(rollups[rollups.length - 1]?.timestamp ?? '')}</span>
					</div>
				{:else}
					<div class="flex items-center justify-center h-32 text-gray-600 text-sm">No data</div>
				{/if}
			</div>

			<!-- Backend Health -->
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<h2 class="text-sm font-medium text-gray-300 mb-4">Backend Health</h2>
				{#if summary.backends.length === 0}
					<p class="text-gray-500 text-sm">No backends configured</p>
				{:else}
					<div class="space-y-2">
						{#each summary.backends as backend}
							<div class="flex items-center gap-3 py-1.5">
								<span class="w-2 h-2 rounded-full flex-shrink-0 {healthColor(backend.health)}"></span>
								<span class="flex-1 text-sm text-gray-300 truncate">{backend.name}</span>
								{#if backend.latency_ms != null}
									<span class="text-xs text-gray-500">{backend.latency_ms}ms</span>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
</div>
