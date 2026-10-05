import { RoomItem } from "@/types/room/Room";
import { ArrangeRoomsBodyParams, RoomCollectionResponse } from "@api-server";

export type RoomCollection = RoomCollectionResponse;

/**
 * Personal arrangement of the rooms overview: rooms and collections of rooms ("stacks") in display order.
 * Collections are flat; a collection never contains another collection.
 */
export type ArrangementNode =
	| { type: "room"; id: string }
	| { type: "collection"; id: string; title: string; roomIds: string[] };

export type RoomGridEntry =
	| { type: "room"; room: RoomItem }
	| { type: "collection"; collection: RoomCollection; rooms: RoomItem[] };

export type ArrangementTarget = { type: "room" | "collection"; id: string };

export const buildArrangement = (rooms: RoomItem[], collections: RoomCollection[]): ArrangementNode[] => {
	const titleById = new Map(collections.map((collection) => [collection.id, collection.title]));
	const nodeByCollectionId = new Map<string, ArrangementNode & { type: "collection" }>();
	const nodes: ArrangementNode[] = [];

	for (const room of rooms) {
		const collectionId = room.collectionId;
		if (!collectionId || !titleById.has(collectionId)) {
			nodes.push({ type: "room", id: room.id });
			continue;
		}
		let node = nodeByCollectionId.get(collectionId);
		if (!node) {
			node = { type: "collection", id: collectionId, title: titleById.get(collectionId) ?? "", roomIds: [] };
			nodeByCollectionId.set(collectionId, node);
			nodes.push(node);
		}
		node.roomIds.push(room.id);
	}

	return nodes;
};

/** Rooms inside a collection are always listed alphabetically, "Raum 2" before "Raum 10". */
const byRoomName = (a: RoomItem, b: RoomItem) =>
	a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

export const buildRoomGridEntries = (nodes: ArrangementNode[], rooms: RoomItem[]): RoomGridEntry[] => {
	const roomById = new Map(rooms.map((room) => [room.id, room]));
	const entries: RoomGridEntry[] = [];

	for (const node of nodes) {
		if (node.type === "room") {
			const room = roomById.get(node.id);
			if (room) entries.push({ type: "room", room });
			continue;
		}
		const collectionRooms = node.roomIds
			.map((id) => roomById.get(id))
			.filter((room) => room !== undefined)
			.sort(byRoomName);
		if (collectionRooms.length > 0) {
			entries.push({ type: "collection", collection: { id: node.id, title: node.title }, rooms: collectionRooms });
		}
	}

	return entries;
};

export const toArrangeRoomsParams = (nodes: ArrangementNode[]): ArrangeRoomsBodyParams => {
	const items: ArrangeRoomsBodyParams["items"] = [];
	const collections: ArrangeRoomsBodyParams["collections"] = [];

	for (const node of nodes) {
		if (node.type === "room") {
			items.push({ id: node.id });
		} else if (node.roomIds.length > 0) {
			collections.push({ id: node.id, title: node.title });
			node.roomIds.forEach((id) => items.push({ id, collectionId: node.id }));
		}
	}

	return { items, collections };
};

export const findCollectionOfRoom = (nodes: ArrangementNode[], roomId: string) =>
	nodes.find((node) => node.type === "collection" && node.roomIds.includes(roomId)) as
		| (ArrangementNode & { type: "collection" })
		| undefined;

const withoutRoom = (nodes: ArrangementNode[], roomId: string): ArrangementNode[] =>
	nodes
		.filter((node) => !(node.type === "room" && node.id === roomId))
		.map((node) =>
			node.type === "collection" ? { ...node, roomIds: node.roomIds.filter((id) => id !== roomId) } : node
		);

/**
 * Removes empty collections and turns collections with a single room back into a plain room.
 * A collection that is currently open may keep a single room, so it can be filled.
 */
export const normalizeArrangement = (nodes: ArrangementNode[], keepCollectionId?: string): ArrangementNode[] =>
	nodes.flatMap((node): ArrangementNode[] => {
		if (node.type === "room") return [node];
		if (node.roomIds.length === 0) return [];
		if (node.roomIds.length === 1 && node.id !== keepCollectionId) return [{ type: "room", id: node.roomIds[0] }];
		return [node];
	});

