<script lang="ts">
	import {
		healthBadgeClass,
		type BackendHealthEntry,
		type BackendHealthLevel
	} from '$lib/backend-health.js';

	interface Props {
		level: BackendHealthLevel;
		summary: string;
		backends: BackendHealthEntry[];
	}

	let { level, summary, backends }: Props = $props();

	let open = $state(false);

	function toggleTooltip() {
		open = !open;
	}

	function closeTooltip() {
		open = false;
	}
</script>

<svelte:window onclick={closeTooltip} />

<div class="relative inline-flex items-center">
	<button
		type="button"
		class={`health-dot health-dot--${level}`}
		aria-label={summary}
		aria-expanded={open}
		onclick={(event) => {
			event.stopPropagation();
			toggleTooltip();
		}}
	></button>

	{#if open}
		<div class={`health-tooltip health-tooltip--${level}`} role="tooltip">
			<div class="health-tooltip__header">
				<span class={`health-tooltip__icon health-tooltip__icon--${level}`} aria-hidden="true"></span>
				<span class="health-tooltip__title">{summary}</span>
			</div>

			{#if backends.length > 0}
				<ul class="health-tooltip__list">
					{#each backends as backend (backend.name)}
						<li class="health-tooltip__row">
							<span class="health-tooltip__name">{backend.name}</span>
							<span class={healthBadgeClass(backend.health)}>{backend.label}</span>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="health-tooltip__empty">No enabled backends configured</p>
			{/if}
		</div>
	{/if}
</div>
