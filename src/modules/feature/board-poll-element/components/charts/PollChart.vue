<template>
	<svg
		v-if="hasVotes"
		:width="svgWidth"
		:height="svgHeight"
		:viewBox="`0 0 ${svgWidth} ${svgHeight}`"
		class="poll-chart-svg"
		role="img"
		:aria-label="ariaLabel"
		data-testid="poll-chart-svg"
		:data-poll-chart-element-id="elementId"
		:data-poll-chart-question-id="questionId"
	>
		<template v-if="chartType === 'bar'">
			<g v-for="(bar, index) in horizontalBars" :key="index">
				<rect
					:x="bar.x"
					:y="bar.y"
					:width="bar.width"
					:height="bar.height"
					:fill="colorAt(bar.dataIndex)"
					rx="2"
					data-testid="poll-chart-mark"
				/>
				<text :x="bar.x" :y="bar.labelY" font-family="sans-serif" font-size="10" fill="#1a1a1a">
					{{ truncatedLabel(bar.label, barLabelAvailablePx, 10) }}
					<title v-if="isTruncated(bar.label, barLabelAvailablePx, 10)">{{ bar.label }}</title>
				</text>
				<text
					:x="svgWidth - PADDING"
					:y="bar.labelY"
					font-family="sans-serif"
					font-size="10"
					fill="#1a1a1a"
					text-anchor="end"
				>
					{{ bar.value }} ({{ Math.round(bar.percent) }}%)
				</text>
			</g>
		</template>

		<template v-else-if="chartType === 'column'">
			<g v-for="(column, index) in columns" :key="index">
				<rect
					:x="column.x"
					:y="column.y"
					:width="column.width"
					:height="column.height"
					:fill="colorAt(column.dataIndex)"
					rx="2"
					data-testid="poll-chart-mark"
				/>
				<text
					:x="column.x + column.width / 2"
					:y="Math.max(column.y - 2, 10)"
					font-family="sans-serif"
					font-size="10"
					fill="#1a1a1a"
					text-anchor="middle"
				>
					{{ column.value }}
				</text>
				<text
					:x="column.x + column.width / 2"
					:y="svgHeight - 4"
					font-family="sans-serif"
					font-size="9"
					fill="#1a1a1a"
					text-anchor="middle"
				>
					{{ truncatedLabel(column.label, columnLabelAvailablePx, 9) }}
					<title v-if="isTruncated(column.label, columnLabelAvailablePx, 9)">{{ column.label }}</title>
				</text>
			</g>
		</template>

		<template v-else-if="chartType === 'donut'">
			<g v-for="(segment, index) in donutSegments" :key="index">
				<path :d="segment.pathD" :fill="colorAt(segment.dataIndex)" data-testid="poll-chart-mark" />
			</g>
			<text
				:x="donutRingDimensions.width / 2"
				:y="donutRingDimensions.height / 2"
				font-family="sans-serif"
				font-size="12"
				fill="#1a1a1a"
				text-anchor="middle"
				dominant-baseline="middle"
			>
				{{ total }}
			</text>

			<g
				v-for="(segment, index) in donutSegments"
				:key="`legend-${index}`"
				:transform="`translate(${donutLegendX}, ${DONUT_LEGEND_ROW_HEIGHT * index + PADDING})`"
			>
				<rect width="10" height="10" :fill="colorAt(segment.dataIndex)" rx="2" data-testid="poll-chart-legend-swatch" />
				<text x="16" y="9" font-family="sans-serif" font-size="10" fill="#1a1a1a">
					{{ truncatedLabel(segment.label, donutLegendLabelAvailablePx, 10) }} ({{ segment.value }})
					<title v-if="isTruncated(segment.label, donutLegendLabelAvailablePx, 10)">{{ segment.label }}</title>
				</text>
			</g>
		</template>

		<template v-else>
			<g v-for="(segment, index) in stackedSegments" :key="index">
				<rect
					:x="segment.x"
					:y="stackedY"
					:width="segment.width"
					:height="stackedHeight"
					:fill="colorAt(segment.dataIndex)"
					data-testid="poll-chart-mark"
				/>
				<text
					v-if="segment.width >= STACKED_MIN_TEXT_WIDTH"
					:x="segment.x + segment.width / 2"
					:y="stackedY + stackedHeight / 2"
					font-family="sans-serif"
					font-size="10"
					fill="#ffffff"
					text-anchor="middle"
					dominant-baseline="middle"
				>
					{{ Math.round(segment.percent) }}%
				</text>
			</g>

			<g
				v-for="(segment, index) in stackedSegments"
				:key="`legend-${index}`"
				:transform="`translate(${stackedLegendItemX(index)}, ${stackedLegendItemY(index)})`"
			>
				<rect width="10" height="10" :fill="colorAt(segment.dataIndex)" rx="2" data-testid="poll-chart-legend-swatch" />
				<text x="16" y="9" font-family="sans-serif" font-size="10" fill="#1a1a1a">
					{{ truncatedLabel(segment.label, STACKED_LEGEND_ITEM_WIDTH - 16, 10) }}
					<title v-if="isTruncated(segment.label, STACKED_LEGEND_ITEM_WIDTH - 16, 10)">{{ segment.label }}</title>
				</text>
			</g>
		</template>
	</svg>

	<p v-else class="poll-chart-empty" data-testid="poll-chart-empty">
		{{ t("components.cardElement.pollElement.emptyResults") }}
	</p>
