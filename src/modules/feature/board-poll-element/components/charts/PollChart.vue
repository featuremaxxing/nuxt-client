<template>
	<svg
		v-if="hasVotes"
		:width="dimensions.width"
		:height="dimensions.height"
		:viewBox="`0 0 ${dimensions.width} ${dimensions.height}`"
		role="img"
		:aria-label="ariaLabel"
		data-testid="poll-chart-svg"
	>
		<template v-if="chartType === 'bar'">
			<g v-for="(bar, index) in horizontalBars" :key="bar.label">
				<rect
					:x="bar.x"
					:y="bar.y"
					:width="bar.width"
					:height="bar.height"
					:fill="colorAt(index)"
					rx="2"
				/>
				<text :x="bar.x" :y="bar.y - 2" font-family="sans-serif" font-size="10" fill="#1a1a1a">
					{{ bar.label }} ({{ bar.value }})
				</text>
			</g>
		</template>

		<template v-else-if="chartType === 'column'">
			<g v-for="(column, index) in columns" :key="column.label">
				<rect
					:x="column.x"
					:y="column.y"
					:width="column.width"
					:height="column.height"
					:fill="colorAt(index)"
					rx="2"
				/>
				<text
					:x="column.x + column.width / 2"
					:y="dimensions.height - 2"
					font-family="sans-serif"
					font-size="10"
					fill="#1a1a1a"
					text-anchor="middle"
				>
					{{ column.value }}
				</text>
			</g>
		</template>

		<template v-else-if="chartType === 'donut'">
			<g v-for="(segment, index) in donutSegments" :key="segment.label">
				<path :d="segment.pathD" :fill="colorAt(index)" />
			</g>
			<text
				:x="dimensions.width / 2"
				:y="dimensions.height / 2"
				font-family="sans-serif"
				font-size="12"
				fill="#1a1a1a"
				text-anchor="middle"
				dominant-baseline="middle"
			>
				{{ total }}
			</text>
		</template>

		<template v-else>
			<g v-for="(segment, index) in stackedSegments" :key="segment.label">
				<rect :x="segment.x" :y="stackedY" :width="segment.width" :height="stackedHeight" :fill="colorAt(index)" />
			</g>
		</template>
	</svg>

	<p v-else class="poll-chart-empty" data-testid="poll-chart-empty">
		{{ t("components.cardElement.pollElement.emptyResults") }}
	</p>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
	ChartDatum,
	computeColumns,
	computeDonutSegments,
	computeHorizontalBars,
	computeStackedSegments,
	totalOf,
} from "../../poll-chart.util";

// Fixed categorical palette as concrete hex values (NOT CSS custom properties / rgb(var(--v-theme-...))):
// the rendered <svg> is later serialized outside the DOM's live style context by svg-to-png.util.ts
// for the PDF/PNG export, where CSS variables resolve to empty strings. font-family is likewise set
// to a generic "sans-serif" everywhere below so rasterization never waits on a webfont to load.
const PALETTE = ["#1857a4", "#2a9d8f", "#e9c46a", "#e76f51", "#8e44ad", "#457b9d", "#f4a261", "#2b9348"];

const props = withDefaults(
	defineProps<{
		data: ChartDatum[];
		chartType: "bar" | "column" | "donut" | "stacked";
		width?: number;
		height?: number;
	}>(),
	{
		width: 320,
		height: 180,
	}
);

const { t } = useI18n();

const dimensions = computed(() => ({ width: props.width, height: props.height }));
const total = computed(() => totalOf(props.data));
const hasVotes = computed(() => total.value > 0);

const colorAt = (index: number) => PALETTE[index % PALETTE.length];

const horizontalBars = computed(() => computeHorizontalBars(props.data, dimensions.value));
const columns = computed(() => computeColumns(props.data, dimensions.value));
const donutSegments = computed(() => computeDonutSegments(props.data, dimensions.value));
const stackedSegments = computed(() => computeStackedSegments(props.data, dimensions.value));

const stackedHeight = computed(() => Math.min(48, dimensions.value.height - 16));
const stackedY = computed(() => (dimensions.value.height - stackedHeight.value) / 2);

const ariaLabel = computed(() =>
	props.data.map((datum) => `${datum.label}: ${datum.value}`).join(", ")
);
</script>

<style scoped lang="scss">
.poll-chart-empty {
	font-style: italic;
	opacity: 0.7;
}
</style>
