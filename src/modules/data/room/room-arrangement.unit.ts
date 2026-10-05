import {
	addRoomToCollection,
	applyDraggedOrder,
	ArrangementNode,
	buildArrangement,
	buildRoomGridEntries,
	createCollectionFromRooms,
	createCollectionWithRoom,
	dissolveCollection,
	moveNode,
	normalizeArrangement,
	renameCollection,
	suggestCollectionTitle,
	takeRoomOutOfCollection,
	toArrangeRoomsParams,
} from "./room-arrangement";
import { roomItemFactory } from "@@/tests/test-utils";
import { describe, expect, it } from "vitest";

const mathe = { id: "c1", title: "Mathe" };
const room = (id: string): ArrangementNode => ({ type: "room", id });
const collection = (id: string, roomIds: string[], title = "Mathe"): ArrangementNode => ({
	type: "collection",
	id,
	title,
	roomIds,
});

describe("room-arrangement", () => {
	describe("buildArrangement", () => {
		it("should group rooms of a collection at the position of its first room", () => {
			const rooms = [
				roomItemFactory.build({ id: "a", collectionId: "c1" }),
				roomItemFactory.build({ id: "b" }),
				roomItemFactory.build({ id: "c", collectionId: "c1" }),
			];

			expect(buildArrangement(rooms, [mathe])).toEqual([collection("c1", ["a", "c"]), room("b")]);
		});

		it("should treat rooms of an unknown collection as plain rooms", () => {
			const rooms = [roomItemFactory.build({ id: "a", collectionId: "gone" })];

			expect(buildArrangement(rooms, [])).toEqual([room("a")]);
		});
	});

	describe("buildRoomGridEntries", () => {
		it("should resolve rooms and skip collections without known rooms", () => {
			const a = roomItemFactory.build({ id: "a" });
			const b = roomItemFactory.build({ id: "b" });

			const entries = buildRoomGridEntries([room("a"), collection("c1", ["b"]), collection("c2", ["x"])], [a, b]);

			expect(entries).toEqual([
				{ type: "room", room: a },
				{ type: "collection", collection: mathe, rooms: [b] },
			]);
		});
	});

	describe("buildRoomGridEntries sorting", () => {
		it("should list the rooms of a collection alphabetically", () => {
			const rooms = ["Raum 10", "raum 2", "Biologie"].map((name, i) => roomItemFactory.build({ id: `r${i}`, name }));

			const [entry] = buildRoomGridEntries([collection("c1", ["r0", "r1", "r2"])], rooms);

			expect(entry.type === "collection" && entry.rooms.map((r) => r.name)).toEqual(["Biologie", "raum 2", "Raum 10"]);
		});
	});

	describe("toArrangeRoomsParams", () => {
		it("should flatten the arrangement and leave out empty collections", () => {
			const params = toArrangeRoomsParams([room("a"), collection("c1", ["b", "c"]), collection("c2", [], "Leer")]);

			expect(params).toEqual({
				items: [{ id: "a" }, { id: "b", collectionId: "c1" }, { id: "c", collectionId: "c1" }],
				collections: [mathe],
			});
		});
	});

	describe("normalizeArrangement", () => {
		it("should remove empty collections and dissolve collections with a single room", () => {
			const nodes = [collection("c1", []), collection("c2", ["a"]), collection("c3", ["b", "c"])];

			expect(normalizeArrangement(nodes)).toEqual([room("a"), collection("c3", ["b", "c"])]);
		});

		it("should keep a single room in the open collection", () => {
			expect(normalizeArrangement([collection("c1", ["a"])], "c1")).toEqual([collection("c1", ["a"])]);
		});
	});

	describe("applyDraggedOrder", () => {
		const nodes = [room("a"), collection("c1", ["b", "c"]), collection("c2", ["d", "e"], "Physik"), room("f")];

		it("should take the top level order from the grid", () => {
			const result = applyDraggedOrder(
				nodes,
				[room("f"), { type: "collection", id: "c2" }, room("a"), { type: "collection", id: "c1" }],
				undefined,
				undefined
			);

			expect(result).toEqual([
				room("f"),
				collection("c2", ["d", "e"], "Physik"),
				room("a"),
				collection("c1", ["b", "c"]),
			]);
		});

		it("should take the room order of the open collection from the panel", () => {
			const result = applyDraggedOrder(
				nodes,
				[room("a"), { type: "collection", id: "c1" }, { type: "collection", id: "c2" }, room("f")],
				"c1",
				["c", "b", "a"]
			);

			expect(result[1]).toEqual(collection("c1", ["c", "b"]));
		});

		it("should take a room out of the open collection when it was dragged into the grid", () => {
			const result = applyDraggedOrder(
				nodes,
				[room("a"), { type: "collection", id: "c1" }, room("c"), { type: "collection", id: "c2" }, room("f")],
				"c1",
				["b"]
			);

			expect(result).toEqual([
				room("a"),
				collection("c1", ["b"]),
				room("c"),
				collection("c2", ["d", "e"], "Physik"),
				room("f"),
			]);
		});
	});

	describe("operations", () => {
		const nodes = [room("a"), collection("c1", ["b", "c"]), room("d")];

		it("addRoomToCollection should move the room to the end of the collection", () => {
			expect(addRoomToCollection(nodes, "a", "c1")).toEqual([collection("c1", ["b", "c", "a"]), room("d")]);
		});

		it("createCollectionFromRooms should replace the target room with a new collection", () => {
			const result = createCollectionFromRooms(nodes, "d", "a", { id: "c2", title: "Neu" });

			expect(result).toEqual([collection("c1", ["b", "c"]), collection("c2", ["d", "a"], "Neu")]);
		});

		it("createCollectionWithRoom should create a collection at the room's position", () => {
			const result = createCollectionWithRoom(nodes, "d", { id: "c2", title: "" });

			expect(result).toEqual([room("a"), collection("c1", ["b", "c"]), collection("c2", ["d"], "")]);
		});

		it("createCollectionWithRoom should take a room out of its collection", () => {
			const result = createCollectionWithRoom(nodes, "c", { id: "c2", title: "" });

			expect(result).toEqual([room("a"), collection("c2", ["c"], ""), collection("c1", ["b"]), room("d")]);
		});

		it("takeRoomOutOfCollection should place the room behind its collection", () => {
			expect(takeRoomOutOfCollection(nodes, "b")).toEqual([room("a"), collection("c1", ["c"]), room("b"), room("d")]);
		});

		it("takeRoomOutOfCollection should leave rooms without collection alone", () => {
			expect(takeRoomOutOfCollection(nodes, "a")).toBe(nodes);
		});

		it("dissolveCollection should put the rooms back in place of the collection", () => {
			expect(dissolveCollection(nodes, "c1")).toEqual([room("a"), room("b"), room("c"), room("d")]);
		});

		it("renameCollection should change the title", () => {
			expect(renameCollection(nodes, "c1", "Physik")[1]).toEqual(collection("c1", ["b", "c"], "Physik"));
		});

		it("moveNode should move an entry of the top level", () => {
			expect(moveNode(nodes, 0, 2)).toEqual([collection("c1", ["b", "c"]), room("d"), room("a")]);
		});
	});

	describe("suggestCollectionTitle", () => {
		it("should use the words both names start with", () => {
			expect(suggestCollectionTitle("Mathe 7a", "Mathe 7b", "Neue Sammlung")).toBe("Mathe");
			expect(suggestCollectionTitle("Physik Klasse 8a", "Physik Klasse 8b", "Neue Sammlung")).toBe("Physik Klasse");
		});

		it("should fall back when the names have nothing in common", () => {
			expect(suggestCollectionTitle("Mathe 7a", "Lehrerzimmer", "Neue Sammlung")).toBe("Neue Sammlung");
		});
	});
});
