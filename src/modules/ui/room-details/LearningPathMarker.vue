<template>
	<svg
		viewBox="0 0 16 16"
		:width="size"
		:height="size"
		class="lp-marker"
		:role="label ? 'img' : undefined"
		:aria-label="label || undefined"
		:aria-hidden="label ? undefined : 'true'"
		:data-shape="shape"
		data-testid="learning-path-marker"
	>
		<g
			:fill="fill"
			stroke="rgb(var(--v-theme-on-surface))"
			stroke-opacity="0.55"
			stroke-width="1"
			stroke-linejoin="round"
		>
			<circle v-if="shape === 'circle'" cx="8" cy="8" r="6.5" />
			<rect v-else-if="shape === 'square'" x="2" y="2" width="12" height="12" rx="1" />
			<polygon v-else-if="shape === 'triangle'" points="8,1.5 14.5,13.5 1.5,13.5" />
			<polygon v-else-if="shape === 'diamond'" points="8,1 15,8 8,15 1,8" />
			<polygon v-else-if="shape === 'hexagon'" points="4.5,2 11.5,2 15,8 11.5,14 4.5,14 1,8" />
			<polygon v-else-if="shape === 'pentagon'" points="8,1.5 14.5,6.2 12,14 4,14 1.5,6.2" />
			<polygon v-else-if="shape === 'triangle-down'" points="1.5,2.5 14.5,2.5 8,14.5" />
			<polygon
				v-else
				points="5.5,1.5 10.5,1.5 10.5,5.5 14.5,5.5 14.5,10.5 10.5,10.5 10.5,14.5 5.5,14.5 5.5,10.5 1.5,10.5 1.5,5.5 5.5,5.5"
			/>
		</g>
	</svg>
</template>

<script setup lang="ts">
import { LearningPathColor, learningPathColorValue, learningPathShape } from "@data-board-learning-path";
import { computed, PropType } from "vue";

// The color of a learning path as a small shape. Each color has its own shape, so the color is
// never the only hint. Pass a label when the shape is not next to the name of the color.
const props = defineProps({
	color: { type: String as PropType<LearningPathColor>, default: undefined },
	size: { type: Number, default: 16 },
	label: { type: String, default: "" },
});

const shape = computed(() => learningPathShape(props.color));
const fill = computed(() => learningPathColorValue(props.color));
</script>

<style scoped>
.lp-marker {
	flex: none;
	display: inline-block;
}
</style>
