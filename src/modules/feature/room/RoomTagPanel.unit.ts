import RoomTagPanel from "./RoomTagPanel.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("@feature-room/RoomTagPanel", () => {
	const setup = () => {
		const wrapper = mount(RoomTagPanel, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { tag: { id: "t1", name: "Mathe" }, roomCount: 2 },
			slots: { default: "<div class='slotted'>room</div>" },
			attachTo: document.body,
		});
		const input = wrapper.find("[data-testid=room-tag-name-input] input");
		return { wrapper, input };
	};

	it("should render the rooms", () => {
		const { wrapper } = setup();

		expect(wrapper.find(".slotted").exists()).toBe(true);
	});

	it("should emit the trimmed name when leaving the field", async () => {
		const { wrapper, input } = setup();

		await input.setValue("  Physik ");
		await input.trigger("blur");

		expect(wrapper.emitted("rename")).toEqual([["Physik"]]);
	});

	it("should keep the name when the field was emptied", async () => {
		const { wrapper, input } = setup();

		await input.setValue("   ");
		await input.trigger("blur");

		expect(wrapper.emitted("rename")).toBeUndefined();
		expect((input.element as HTMLInputElement).value).toBe("Mathe");
	});

	it("should not emit when the name did not change", async () => {
		const { wrapper, input } = setup();

		await input.trigger("blur");

		expect(wrapper.emitted("rename")).toBeUndefined();
	});

	it("should emit delete and close", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid=room-tag-delete]").trigger("click");
		await wrapper.find("[data-testid=room-tag-close]").trigger("click");

		expect(wrapper.emitted("delete")).toHaveLength(1);
		expect(wrapper.emitted("close")).toHaveLength(1);
	});
});