/**
 * Applies the order the user produced by dragging. `mainOrder` is the top level as rendered in the grid,
 * `panelRoomIds` the rooms rendered in the open collection.
 */
export const applyDraggedOrder = (
	nodes: ArrangementNode[],
	mainOrder: ArrangementTarget[],
	openCollectionId: string | undefined,
	panelRoomIds: string[] | undefined
): ArrangementNode[] => {
	const topLevelRoomIds = new Set(mainOrder.filter((entry) => entry.type === "room").map((entry) => entry.id));
	const collectionById = new Map(
		nodes.filter((node) => node.type === "collection").map((node) => [node.id, node as ArrangementNode])
	);

	return mainOrder.flatMap((entry): ArrangementNode[] => {
		if (entry.type === "room") return [{ type: "room", id: entry.id }];
		const collection = collectionById.get(entry.id);
		if (!collection || collection.type !== "collection") return [];
		const roomIds = entry.id === openCollectionId && panelRoomIds ? panelRoomIds : collection.roomIds;
		return [{ ...collection, roomIds: roomIds.filter((id) => !topLevelRoomIds.has(id)) }];
	});
};

export const addRoomToCollection = (
	nodes: ArrangementNode[],
	roomId: string,
	collectionId: string
): ArrangementNode[] =>
	withoutRoom(nodes, roomId).map((node) =>
		node.type === "collection" && node.id === collectionId ? { ...node, roomIds: [...node.roomIds, roomId] } : node
	);

/** Drops a room onto another room: both form a new collection at the position of the target. */
export const createCollectionFromRooms = (
	nodes: ArrangementNode[],
	targetRoomId: string,
	roomId: string,
	collection: RoomCollection
): ArrangementNode[] =>
	withoutRoom(nodes, roomId).map((node) =>
		node.type === "room" && node.id === targetRoomId
			? { type: "collection", id: collection.id, title: collection.title, roomIds: [targetRoomId, roomId] }
			: node
	);

/** Creates a collection that holds only this room, at the room's current position. */
export const createCollectionWithRoom = (
	nodes: ArrangementNode[],
	roomId: string,
	collection: RoomCollection
): ArrangementNode[] => {
	const index = nodes.findIndex(
		(node) =>
			(node.type === "room" && node.id === roomId) || (node.type === "collection" && node.roomIds.includes(roomId))
	);
	const result = withoutRoom(nodes, roomId);
	result.splice(Math.max(0, index), 0, {
		type: "collection",
		id: collection.id,
		title: collection.title,
		roomIds: [roomId],
	});
	return result;
};

/** Takes a room out of its collection and places it right behind the collection. */
export const takeRoomOutOfCollection = (nodes: ArrangementNode[], roomId: string): ArrangementNode[] => {
	const collection = findCollectionOfRoom(nodes, roomId);
	if (!collection) return nodes;
	const result = withoutRoom(nodes, roomId);
	const index = result.findIndex((node) => node.type === "collection" && node.id === collection.id);
	result.splice(index + 1, 0, { type: "room", id: roomId });
	return result;
};

export const dissolveCollection = (nodes: ArrangementNode[], collectionId: string): ArrangementNode[] =>
	nodes.flatMap((node): ArrangementNode[] =>
		node.type === "collection" && node.id === collectionId ? node.roomIds.map((id) => ({ type: "room", id })) : [node]
	);

export const renameCollection = (nodes: ArrangementNode[], collectionId: string, title: string): ArrangementNode[] =>
	nodes.map((node) => (node.type === "collection" && node.id === collectionId ? { ...node, title } : node));

export const moveNode = (nodes: ArrangementNode[], fromIndex: number, toIndex: number): ArrangementNode[] => {
	const result = [...nodes];
	const [node] = result.splice(fromIndex, 1);
	result.splice(toIndex, 0, node);
	return result;
};

/** Suggests a title from the words two room names start with, e.g. "Mathe 7a" + "Mathe 7b" → "Mathe". */
export const suggestCollectionTitle = (nameA: string, nameB: string, fallback: string): string => {
	const wordsA = nameA.trim().split(/\s+/);
	const wordsB = nameB.trim().split(/\s+/);
	const common: string[] = [];
	for (let i = 0; i < Math.min(wordsA.length, wordsB.length) && wordsA[i] === wordsB[i]; i++) {
		common.push(wordsA[i]);
	}
	return common.join(" ") || fallback;
};
