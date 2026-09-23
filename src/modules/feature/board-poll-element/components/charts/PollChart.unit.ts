import PollChart from "./PollChart.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

describe("PollChart", () => {
	const setupWrapper = (
		data: { label: string; value: number }[],
		chartType: "bar" | "column" | "donut" | "stacked"
	) => {
		const wrapper = mount(PollChart, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: { data, chartType },
		});

		return { wrapper };
	};

	it("renders an svg for a bar chart with votes", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "Gut", value: 8 },
				{ label: "Ging so", value: 4 },
			],
			"bar"
		);

		expect(wrapper.find("[data-testid='poll-chart-svg']").exists()).toBe(true);
		expect(wrapper.find("[data-testid='poll-chart-empty']").exists()).toBe(false);
	});

	it("shows the empty state instead of an svg when there are zero votes", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "Gut", value: 0 },
				{ label: "Ging so", value: 0 },
			],
			"bar"
		);

		expect(wrapper.find("[data-testid='poll-chart-svg']").exists()).toBe(false);
		expect(wrapper.find("[data-testid='poll-chart-empty']").exists()).toBe(true);
	});

	it("renders a donut chart with one path per option with votes", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 3 },
				{ label: "B", value: 0 },
				{ label: "C", value: 7 },
			],
			"donut"
		);

		expect(wrapper.findAll('[data-testid="poll-chart-mark"]')).toHaveLength(2);
	});

	it("renders a column per option for the column chart type", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 1 },
				{ label: "B", value: 2 },
			],
			"column"
		);

		expect(wrapper.findAll('[data-testid="poll-chart-mark"]')).toHaveLength(2);
	});

	it("renders one stacked segment per option, including zero-vote options", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 0 },
				{ label: "B", value: 5 },
			],
			"stacked"
		);

		expect(wrapper.findAll('[data-testid="poll-chart-mark"]')).toHaveLength(2);
	});

	describe("labels", () => {
		it("renders the answer label for every bar, not just the value", () => {
			const { wrapper } = setupWrapper([{ label: "Ja klar", value: 4 }], "bar");

			expect(wrapper.text()).toContain("Ja klar");
			expect(wrapper.text()).toContain("4");
		});

		it("renders the answer label for every column, not just the value", () => {
			const { wrapper } = setupWrapper([{ label: "Vielleicht", value: 4 }], "column");

			expect(wrapper.text()).toContain("Vielleicht");
			expect(wrapper.text()).toContain("4");
		});

		it("renders a legend row per non-zero donut segment, matching the count of visible segments", () => {
			const { wrapper } = setupWrapper(
				[
					{ label: "A", value: 3 },
					{ label: "B", value: 0 },
					{ label: "C", value: 7 },
				],
				"donut"
			);

			expect(wrapper.findAll('[data-testid="poll-chart-legend-swatch"]')).toHaveLength(2);
			expect(wrapper.text()).toContain("A");
			expect(wrapper.text()).toContain("C");
		});

		it("renders a legend row per stacked segment so narrow segments are still identifiable", () => {
			const { wrapper } = setupWrapper(
				[
					{ label: "Sehr lange Antwortoption eins", value: 1 },
					{ label: "Sehr lange Antwortoption zwei", value: 1 },
					{ label: "Sehr lange Antwortoption drei", value: 1 },
				],
				"stacked"
			);

			expect(wrapper.findAll('[data-testid="poll-chart-legend-swatch"]')).toHaveLength(3);
		});

		it("gives a truncated label a <title> child carrying the full text", () => {
			const longLabel = "Eine extrem lange Antwortoption, die garantiert nicht in den verfügbaren Platz passt";
			const { wrapper } = setupWrapper([{ label: longLabel, value: 4 }], "bar");

			const title = wrapper.find("title");
			expect(title.exists()).toBe(true);
			expect(title.text()).toBe(longLabel);
		});
	});

	describe("dataIndex-based coloring", () => {
		it("keeps chart color and legend color in sync via dataIndex, even with a leading zero-vote entry", () => {
			const { wrapper } = setupWrapper(
				[
					{ label: "Zero", value: 0 },
					{ label: "A", value: 3 },
					{ label: "B", value: 7 },
				],
				"donut"
			);

			const marks = wrapper.findAll('[data-testid="poll-chart-mark"]');
			const swatches = wrapper.findAll('[data-testid="poll-chart-legend-swatch"]');

			expect(marks).toHaveLength(2);
			expect(swatches).toHaveLength(2);
			// dataIndex 1 ("A") and dataIndex 2 ("B") - PALETTE[1] and PALETTE[2] - must match between
			// the ring segment and its legend swatch.
			expect(marks[0].attributes("fill")).toBe(swatches[0].attributes("fill"));
			expect(marks[1].attributes("fill")).toBe(swatches[1].attributes("fill"));
		});
	});

	it("never uses a CSS custom property in a fill or style attribute (would rasterize empty for PDF export)", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 3 },
				{ label: "B", value: 7 },
			],
			"donut"
		);

		const html = wrapper.html();
		expect(html).not.toMatch(/var\(--/);
	});

	it("renders elementId and questionId as data attributes on the svg root", () => {
		const wrapper = mount(PollChart, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
			},
			props: {
				data: [{ label: "A", value: 3 }],
				chartType: "bar",
				elementId: "element-1",
				questionId: "question-1",
			},
		});

		const svg = wrapper.find('[data-testid="poll-chart-svg"]');
		expect(svg.attributes("data-poll-chart-element-id")).toBe("element-1");
		expect(svg.attributes("data-poll-chart-question-id")).toBe("question-1");
	});
});
