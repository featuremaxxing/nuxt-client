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

export interface Padding {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export type PaddingInput = number | Partial<Padding>;

export interface HorizontalBarGeometry {
	label: string;
	value: number;
	percent: number;
	dataIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
	labelY: number;
}

export interface ColumnGeometry {
	label: string;
	value: number;
	percent: number;
	dataIndex: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface DonutSegmentGeometry {
	label: string;
	value: number;
	percent: number;
	dataIndex: number;
	pathD: string;
}

export interface StackedSegmentGeometry {
	label: string;
	value: number;
	percent: number;
	dataIndex: number;
	x: number;
	width: number;
}

const DEFAULT_PADDING = 8;

/**
 * Normalizes the padding argument accepted by the geometry functions below: either a single
 * number applied to all four sides (kept for backward compatibility with existing callers), or a
 * partial per-side object where any side left unspecified falls back to `DEFAULT_PADDING`.
 */
export const resolvePadding = (padding: PaddingInput = DEFAULT_PADDING): Padding => {
	if (typeof padding === "number") {
		return { top: padding, right: padding, bottom: padding, left: padding };
	}
	return {
		top: padding.top ?? DEFAULT_PADDING,
		right: padding.right ?? DEFAULT_PADDING,
		bottom: padding.bottom ?? DEFAULT_PADDING,
		left: padding.left ?? DEFAULT_PADDING,
	};
};

/**
 * Truncates `text` with a trailing ellipsis so it roughly fits within `availablePx`, using a
 * simple average-glyph-width heuristic (no DOM/canvas access, so this stays usable both in the
 * util's own tests and inside the rasterized SVG export path). Not pixel-perfect by design - just
 * good enough that labels stop overflowing their allotted space.
 */
export const truncateLabel = (text: string, availablePx: number, fontSizePx: number): string => {
	const averageGlyphWidth = fontSizePx * 0.55;
	if (averageGlyphWidth <= 0) return text;

	const maxChars = Math.floor(availablePx / averageGlyphWidth);
	if (maxChars <= 0) return "";
	if (text.length <= maxChars) return text;
	if (maxChars === 1) return "…";

	return `${text.slice(0, maxChars - 1)}…`;
};

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
	padding: PaddingInput = DEFAULT_PADDING,
	labelHeight = 12
): HorizontalBarGeometry[] => {
	const { top, right, bottom, left } = resolvePadding(padding);
	const total = totalOf(data);
	const maxValue = Math.max(...data.map((datum) => datum.value), 0);
	const rowCount = data.length || 1;
	const availableHeight = Math.max(dimensions.height - top - bottom, 0);
	const rowHeight = availableHeight / rowCount;
	const barHeight = Math.max(rowHeight - labelHeight, 1);
	const maxBarWidth = Math.max(dimensions.width - left - right, 0);

	return data.map((datum, index) => {
		const width = maxValue > 0 ? (datum.value / maxValue) * maxBarWidth : 0;
		const rowTop = top + index * rowHeight;
		const barY = rowTop + labelHeight;
		return {
			label: datum.label,
			value: datum.value,
			percent: percentOf(datum.value, total),
			dataIndex: index,
			x: left,
			y: barY,
			width,
			height: barHeight,
			labelY: rowTop + labelHeight - 2,
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
	padding: PaddingInput = DEFAULT_PADDING
): ColumnGeometry[] => {
	const { top, right, bottom, left } = resolvePadding(padding);
	const total = totalOf(data);
	const maxValue = Math.max(...data.map((datum) => datum.value), 0);
	const columnCount = data.length || 1;
	const availableWidth = Math.max(dimensions.width - left - right, 0);
	const columnSlot = availableWidth / columnCount;
	const columnWidth = Math.max(columnSlot - left, 1);
	const maxColumnHeight = Math.max(dimensions.height - top - bottom, 0);

	return data.map((datum, index) => {
		const height = maxValue > 0 ? (datum.value / maxValue) * maxColumnHeight : 0;
		return {
			label: datum.label,
			value: datum.value,
			percent: percentOf(datum.value, total),
			dataIndex: index,
			x: left + index * columnSlot + (columnSlot - columnWidth) / 2,
			y: top + (maxColumnHeight - height),
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
		.map((datum, dataIndex) => ({ datum, dataIndex }))
		.filter(({ datum }) => datum.value > 0)
		.map(({ datum, dataIndex }) => {
			const percent = percentOf(datum.value, total);
			const sweep = (datum.value / total) * 360;
			const startAngle = angle;
			const endAngle = angle + sweep;
			angle = endAngle;

			return {
				label: datum.label,
				value: datum.value,
				percent,
				dataIndex,
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
	padding: PaddingInput = DEFAULT_PADDING
): StackedSegmentGeometry[] => {
	const { right, left } = resolvePadding(padding);
	const total = totalOf(data);
	const maxBarWidth = Math.max(dimensions.width - left - right, 0);

	let offset = left;
	return data.map((datum, dataIndex) => {
		const percent = percentOf(datum.value, total);
		const width = total > 0 ? (datum.value / total) * maxBarWidth : 0;
		const segment: StackedSegmentGeometry = {
			label: datum.label,
			value: datum.value,
			percent,
			dataIndex,
			x: offset,
			width,
		};
		offset += width;
		return segment;
	});
};
