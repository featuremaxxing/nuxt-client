import RoomCollectionGridItem from "./RoomCollectionGridItem.vue";
import RoomCollectionMenu from "./RoomCollectionMenu.vue";
import RoomCollectionPanel from "./RoomCollectionPanel.vue";
import RoomGrid from "./RoomGrid.vue";
import { RoomGridDropResult } from "./roomGridDragAndDrop.composable";
import { RoomItem } from "@/types/room/Room";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { ArrangementNode, useRoomStore } from "@data-room";
import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";

const drag = vi.hoisted(() => ({
	onDrop: undefined as undefined | ((result: RoomGridDropResult) => void),
}));

vi.mock("./roomGridDragAndDrop.composable", async () => {
	const { ref } = await import("vue");
	return {
		useRoomGridDragAndDrop: (options: { onDrop: (result: RoomGridDropResult) => void }) => {
			drag.onDrop = options.onDrop;
			return { isDragging: ref(false) };
		},
	};
});

const RoomGridItemStub = defineComponent({
	name: "RoomGridItem",
	props: { room: { type: Object, required: true }, index: { type: Number, required: true } },
	setup:
		(_, { slots }) =>
		() =>
			h("div", { class: "room-grid-item-stub" }, slots.menu?.()),
});

const room = (id: string): ArrangementNode => ({ type: "room", id });

