import { groupRoomsByTag, tagsOfRoom } from "./room-tags";
import { roomItemFactory } from "@@/tests/test-utils";
import { describe, expect, it } from "vitest";

describe("room-tags", () => {
	const mathe = { id: "t1", name: "Mathe" };
	const klasse = { id: "t2", name: "klasse 7a" };

	describe("groupRoomsByTag", () => {
		const rooms = [
			roomItemFactory.build({ id: "r1", name: "Raum 10", tagIds: ["t1"] }),
			roomItemFactory.build({ id: "r2", name: "raum 2", tagIds: ["t1", "t2"] }),
			roomItemFactory.build({ id: "r3", name: "Lehrerzimmer" }),
			roomItemFactory.build({ id: "r4", name: "Bio", tagIds: ["unknown"] }),
		];

		it("should sort tags and their rooms alphabetically", () => {
			const { groups } = groupRoomsByTag(rooms, [mathe, klasse]);

			expect(groups.map((group) => [group.tag.name, group.rooms.map((room) => room.name)])).toEqual([
				["klasse 7a", ["raum 2"]],
				["Mathe", ["raum 2", "Raum 10"]],
			]);
		});

		it("should list rooms without known tags alphabetically", () => {
			const { untaggedRooms } = groupRoomsByTag(rooms, [mathe, klasse]);

			expect(untaggedRooms.map((room) => room.name)).toEqual(["Bio", "Lehrerzimmer"]);
		});

		it("should leave out tags without rooms", () => {
			const { groups } = groupRoomsByTag(rooms, [mathe, klasse, { id: "t3", name: "Leer" }]);

			expect(groups.map((group) => group.tag.name)).not.toContain("Leer");
		});
	});

	describe("tagsOfRoom", () => {
		it("should return the tags of a room sorted by name", () => {
			const room = roomItemFactory.build({ tagIds: ["t1", "t2"] });

			expect(tagsOfRoom(room, [mathe, klasse])).toEqual([klasse, mathe]);
		});
	});
});
