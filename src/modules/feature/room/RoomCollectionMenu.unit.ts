import RoomCollectionMenu from "./RoomCollectionMenu.vue";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { KebabMenuAction } from "@ui-kebab-menu";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("@feature-room/RoomCollectionMenu", () => {
	const mathe = { id: "c1", title: "Mathe" };
	const physik = { id: "c2", title: "Physik" };

	const setup = (currentCollection?: typeof mathe) => {
		const wrapper = mount(RoomCollectionMenu, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { KebabMenu: { template: "<div><slot /></div>" } },
			},
			props: { roomName: "Mathe 7a", collections: [mathe, physik], currentCollection },
		});
		const actions = () => wrapper.findAllComponents(KebabMenuAction);
		return { wrapper, actions };
	};

	it("should offer every collection and a new one for a room without collection", () => {
		const { actions } = setup();

		expect(actions().map((action) => action.props("dataTestId"))).toEqual([
			"room-collection-menu-add",
			"room-collection-menu-add",
			"room-collection-menu-create",
		]);
	});

	it("should offer to take a room out of its collection instead of adding it there again", () => {
		const { actions } = setup(mathe);

		expect(actions().map((action) => action.props("dataTestId"))).toEqual([
			"room-collection-menu-take-out",
			"room-collection-menu-add",
			"room-collection-menu-create",
		]);
	});

	it("should emit the chosen action", async () => {
		const { wrapper, actions } = setup(mathe);

		await actions()[0].trigger("click");
		await actions()[1].trigger("click");
		await actions()[2].trigger("click");

		expect(wrapper.emitted("take-out")).toHaveLength(1);
		expect(wrapper.emitted("add-to")).toEqual([[physik.id]]);
		expect(wrapper.emitted("create")).toHaveLength(1);
	});
});
