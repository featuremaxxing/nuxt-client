import RoomGridItem from "./RoomGridItem.vue";
import { useRoomsView } from "./roomsView.composable";
import RoomTagPanel from "./RoomTagPanel.vue";
import RoomTagStack from "./RoomTagStack.vue";
import RoomTagView from "./RoomTagView.vue";
import * as confirmation from "@/utils/confirmation-dialog.utils";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { useRoomStore } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { enableAutoUnmount, flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("@feature-room/RoomTagView", () => {
	enableAutoUnmount(afterEach);

	const mathe = { id: "t1", name: "Mathe" };
	const bio = { id: "t2", name: "Bio" };

	beforeEach(() => {
		// jsdom does not scroll
		Element.prototype.scrollIntoView = vi.fn();
		setActivePinia(createTestingPinia({ stubActions: true }));
		const view = useRoomsView();
		view.openTagId.value = undefined;
	});

	const setup = (tags = [mathe, bio]) => {
		const rooms = [
			roomItemFactory.build({ name: "Mathe 7b", tagIds: [mathe.id] }),
			roomItemFactory.build({ name: "Mathe 7a", tagIds: [mathe.id, bio.id] }),
			roomItemFactory.build({ name: "Lehrerzimmer" }),
		];
		const store = useRoomStore();
		store.tags = tags;
		vi.mocked(store.deleteTag).mockResolvedValue(true);

		const wrapper = mount(RoomTagView, {
			attachTo: document.body,
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { RoomGridItem: true },
			},
			props: { rooms },
		});
		const openTag = async (index: number) => {
			await wrapper.findAllComponents(RoomTagStack)[index].vm.$emit("toggle");
		};

		return { wrapper, rooms, store, openTag };
	};

	it("should show one stack per tag in alphabetical order", () => {
		const { wrapper } = setup();

		expect(wrapper.findAllComponents(RoomTagStack).map((stack) => stack.props("tag"))).toEqual([bio, mathe]);
	});

	it("should show rooms without tag as single cards after the stacks", () => {
		const { wrapper, rooms } = setup();

		const cards = wrapper.findAllComponents(RoomGridItem);
		expect(cards.map((card) => card.props("room"))).toEqual([rooms[2]]);
	});

	it("should explain how to tag when there are no tags", () => {
		const { wrapper } = setup([]);

		expect(wrapper.find("[data-testid=room-tag-view-empty]").exists()).toBe(true);
		expect(wrapper.findAllComponents(RoomGridItem)).toHaveLength(3);
	});

	describe("when a stack is opened", () => {
		it("should show its rooms alphabetically", async () => {
			const { wrapper, openTag } = setup();

			await openTag(1);

			const panel = wrapper.findComponent(RoomTagPanel);
			expect(panel.props("tag")).toEqual(mathe);
			expect(panel.findAllComponents(RoomGridItem).map((card) => card.props("room").name)).toEqual([
				"Mathe 7a",
				"Mathe 7b",
			]);
			expect(panel.findComponent(RoomGridItem).props("currentTag")).toEqual(mathe);
		});

		it("should close when clicking somewhere else", async () => {
			const { wrapper, openTag } = setup();
			await openTag(1);

			document.body.click();
			await flushPromises();

			expect(wrapper.findComponent(RoomTagPanel).exists()).toBe(false);
		});

		it("should stay open when clicking inside", async () => {
			const { wrapper, openTag } = setup();
			await openTag(1);

			(wrapper.findComponent(RoomTagPanel).element as HTMLElement).click();
			await flushPromises();

			expect(wrapper.findComponent(RoomTagPanel).exists()).toBe(true);
		});

		it("should rename the tag", async () => {
			const { wrapper, store, openTag } = setup();
			await openTag(1);

			await wrapper.findComponent(RoomTagPanel).vm.$emit("rename", "Mathematik");

			expect(store.renameTag).toHaveBeenCalledWith(mathe.id, "Mathematik");
		});

		it("should delete the tag after confirmation", async () => {
			const { wrapper, store, openTag } = setup();
			vi.spyOn(confirmation, "askDeletion").mockResolvedValue(true);
			await openTag(1);

			await wrapper.findComponent(RoomTagPanel).vm.$emit("delete");
			await flushPromises();

			expect(store.deleteTag).toHaveBeenCalledWith(mathe.id);
		});

		it("should keep the tag when the deletion is not confirmed", async () => {
			const { wrapper, store, openTag } = setup();
			vi.spyOn(confirmation, "askDeletion").mockResolvedValue(false);
			await openTag(1);

			await wrapper.findComponent(RoomTagPanel).vm.$emit("delete");
			await flushPromises();

			expect(store.deleteTag).not.toHaveBeenCalled();
		});
	});
});