</template>

<script setup lang="ts">
import {
	ChartDatum,
	computeColumns,
	computeDonutSegments,
	computeHorizontalBars,
	computeStackedSegments,
	totalOf,
	truncateLabel,
} from "../../poll-chart.util";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Fixed categorical palette as concrete hex values (NOT CSS custom properties / rgb(var(--v-theme-...))):
// the rendered <svg> is later serialized outside the DOM's live style context by svg-to-png.util.ts
// for the PDF/PNG export, where CSS variables resolve to empty strings. font-family is likewise set
// to a generic "sans-serif" everywhere below so rasterization never waits on a webfont to load.
const PALETTE = ["#1857a4", "#2a9d8f", "#e9c46a", "#e76f51", "#8e44ad", "#457b9d", "#f4a261", "#2b9348"];

const PADDING = 8;
const DONUT_LEGEND_WIDTH = 120;
const DONUT_LEGEND_ROW_HEIGHT = 16;
const STACKED_MIN_TEXT_WIDTH = 28;
const STACKED_LEGEND_ITEM_WIDTH = 110;
const STACKED_LEGEND_ROW_HEIGHT = 16;

const props = withDefaults(
	defineProps<{
		data: ChartDatum[];
		chartType: "bar" | "column" | "donut" | "stacked";
		width?: number;
		height?: number;
		elementId?: string;
		questionId?: string;
	}>(),
	{
		width: 320,
		height: 180,
		elementId: undefined,
		questionId: undefined,
	}
);

const { t } = useI18n();

// The ring itself always stays a fixed square based on `height`; the donut legend is drawn to
// its right within a wider overall SVG, so the ring's geometry never has to know about the
// legend's width.
const donutRingDimensions = computed(() => ({ width: props.height, height: props.height }));

const svgWidth = computed(() => (props.chartType === "donut" ? props.height + DONUT_LEGEND_WIDTH : props.width));
const svgHeight = computed(() => props.height);

const total = computed(() => totalOf(props.data));
const hasVotes = computed(() => total.value > 0);

const colorAt = (dataIndex: number) => PALETTE[dataIndex % PALETTE.length];

const truncatedLabel = (label: string, availablePx: number, fontSizePx: number) =>
	truncateLabel(label, availablePx, fontSizePx);
const isTruncated = (label: string, availablePx: number, fontSizePx: number) =>
	truncateLabel(label, availablePx, fontSizePx) !== label;

const horizontalBars = computed(() => computeHorizontalBars(props.data, { width: props.width, height: props.height }));
const barLabelAvailablePx = computed(() => Math.max(props.width - PADDING * 2 - 60, 10));

const columns = computed(() => computeColumns(props.data, { width: props.width, height: props.height }, PADDING));
const columnLabelAvailablePx = computed(() => {
	const count = props.data.length || 1;
	return Math.max((props.width - PADDING * 2) / count, 10);
});

const donutSegments = computed(() => computeDonutSegments(props.data, donutRingDimensions.value));
const donutLegendX = computed(() => donutRingDimensions.value.width + PADDING);
const donutLegendLabelAvailablePx = computed(() => Math.max(DONUT_LEGEND_WIDTH - 16 - PADDING, 10));

const stackedSegments = computed(() =>
	computeStackedSegments(props.data, { width: props.width, height: props.height })
);

const stackedHeight = computed(() => Math.min(48, props.height / 2));
const stackedY = computed(() => PADDING);

const stackedLegendColumns = computed(() => Math.max(Math.floor(props.width / STACKED_LEGEND_ITEM_WIDTH), 1));
const stackedLegendItemX = (index: number) => (index % stackedLegendColumns.value) * STACKED_LEGEND_ITEM_WIDTH;
const stackedLegendItemY = (index: number) =>
	stackedY.value +
	stackedHeight.value +
	PADDING +
	Math.floor(index / stackedLegendColumns.value) * STACKED_LEGEND_ROW_HEIGHT;

const ariaLabel = computed(() => props.data.map((datum) => `${datum.label}: ${datum.value}`).join(", "));
</script>

<style scoped lang="scss">
// The svg keeps its `width`/`height` attributes at the logical geometry size (read by
// svg-to-png.util.ts via `svg.width.baseVal.value` for PDF export rasterization); CSS-only
// scaling here lets the browser shrink the displayed size to fit a narrow card without
// clipping the right-aligned value/percent text, while `viewBox` keeps everything proportional.
.poll-chart-svg {
	display: block;
	max-width: 100%;
	height: auto;
}

.poll-chart-empty {
	font-style: italic;
	opacity: 0.7;
}
</style>
