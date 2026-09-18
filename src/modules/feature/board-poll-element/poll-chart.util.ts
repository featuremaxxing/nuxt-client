// Pure geometry functions for the four poll chart types (horizontal bar, column, donut, stacked
// bar). No DOM access anywhere in this file - PollChart.vue turns the plain data below into
// actual <svg> markup, and svg-to-png.util.ts rasterizes that markup for export. Keeping this
// file DOM-free is what makes it possible to unit-test the chart math directly (see
// poll-chart.util.unit.ts) without mounting anything.

export interface ChartDatum {
	label: string;
	value: number;
}

export interface ChartDimensions {
	width: number;
	height: number;
}

export interface HorizontalBarGeometry {
	label: string;
	value: number;
	percent: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ColumnGeometry {
	label: string;
	value: number;
	percent: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DonutSegmentGeometry {
	label: string;
	value: number;
	percent: number;
	pathD: string;
}

export interface StackedSegmentGeometry {
	label: string;
	value: number;
	percent: number;
	x: number;
	width: number;
}

const DEFAULT_PADDING = 8;

export const totalOf = (data: ChartDatum[]): number => data.reduce((sum, datum) => sum + datum.value, 0);

export const percentOf = (value: number, total: number): number => (total > 0 ? (value / total) * 100 : 0);

/**
 * Horizontal bars, one row per datum, stacked top to bottom. Bar length is proportional to the
 * datum's share of the largest value (not the total) so a single-option question still renders a
 * full-width bar instead of a razor-thin sliver.
 */
export const computeHorizontalBars = (
	data: ChartDatum[],
	dimensions: ChartDimensions,
	padding = DEFAULT_PADDING
): HorizontalBarGeometry[] => {
	const total = totalOf(data);
	const maxValue = Math.max(...data.map((datum) => datum.value), 0);
	const rowCount = data.length || 1;
	const availableHeight = Math.max(dimensions.height - padding * 2, 0);
	const rowHeight = availableHeight / rowCount;
	const barHeight = Math.max(rowHeight - padding, 1);
	const maxBarWidth = Math.max(dimensions.width - padding * 2, 0);

	return data.map((datum, index) => {
		const width = maxValue > 0 ? (datum.value / maxValue) * maxBarWidth : 0;
		return {
			label: datum.label,
			value: datum.value,
			percent: percentOf(datum.value, total),
			x: padding,
			y: padding + index * rowHeight + (rowHeight - barHeight) / 2,
			width,
			height: barHeight,
		};
	});
};

/**
 * Vertical columns, one per datum, left to right. Mirrors computeHorizontalBars but height-driven
 * instead of width-driven, with the baseline at the bottom of the drawing area.
 */
export const computeColumns = (
	data: ChartDatum[],
	dimensions: ChartDimensions,
	padding = DEFAULT_PADDING
): ColumnGeometry[] => {
	const total = totalOf(data);
	const maxValue = Math.max(...data.map((datum) => datum.value), 0);
	const columnCount = data.length || 1;
	const availableWidth = Math.max(dimensions.width - padding * 2, 0);
	const columnSlot = availableWidth / columnCount;
	const columnWidth = Math.max(columnSlot - padding, 1);
	const maxColumnHeight = Math.max(dimensions.height - padding * 2, 0);

	return data.map((datum, index) => {
		const height = maxValue > 0 ? (datum.value / maxValue) * maxColumnHeight : 0;
		return {
			label: datum.label,
			value: datum.value,
			percent: percentOf(datum.value, total),
			x: padding + index * columnSlot + (columnSlot - columnWidth) / 2,
			y: padding + (maxColumnHeight - height),
			width: columnWidth,
			height,
		};
	});
};

const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
	const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
	return {
		x: cx + r * Math.cos(angleInRadians),
		y: cy + r * Math.sin(angleInRadians),
	};
};

const donutArcPath = (cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) => {
	// A full circle can't be drawn as a single arc (start === end), so clamp just shy of 360°.
	const clampedEnd = endAngle - startAngle >= 360 ? startAngle + 359.999 : endAngle;
	const largeArcFlag = clampedEnd - startAngle > 180 ? 1 : 0;

	const outerStart = polarToCartesian(cx, cy, outerR, clampedEnd);
	const outerEnd = polarToCartesian(cx, cy, outerR, startAngle);
	const innerStart = polarToCartesian(cx, cy, innerR, startAngle);
	const innerEnd = polarToCartesian(cx, cy, innerR, clampedEnd);

	return [
		`M ${outerStart.x} ${outerStart.y}`,
		`A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
		`L ${innerStart.x} ${innerStart.y}`,
		`A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${innerEnd.x} ${innerEnd.y}`,
		"Z",
	].join(" ");
};

/**
 * Donut arc segments as SVG path `d` strings, one per datum, going clockwise from 12 o'clock.
 * With zero total votes, returns an empty array rather than a degenerate full circle - callers
 * should render an empty-state instead.
 */
export const computeDonutSegments = (
	data: ChartDatum[],
	dimensions: ChartDimensions,
	options: { innerRadiusRatio?: number } = {}
): DonutSegmentGeometry[] => {
	const total = totalOf(data);
	if (total <= 0) return [];

	const cx = dimensions.width / 2;
	const cy = dimensions.height / 2;
	const outerR = Math.min(dimensions.width, dimensions.height) / 2 - DEFAULT_PADDING;
	const innerR = outerR * (options.innerRadiusRatio ?? 0.55);

	let angle = 0;
	return data
		.filter((datum) => datum.value > 0)
		.map((datum) => {
			const percent = percentOf(datum.value, total);
			const sweep = (datum.value / total) * 360;
			const startAngle = angle;
			const endAngle = angle + sweep;
			angle = endAngle;

			return {
				label: datum.label,
				value: datum.value,
				percent,
				pathD: donutArcPath(cx, cy, outerR, innerR, startAngle, endAngle),
			};
		});
};

/**
 * Segment offsets for a single stacked horizontal bar spanning the full width. Segments with 0
 * votes still get a geometry entry (0 width) so callers can keep a stable legend order.
 */
export const computeStackedSegments = (
	data: ChartDatum[],
	dimensions: ChartDimensions,
	padding = DEFAULT_PADDING
): StackedSegmentGeometry[] => {
	const total = totalOf(data);
	const maxBarWidth = Math.max(dimensions.width - padding * 2, 0);

	let offset = padding;
	return data.map((datum) => {
		const percent = percentOf(datum.value, total);
		const width = total > 0 ? (datum.value / total) * maxBarWidth : 0;
		const segment: StackedSegmentGeometry = {
			label: datum.label,
			value: datum.value,
			percent,
			x: offset,
			width,
		};
		offset += width;
		return segment;
	});
};
