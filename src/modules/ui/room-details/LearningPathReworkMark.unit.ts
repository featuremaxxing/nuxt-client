import LearningPathReworkMark from "./LearningPathReworkMark.vue";
import { mount } from "@vue/test-utils";

describe("@ui-room-details/LearningPathReworkMark", () => {
	it("should show an exclamation mark", () => {
		const wrapper = mount(LearningPathReworkMark);

		expect(wrapper.text()).toBe("!");
	});

	it("should be hidden from screen readers without a label", () => {
		const wrapper = mount(LearningPathReworkMark);

		expect(wrapper.attributes("aria-hidden")).toBe("true");
	});

	it("should name itself with a label", () => {
		const wrapper = mount(LearningPathReworkMark, { props: { label: "Nacharbeiten" } });

		expect(wrapper.attributes("role")).toBe("img");
		expect(wrapper.attributes("aria-label")).toBe("Nacharbeiten");
	});
});
