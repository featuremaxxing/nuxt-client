import LearningPathColorPicker from "./LearningPathColorPicker.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { LearningPathColor } from "@api-server";
import { mount } from "@vue/test-utils";

describe("@ui-room-details/LearningPathColorPicker", () => {
	const setup = (props: { modelValue?: LearningPathColor; usedColors?: LearningPathColor[] } = {}) => {
		const wrapper = mount(LearningPathColorPicker, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props,
		});

		return { wrapper };
	};

	it("should offer every color as a radio button", () => {
		const { wrapper } = setup();

		expect(wrapper.findAll("[role='radio']")).toHaveLength(Object.values(LearningPathColor).length);
	});

	it("should mark the selected color", () => {
		const { wrapper } = setup({ modelValue: LearningPathColor.Red });

		expect(wrapper.get("[data-testid='learning-path-color-red']").attributes("aria-checked")).toBe("true");
		expect(wrapper.get("[data-testid='learning-path-color-blue']").attributes("aria-checked")).toBe("false");
	});

	it("should hand over the chosen color", async () => {
		const { wrapper } = setup();

		await wrapper.get("[data-testid='learning-path-color-teal']").trigger("click");

		expect(wrapper.emitted("update:modelValue")).toEqual([[LearningPathColor.Teal]]);
	});

	it("should mark colors other learning paths already have, but keep them selectable", async () => {
		const { wrapper } = setup({ usedColors: [LearningPathColor.Blue] });

		const blue = wrapper.get("[data-testid='learning-path-color-blue']");
		expect(blue.classes()).toContain("lp-color-picker__option--used");
		await blue.trigger("click");
		expect(wrapper.emitted("update:modelValue")).toEqual([[LearningPathColor.Blue]]);
	});

	it("should name the color in words, not just show it", () => {
		const { wrapper } = setup({ modelValue: LearningPathColor.Green });

		expect(wrapper.get("[data-testid='learning-path-color-name']").text()).toBe("pages.learningPath.color.green");
	});
});
