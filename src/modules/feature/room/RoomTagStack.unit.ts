import RoomTagStack from "./RoomTagStack.vue";
import { roomItemFactory } from "@@/tests/test-utils";
import { createTestingI18n, createTestingVuetify } from "@@/tests/test-utils/setup";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

describe("@feature-room/RoomTagStack", () => {
	const setup = (props: { roomCount?: number; isOpen?: boolean } = {}) => {
		const rooms = roomItemFactory.buildList(props.roomCount ?? 4);
		const wrapper = mount(RoomTagStack, {
			global: { plugins: [createTestingVuetify(), createTestingI18n()] },
			props: {
				tag: { id: "t1", name: "Mathe" },
				rooms,
				index: 0,
				isOpen: props.isOpen ?? false,
			},
		});
		return { wrapper, rooms };
	};

	it("should show the title and the number of rooms", () => {
		const { wrapper } = setup();

		expect(wrapper.find("[data-testid=room-tag-stack-name-0]").text()).toBe("Mathe");
		expect(wrapper.find("[data-testid=room-tag-stack-count-0]").text()).toBe("pages.rooms.tags.roomCount");
	});

	it("should fan out the first three rooms with the first one on top", () => {
		const { wrapper, rooms } = setup();

		const avatars = wrapper.findAll(".room-tag-stack-avatar");
		expect(avatars.map((avatar) => avatar.text())).toEqual(
			rooms
				.slice(0, 3)
				.reverse()
				.map((room) => room.name.slice(0, 2))
		);
		expect(avatars.map((avatar) => avatar.attributes("style"))).toEqual([
			"--angle: -10deg;",
			"--angle: 0deg;",
			"--angle: 10deg;",
		]);
	});

	it("should emit toggle when the button is clicked", async () => {
		const { wrapper } = setup({ isOpen: true });

		const button = wrapper.find("[data-testid=room-tag-stack-toggle-0]");
		await button.trigger("click");

		expect(button.attributes("aria-expanded")).toBe("true");
		expect(wrapper.emitted("toggle")).toHaveLength(1);
	});
});
