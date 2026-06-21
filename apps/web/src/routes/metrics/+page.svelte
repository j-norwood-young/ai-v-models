<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '$lib/api.js';
	import { sse } from '$lib/sse.svelte.js';
	import type { MetricsSummary, MetricsRollup } from '$lib/api.js';

	let summary = $state<MetricsSummary | null>(null);
	let rollups = $state<MetricsRollup[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let period = $state<'hour' | 'day' | 'week' | 'month'>('hour');

	async function load() {
		loading = true;
		error = null;
		try {
			[summary, rollups] = await Promise.all([
				api.getMetricsSummary(),
				api.getMetricsRollups({ period, limit: 48 })
			]);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load metrics';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		// Re-load whenever period changes or SSE emits a metrics update.
		// Reading both here makes Svelte track both as dependencies.
		const _period = period;
		const ev = sse.latestEvent;
		if (ev?.type === 'metrics_update' || _period) {
			load();
		}
	});

	const maxRequests = $derived(
		rollups.length > 0 ? Math.max(...rollups.map((r) => r.requests), 1) : 1
	);
	const maxTokens = $derived(
		rollups.length > 0 ? Math.max(...rollups.map((r) => r.tokens), 1) : 1
	);

	function formatNum(n: number): string {
		if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
		if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
		return String(n);
	}

	function formatPct(n: number): string {
		return `${(n * 100).toFixed(2)}%`;
	}

	function formatTime(ts: string): string {
		const d = new Date(ts);
		if (period === 'hour') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		if (period === 'day') return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	// onMount handled by $effect above which runs on mount
</script>

<svelte:head>
	<title>Metrics — ai-v-models</title>
</svelte:head>

<div class="p-6 max-w-7xl mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-100">Metrics</h1>
			<p class="text-sm text-gray-400 mt-1">Usage statistics and performance data</p>
		</div>
		<div class="flex items-center gap-2">
			{#each (['hour', 'day', 'week', 'month'] as const) as p}
				<button
					onclick={() => (period = p)}
					class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize"
					class:bg-cyan-500={period === p}
					class:text-white={period === p}
					class:bg-gray-800={period !== p}
					class:text-gray-400={period !== p}
					class:hover:bg-gray-700={period !== p}
				>
					{p}
				</button>
			{/each}
		</div>
	</div>

	{#if error}
		<div class="rounded-lg bg-red-900/30 border border-red-800 px-4 py-3 text-red-400 text-sm mb-4">{error}</div>
	{/if}

	{#if loading}
		<div class="flex items-center justify-center py-20 text-gray-500">Loading…</div>
	{:else if summary}
		<!-- Summary Cards -->
		<div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Requests</p>
				<p class="text-2xl font-bold text-gray-100">{formatNum(summary.total_requests_24h)}</p>
				<p class="text-xs text-gray-500 mt-1">24 hours</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Tokens</p>
				<p class="text-2xl font-bold text-gray-100">{formatNum(summary.total_tokens_24h)}</p>
				<p class="text-xs text-gray-500 mt-1">24 hours</p>
			</div>
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<p class="text-xs text-gray-400 uppercase tracking-wider mb-1">Error Rate</p>
				<p class="text-2xl font-bold" class:text-red-400={summary.error_rate_24h > 0.05} class:text-gray-100={summary.error_rate_24h <= 0.05}>
					{formatPct(summary.error_rate_24h)}
				</p>
				<p class="text-xs text-gray-500 mt-1">24 hours</p>
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

		<!-- Charts -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<!-- Requests Chart -->
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<h2 class="text-sm font-medium text-gray-300 mb-4">Requests Over Time</h2>
				{#if rollups.length > 0}
					<div class="flex items-end gap-0.5 h-36">
						{#each rollups as rollup}
							{@const pct = (rollup.requests / maxRequests) * 100}
							<div
								class="flex-1 bg-cyan-500/70 hover:bg-cyan-400 rounded-t-sm transition-colors cursor-default"
								style="height: {Math.max(pct, 1)}%"
								title="{rollup.requests} requests — {formatTime(rollup.timestamp)}"
							></div>
						{/each}
					</div>
					<div class="flex justify-between mt-2 text-xs text-gray-500">
						<span>{formatTime(rollups[0]?.timestamp ?? '')}</span>
						<span>{formatTime(rollups[rollups.length - 1]?.timestamp ?? '')}</span>
					</div>
				{:else}
					<div class="flex items-center justify-center h-36 text-gray-600 text-sm">No data</div>
				{/if}
			</div>

			<!-- Tokens Chart -->
			<div class="bg-gray-900 border border-gray-800 rounded-xl p-4">
				<h2 class="text-sm font-medium text-gray-300 mb-4">Tokens Over Time</h2>
				{#if rollups.length > 0}
					<div class="flex items-end gap-0.5 h-36">
						{#each rollups as rollup}
							{@const pct = (rollup.tokens / maxTokens) * 100}
							<div
								class="flex-1 bg-violet-500/70 hover:bg-violet-400 rounded-t-sm transition-colors cursor-default"
								style="height: {Math.max(pct, 1)}%"
								title="{formatNum(rollup.tokens)} tokens — {formatTime(rollup.timestamp)}"
							></div>
						{/each}
					</div>
					<div class="flex justify-between mt-2 text-xs text-gray-500">
						<span>{formatTime(rollups[0]?.timestamp ?? '')}</span>
						<span>{formatTime(rollups[rollups.length - 1]?.timestamp ?? '')}</span>
					</div>
				{:else}
					<div class="flex items-center justify-center h-36 text-gray-600 text-sm">No data</div>
				{/if}
			</div>
		</div>

		<!-- Backend Health Table -->
		<div class="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
			<div class="px-4 py-3 border-b border-gray-800">
				<h2 class="text-sm font-medium text-gray-300">Backend Status</h2>
			</div>
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-gray-800">
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Backend</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Health</th>
						<th class="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Latency</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each summary.backends as b (b.id)}
						<tr class="hover:bg-gray-800/40 transition-colors">
							<td class="px-4 py-3 text-gray-200">{b.name}</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<span class="w-2 h-2 rounded-full {b.health === 'healthy' ? 'bg-green-500' : b.health === 'degraded' ? 'bg-yellow-500' : b.health === 'unhealthy' ? 'bg-red-500' : 'bg-gray-500'}"></span>
									<span class="text-gray-400 capitalize">{b.health}</span>
								</div>
							</td>
							<td class="px-4 py-3 text-gray-400">
								{b.latency_ms != null ? `${b.latency_ms}ms` : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-4 text-right">
			<a
				href="/api/v1/metrics"
				target="_blank"
				class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
			>
				View Prometheus metrics →
			</a>
		</div>
	{/if}
</div>
