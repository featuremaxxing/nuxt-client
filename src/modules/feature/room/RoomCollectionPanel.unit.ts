import RoomCollectionPanel from "./RoomCollectionPanel.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("@feature-room/RoomCollectionPanel", () => {
	const setup = () => {
		const wrapper = mount(RoomCollectionPanel, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: { collection: { id: "c1", title: "Mathe" }, roomCount: 2 },
			slots: { default: "<div class='slotted'>room</div>" },
			attachTo: document.body,
		});
		const input = wrapper.find("[data-testid=room-collection-title-input] input");
		return { wrapper, input };
	};

	it("should render the rooms in its container", () => {
		const { wrapper } = setup();

		expect((wrapper.vm.container as HTMLElement).querySelector(".slotted")).not.toBeNull();
	});

	it("should emit the trimmed title when leaving the field", async () => {
		const { wrapper, input } = setup();

		await input.setValue("  Physik ");
		await input.trigger("blur");

		expect(wrapper.emitted("rename")).toEqual([["Physik"]]);
	});

	it("should not emit when the title did not change", async () => {
		const { wrapper, input } = setup();

		await input.trigger("blur");

		expect(wrapper.emitted("rename")).toBeUndefined();
	});

	it("should emit dissolve and close", async () => {
		const { wrapper } = setup();

		await wrapper.find("[data-testid=room-collection-dissolve]").trigger("click");
		await wrapper.find("[data-testid=room-collection-close]").trigger("click");

		expect(wrapper.emitted("dissolve")).toHaveLength(1);
		expect(wrapper.emitted("close")).toHaveLength(1);
	});
});
