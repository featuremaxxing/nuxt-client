import RoomCollectionGridItem from "./RoomCollectionGridItem.vue";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("@feature-room/RoomCollectionGridItem", () => {
	const setup = (props: { title?: string; roomCount?: number; isOpen?: boolean } = {}) => {
		const rooms = roomItemFactory.buildList(props.roomCount ?? 4);
		const wrapper = mount(RoomCollectionGridItem, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: {
				collection: { id: "c1", title: props.title ?? "Mathe" },
				rooms,
				index: 0,
				isOpen: props.isOpen ?? false,
			},
		});
		return { wrapper, rooms };
	};

	it("should show the title and the number of rooms", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=room-collection-title-0]").text()).toBe("Mathe");
		expect(wrapper.find("[data-testid=room-collection-count-0]").text()).toBe("pages.rooms.collections.roomCount");
	});

	it("should show a placeholder for a collection without title", () => {
		const { wrapper } = setup({ title: "" });

		expect(wrapper.find("[data-testid=room-collection-title-0]").text()).toBe("pages.rooms.collections.untitled");
	});

	it("should fan out at most the last three rooms", () => {
		const { wrapper, rooms } = setup();

		const avatars = wrapper.findAll(".room-collection-fan-avatar");
		expect(avatars.map((avatar) => avatar.text())).toEqual(rooms.slice(-3).map((room) => room.name.slice(0, 2)));
		expect(avatars.map((avatar) => avatar.attributes("style"))).toEqual([
			"--angle: -10deg;",
			"--angle: 0deg;",
			"--angle: 10deg;",
		]);
	});

	it("should emit toggle when the button is clicked", async () => {
		const { wrapper } = setup({ isOpen: true });

		const button = wrapper.find("[data-testid=room-collection-toggle-0]");
		await button.trigger("click");

		expect(button.attributes("aria-expanded")).toBe("true");
		expect(wrapper.emitted("toggle")).toHaveLength(1);
	});
});
