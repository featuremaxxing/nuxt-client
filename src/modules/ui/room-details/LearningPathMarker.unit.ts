import LearningPathMarker from "./LearningPathMarker.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor } from "@api-server";
import { mount } from "@vue/test-utils";

describe("@ui-room-details/LearningPathMarker", () => {
	const setup = (props: { color?: LearningPathColor; size?: number; label?: string }) =>
		mount(LearningPathMarker, { global: { plugins: [createTestingVuetify(), createTestingI18n()] }, props });

	it("should give every color its own shape", () => {
		const shapes = Object.values(LearningPathColor).map((color) =>
			setup({ color }).get("[data-testid='learning-path-marker']").attributes("data-shape")
		);

		expect(new Set(shapes).size).toBe(Object.values(LearningPathColor).length);
	});

	it("should fill the shape with the color", () => {
		const wrapper = setup({ color: LearningPathColor.Red });

		expect(wrapper.get("g").attributes("fill")).toBe("#c62828");
	});

	it("should be hidden from screen readers next to the name of the color", () => {
		const wrapper = setup({ color: LearningPathColor.Blue });

		expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
		expect(wrapper.get("svg").attributes("role")).toBeUndefined();
	});

	it("should name the color when asked to", () => {
		const wrapper = setup({ color: LearningPathColor.Blue, label: "Blau" });

		expect(wrapper.get("svg").attributes("role")).toBe("img");
		expect(wrapper.get("svg").attributes("aria-label")).toBe("Blau");
	});

	it("should take the size", () => {
		const wrapper = setup({ color: LearningPathColor.Blue, size: 24 });

		expect(wrapper.get("svg").attributes("width")).toBe("24");
	});
});
