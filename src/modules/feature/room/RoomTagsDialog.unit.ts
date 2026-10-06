import { useRoomsView } from "./roomsView.composable";
import RoomTagsDialog from "./RoomTagsDialog.vue";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useRoomStore } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { VCombobox } from "vuetify/components";

describe("@feature-room/RoomTagsDialog", () => {
	enableAutoUnmount(afterEach);

	const mathe = { id: "t1", name: "Mathe" };
	const bio = { id: "t2", name: "Bio" };

	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: true }));
		useRoomsView().roomToTag.value = undefined;
	});

	const setup = async () => {
		const store = useRoomStore();
		store.tags = [mathe, bio];
		vi.mocked(store.setRoomTags).mockResolvedValue(true);
		const room = roomItemFactory.build({ name: "Mathe 7a", tagIds: [mathe.id] });

		const wrapper = mount(RoomTagsDialog, {
			attachTo: document.body,
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
		});
		useRoomsView().editTags(room);
		await nextTick();
		await flushPromises();

		const combobox = wrapper.findComponent(VCombobox);
		const click = async (testId: string) => {
			(document.querySelector(`[data-testid=${testId}]`) as HTMLElement).click();
			await flushPromises();
		};

		return { wrapper, store, room, combobox, click };
	};

	it("should start with the room's tags and offer all tags alphabetically", async () => {
		const { combobox } = await setup();

		expect(combobox.props("modelValue")).toEqual(["Mathe"]);
		expect(combobox.props("items")).toEqual(["Bio", "Mathe"]);
	});

	it("should save the chosen tags and close", async () => {
		const { combobox, store, room, click } = await setup();

		await combobox.vm.$emit("update:modelValue", ["Mathe", "Klasse 7a"]);
		await click("room-tags-save");

		expect(store.setRoomTags).toHaveBeenCalledWith(room.id, ["Mathe", "Klasse 7a"]);
		expect(useRoomsView().roomToTag.value).toBeUndefined();
	});

	it("should also save a name that was typed but not confirmed", async () => {
		const { combobox, store, room, click } = await setup();

		await combobox.vm.$emit("update:search", "  Physik ");
		await click("room-tags-save");

		expect(store.setRoomTags).toHaveBeenCalledWith(room.id, ["Mathe", "Physik"]);
	});

	it("should stay open when saving fails", async () => {
		const { store, click } = await setup();
		vi.mocked(store.setRoomTags).mockResolvedValue(false);

		await click("room-tags-save");

		expect(useRoomsView().roomToTag.value).toBeDefined();
	});

	it("should close without saving on cancel", async () => {
		const { store, click } = await setup();

		await click("room-tags-cancel");

		expect(store.setRoomTags).not.toHaveBeenCalled();
		expect(useRoomsView().roomToTag.value).toBeUndefined();
	});
});
