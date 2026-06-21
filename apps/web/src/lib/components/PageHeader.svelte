<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title: string;
		subtitle?: string;
		parentHref?: string;
		parentLabel?: string;
		actions?: Snippet;
	}

	let { title, subtitle, parentHref, parentLabel, actions }: Props = $props();
</script>

<div class="flex items-center justify-between mb-6">
	<div>
		{#if parentHref && parentLabel}
			<div class="flex items-center gap-3 mb-1">
				<a href={parentHref} class="text-sm text-gray-400 hover:text-gray-100 transition-colors">
					← {parentLabel}
				</a>
			</div>
		{/if}
		<h1 class="text-2xl font-bold text-gray-100">{title}</h1>
		{#if subtitle}
			<p class="text-sm text-gray-400 mt-1">{subtitle}</p>
		{/if}
	</div>
	{#if actions}
		<div class="flex gap-2">
			{@render actions()}
		</div>
	{/if}
</div>
