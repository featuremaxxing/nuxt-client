import { useRoomsView } from "./roomsView.composable";
import RoomTagMenu from "./RoomTagMenu.vue";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useRoomStore } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { KebabMenuAction } from "@ui-kebab-menu";
import { mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

describe("@feature-room/RoomTagMenu", () => {
	const mathe = { id: "t1", name: "Mathe" };
	const bio = { id: "t2", name: "Bio" };

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: true }));
		useRoomsView().roomToTag.value = undefined;
		useRoomStore().tags = [mathe, bio];
	});

	const setup = (currentTag?: typeof mathe) => {
		const room = roomItemFactory.build({ tagIds: [mathe.id, bio.id] });
		const wrapper = mount(RoomTagMenu, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { KebabMenu: { template: "<div><slot /></div>" } },
			},
			props: { room, currentTag },
		});
		const actions = () => wrapper.findAllComponents(KebabMenuAction);
		return { room, actions };
	};

	it("should open the tags dialog for the room", async () => {
		const { room, actions } = setup();

		await actions()[0].trigger("click");

		expect(useRoomsView().roomToTag.value).toEqual(room);
	});

	it("should only offer to remove a tag inside the rooms of a tag", () => {
		expect(setup().actions()).toHaveLength(1);
		expect(setup(mathe).actions()).toHaveLength(2);
	});

	it("should remove the current tag and keep the others", async () => {
		const { room, actions } = setup(mathe);

		await actions()[1].trigger("click");

		expect(useRoomStore().setRoomTags).toHaveBeenCalledWith(room.id, ["Bio"]);
	});
});