describe("@feature-room/RoomGrid", () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia({ stubActions: true }));
	});

	const setup = (options: { grouped?: number } = {}) => {
		const store = useRoomStore();
		const collection = { id: "c1", title: "Mathe" };
		const rooms: RoomItem[] = roomItemFactory
			.buildList(4)
			.map((r, i) => (i < (options.grouped ?? 0) ? { ...r, collectionId: collection.id } : r));
		store.rooms = rooms;
		store.collections = options.grouped ? [collection] : [];

		const wrapper = mount(RoomGrid, {
			global: {
				plugins: [createTestingVuetify(), createTestingI18n()],
				stubs: { RoomGridItem: RoomGridItemStub, RoomCollectionGridItem: true, KebabMenu: true },
			},
			props: { rooms },
		});

		const lastArrangement = () => vi.mocked(store.arrangeRooms).mock.lastCall?.[0];

		return { wrapper, rooms, collection, store, lastArrangement };
	};

	it("should render one item per room", () => {
		const { wrapper, rooms } = setup();

		expect(wrapper.findAllComponents({ name: "RoomGridItem" })).toHaveLength(rooms.length);
	});

	it("should render rooms of a collection as one stack", () => {
		const { wrapper } = setup({ grouped: 2 });

		expect(wrapper.findAllComponents(RoomCollectionGridItem)).toHaveLength(1);
		expect(wrapper.findAllComponents({ name: "RoomGridItem" })).toHaveLength(2);
	});

	describe("when a collection is toggled", () => {
		it("should show its rooms in a panel", async () => {
			const { wrapper } = setup({ grouped: 2 });

			await wrapper.findComponent(RoomCollectionGridItem).vm.$emit("toggle");

			const panel = wrapper.findComponent(RoomCollectionPanel);
			expect(panel.exists()).toBe(true);
			expect(panel.findAllComponents({ name: "RoomGridItem" })).toHaveLength(2);
		});

		it("should close the panel when toggled again", async () => {
			const { wrapper } = setup({ grouped: 2 });
			const stack = wrapper.findComponent(RoomCollectionGridItem);

			await stack.vm.$emit("toggle");
			await stack.vm.$emit("toggle");

			expect(wrapper.findComponent(RoomCollectionPanel).exists()).toBe(false);
		});
	});

	describe("when a room is dropped", () => {
		it("should store a new order", async () => {
			const { rooms, lastArrangement } = setup();

			drag.onDrop?.({
				draggedType: "room",
				draggedId: rooms[0].id,
				mainOrder: [rooms[1], rooms[0], rooms[2], rooms[3]].map((r) => ({ type: "room", id: r.id })),
			});
			await flushPromises();

			expect(lastArrangement()).toEqual([room(rooms[1].id), room(rooms[0].id), room(rooms[2].id), room(rooms[3].id)]);
		});

		it("should not store anything when nothing changed", async () => {
			const { rooms, store } = setup();

			drag.onDrop?.({
				draggedType: "room",
				draggedId: rooms[0].id,
				mainOrder: rooms.map((r) => ({ type: "room", id: r.id })),
			});
			await flushPromises();

			expect(store.arrangeRooms).not.toHaveBeenCalled();
		});

		it("should create a collection when dropped onto another room", async () => {
			const { wrapper, rooms, lastArrangement } = setup();
			const roomA = { ...rooms[0], name: "Mathe 7a" };
			const roomB = { ...rooms[1], name: "Mathe 7b" };
			await wrapper.setProps({ rooms: [roomA, roomB, rooms[2], rooms[3]] });

			drag.onDrop?.({
				draggedType: "room",
				draggedId: roomA.id,
				mergeTarget: { type: "room", id: roomB.id },
				mainOrder: [roomA, roomB, rooms[2], rooms[3]].map((r) => ({ type: "room", id: r.id })),
			});
			await flushPromises();

			expect(lastArrangement()).toEqual([
				{ type: "collection", id: expect.any(String), title: "Mathe", roomIds: [roomB.id, roomA.id] },
				room(rooms[2].id),
				room(rooms[3].id),
			]);
		});

		it("should add the room when dropped onto a collection", async () => {
			const { rooms, collection, lastArrangement } = setup({ grouped: 2 });

			drag.onDrop?.({
				draggedType: "room",
				draggedId: rooms[3].id,
				mergeTarget: { type: "collection", id: collection.id },
				mainOrder: [{ type: "collection", id: collection.id }, room(rooms[2].id), room(rooms[3].id)],
			});
			await flushPromises();

			expect(lastArrangement()).toEqual([
				{ type: "collection", ...collection, roomIds: [rooms[0].id, rooms[1].id, rooms[3].id] },
				room(rooms[2].id),
			]);
		});

		it("should offer to undo it", async () => {
			const { wrapper, rooms, collection, store } = setup({ grouped: 2 });

			drag.onDrop?.({
				draggedType: "room",
				draggedId: rooms[3].id,
				mergeTarget: { type: "collection", id: collection.id },
				mainOrder: [{ type: "collection", id: collection.id }, room(rooms[2].id), room(rooms[3].id)],
			});
			await flushPromises();
			await wrapper.findComponent({ name: "VSnackbar" }).findComponent({ name: "VBtn" }).trigger("click");

			expect(vi.mocked(store.arrangeRooms).mock.lastCall?.[0]).toEqual([
				{ type: "collection", ...collection, roomIds: [rooms[0].id, rooms[1].id] },
				room(rooms[2].id),
				room(rooms[3].id),
			]);
		});
	});

	describe("menu", () => {
		it("should take a room out of its collection", async () => {
			const { wrapper, rooms, collection, lastArrangement } = setup({ grouped: 3 });
			await wrapper.findComponent(RoomCollectionGridItem).vm.$emit("toggle");

			await wrapper.findComponent(RoomCollectionPanel).findComponent(RoomCollectionMenu).vm.$emit("take-out");

			expect(lastArrangement()).toEqual([
				{ type: "collection", ...collection, roomIds: [rooms[1].id, rooms[2].id] },
				room(rooms[0].id),
				room(rooms[3].id),
			]);
		});

		it("should add a room to a collection", async () => {
			const { wrapper, rooms, collection, lastArrangement } = setup({ grouped: 2 });

			await wrapper.findComponent(RoomCollectionMenu).vm.$emit("add-to", collection.id);

			expect(lastArrangement()).toEqual([
				{ type: "collection", ...collection, roomIds: [rooms[0].id, rooms[1].id, rooms[2].id] },
				room(rooms[3].id),
			]);
		});

		it("should create a collection with a single room and open it", async () => {
			const { wrapper, rooms, lastArrangement } = setup();

			await wrapper.findComponent(RoomCollectionMenu).vm.$emit("create");

			expect(lastArrangement()?.[0]).toEqual({
				type: "collection",
				id: expect.any(String),
				title: "",
				roomIds: [rooms[0].id],
			});
		});
	});

	describe("panel", () => {
		it("should dissolve the collection", async () => {
			const { wrapper, rooms, lastArrangement } = setup({ grouped: 2 });
			await wrapper.findComponent(RoomCollectionGridItem).vm.$emit("toggle");

			await wrapper.findComponent(RoomCollectionPanel).vm.$emit("dissolve");

			expect(lastArrangement()).toEqual(rooms.map((r) => room(r.id)));
		});

		it("should rename the collection", async () => {
			const { wrapper, rooms, collection, lastArrangement } = setup({ grouped: 2 });
			await wrapper.findComponent(RoomCollectionGridItem).vm.$emit("toggle");

			await wrapper.findComponent(RoomCollectionPanel).vm.$emit("rename", "Physik");

			expect(lastArrangement()?.[0]).toEqual({
				type: "collection",
				id: collection.id,
				title: "Physik",
				roomIds: [rooms[0].id, rooms[1].id],
			});
		});
	});

	describe("keyboard reordering", () => {
		it("should move an item right with ArrowRight", async () => {
			const { wrapper, rooms, lastArrangement } = setup();

			await wrapper.findAllComponents({ name: "RoomGridItem" })[0].trigger("keydown", { key: "ArrowRight" });

			expect(lastArrangement()).toEqual([room(rooms[1].id), room(rooms[0].id), room(rooms[2].id), room(rooms[3].id)]);
		});

		it("should move an item left with ArrowLeft", async () => {
			const { wrapper, rooms, lastArrangement } = setup();

			await wrapper.findAllComponents({ name: "RoomGridItem" })[3].trigger("keydown", { key: "ArrowLeft" });

			expect(lastArrangement()).toEqual([room(rooms[0].id), room(rooms[1].id), room(rooms[3].id), room(rooms[2].id)]);
		});

		it("should not move beyond the boundaries", async () => {
			const { wrapper, store } = setup();

			await wrapper.findAllComponents({ name: "RoomGridItem" })[0].trigger("keydown", { key: "ArrowLeft" });

			expect(store.arrangeRooms).not.toHaveBeenCalled();
		});

		it("should move a collection as a whole", async () => {
			const { wrapper, rooms, collection, lastArrangement } = setup({ grouped: 2 });

			await wrapper.findComponent(RoomCollectionGridItem).trigger("keydown", { key: "ArrowRight" });

			expect(lastArrangement()).toEqual([
				room(rooms[2].id),
				{ type: "collection", ...collection, roomIds: [rooms[0].id, rooms[1].id] },
				room(rooms[3].id),
			]);
		});
	});
});
