<template>
	<div class="progress-bar" data-testid="progress-bar">
		<VProgressLinear
			:model-value="percent"
			height="8"
			rounded
			color="success"
			bg-color="surface-variant"
			data-testid="progress-bar-linear"
		/>
		<p v-if="label" class="text-caption mt-1 mb-0" data-testid="progress-bar-label">{{ label }}</p>
	</div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
	done: number;
	total: number;
	label?: string;
}>();

const percent = computed(() => (props.total > 0 ? (props.done / props.total) * 100 : 0));
</script>
