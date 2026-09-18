import {
	computeColumns,
	computeDonutSegments,
	computeHorizontalBars,
	computeStackedSegments,
	percentOf,
	totalOf,
} from "./poll-chart.util";

const dimensions = { width: 200, height: 100 };

describe("poll-chart.util", () => {
	describe("totalOf", () => {
		it("sums all values", () => {
			expect(totalOf([{ label: "a", value: 3 }, { label: "b", value: 5 }])).toBe(8);
		});

		it("returns 0 for an empty array", () => {
			expect(totalOf([])).toBe(0);
		});
	});

	describe("percentOf", () => {
		it("computes a percentage of the total", () => {
			expect(percentOf(5, 20)).toBe(25);
		});

		it("returns 0 when the total is 0, instead of dividing by zero", () => {
			expect(percentOf(0, 0)).toBe(0);
		});
	});

	describe("computeHorizontalBars", () => {
		it("returns a full-width bar for a single option with votes", () => {
			const [bar] = computeHorizontalBars([{ label: "Yes", value: 4 }], dimensions);

			expect(bar.percent).toBe(100);
			expect(bar.width).toBeCloseTo(dimensions.width - 8 * 2);
		});

		it("returns zero-width bars when there are zero votes", () => {
			const bars = computeHorizontalBars(
				[
					{ label: "Yes", value: 0 },
					{ label: "No", value: 0 },
				],
				dimensions
			);

			expect(bars).toHaveLength(2);
			bars.forEach((bar) => {
				expect(bar.width).toBe(0);
				expect(bar.percent).toBe(0);
			});
		});

		it("scales bar width relative to the largest value, not the total", () => {
			const bars = computeHorizontalBars(
				[
					{ label: "A", value: 10 },
					{ label: "B", value: 5 },
				],
				dimensions
			);

			expect(bars[1].width).toBeCloseTo(bars[0].width / 2);
		});

		it("handles many options without overlapping rows", () => {
			const data = Array.from({ length: 10 }, (_, i) => ({ label: `Option ${i}`, value: i + 1 }));
			const bars = computeHorizontalBars(data, dimensions);

			expect(bars).toHaveLength(10);
			for (let i = 1; i < bars.length; i++) {
				expect(bars[i].y).toBeGreaterThan(bars[i - 1].y);
			}
		});
	});

	describe("computeColumns", () => {
		it("gives the tallest column to the largest value", () => {
			const columns = computeColumns(
				[
					{ label: "A", value: 2 },
					{ label: "B", value: 8 },
				],
				dimensions
			);

			expect(columns[1].height).toBeGreaterThan(columns[0].height);
		});

		it("returns zero-height columns for zero votes", () => {
			const columns = computeColumns([{ label: "A", value: 0 }], dimensions);

			expect(columns[0].height).toBe(0);
		});
	});

	describe("computeDonutSegments", () => {
		it("returns an empty array when there are zero votes total", () => {
			expect(computeDonutSegments([{ label: "A", value: 0 }], dimensions)).toEqual([]);
		});

		it("returns a single full-circle-ish segment for one option", () => {
			const segments = computeDonutSegments([{ label: "A", value: 4 }], dimensions);

			expect(segments).toHaveLength(1);
			expect(segments[0].percent).toBe(100);
			expect(segments[0].pathD).toMatch(/^M /);
		});

		it("splits the circle proportionally across many options", () => {
			const segments = computeDonutSegments(
				[
					{ label: "A", value: 1 },
					{ label: "B", value: 1 },
					{ label: "C", value: 2 },
				],
				dimensions
			);

			expect(segments).toHaveLength(3);
			expect(segments[2].percent).toBe(50);
		});

		it("skips options with zero votes but keeps the others", () => {
			const segments = computeDonutSegments(
				[
					{ label: "A", value: 0 },
					{ label: "B", value: 5 },
				],
				dimensions
			);

			expect(segments).toHaveLength(1);
			expect(segments[0].label).toBe("B");
		});
	});

	describe("computeStackedSegments", () => {
		it("keeps a zero-width entry for every option, including zero votes, in stable order", () => {
			const segments = computeStackedSegments(
				[
					{ label: "A", value: 0 },
					{ label: "B", value: 10 },
				],
				dimensions
			);

			expect(segments).toHaveLength(2);
			expect(segments[0].width).toBe(0);
			expect(segments[1].width).toBeGreaterThan(0);
		});

		it("lays segments out left to right without gaps", () => {
			const segments = computeStackedSegments(
				[
					{ label: "A", value: 3 },
					{ label: "B", value: 7 },
				],
				dimensions
			);

			expect(segments[1].x).toBeCloseTo(segments[0].x + segments[0].width);
		});

		it("returns all zero-width segments when there are zero votes", () => {
			const segments = computeStackedSegments(
				[
					{ label: "A", value: 0 },
					{ label: "B", value: 0 },
				],
				dimensions
			);

			segments.forEach((segment) => expect(segment.width).toBe(0));
		});
	});
});
