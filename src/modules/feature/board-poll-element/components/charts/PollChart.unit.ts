import PollChart from "./PollChart.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

describe("PollChart", () => {
	const setupWrapper = (data: { label: string; value: number }[], chartType: "bar" | "column" | "donut" | "stacked") => {
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

		expect(wrapper.findAll("path")).toHaveLength(2);
	});

	it("renders a column per option for the column chart type", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 1 },
				{ label: "B", value: 2 },
			],
			"column"
		);

		expect(wrapper.findAll("rect")).toHaveLength(2);
	});

	it("renders one stacked segment per option, including zero-vote options", () => {
		const { wrapper } = setupWrapper(
			[
				{ label: "A", value: 0 },
				{ label: "B", value: 5 },
			],
			"stacked"
		);

		expect(wrapper.findAll("rect")).toHaveLength(2);
	});
});
