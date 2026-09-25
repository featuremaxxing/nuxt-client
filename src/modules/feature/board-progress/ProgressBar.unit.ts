import ProgressBar from "./ProgressBar.vue";
import { createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";

describe("ProgressBar", () => {
	const setup = (props: { done: number; total: number; label?: string }) =>
		mount(ProgressBar, { props, global: { plugins: [createTestingVuetify()] } });

	it("shows 0% when there is nothing to do yet", () => {
		const wrapper = setup({ done: 0, total: 0 });
		expect(wrapper.findComponent({ name: "VProgressLinear" }).props("modelValue")).toBe(0);
	});

	it("computes the completion percentage", () => {
		const wrapper = setup({ done: 1, total: 4 });
		expect(wrapper.findComponent({ name: "VProgressLinear" }).props("modelValue")).toBe(25);
	});

	it("shows 100% once everything is done", () => {
		const wrapper = setup({ done: 3, total: 3 });
		expect(wrapper.findComponent({ name: "VProgressLinear" }).props("modelValue")).toBe(100);
	});

	it("renders the given label", () => {
		const wrapper = setup({ done: 1, total: 2, label: "1/2 erledigt" });
		expect(wrapper.find('[data-testid="progress-bar-label"]').text()).toBe("1/2 erledigt");
	});

	it("omits the label element when none is given", () => {
		const wrapper = setup({ done: 1, total: 2 });
		expect(wrapper.find('[data-testid="progress-bar-label"]').exists()).toBe(false);
	});
});
