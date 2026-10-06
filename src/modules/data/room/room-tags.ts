import { RoomItem } from "@/types/room/Room";
import { RoomTagResponse } from "@api-server";

export type RoomTag = RoomTagResponse;

export type RoomTagGroup = { tag: RoomTag; rooms: RoomItem[] };

const compareNames = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const byRoomName = (a: RoomItem, b: RoomItem) => compareNames(a.name, b.name);

export const byTagName = (a: RoomTag, b: RoomTag) => compareNames(a.name, b.name);

/**
 * Groups the rooms by their personal tags for the "by tags" view: tags and the rooms inside are sorted
 * alphabetically ("Raum 2" before "Raum 10"). A room with several tags is part of several groups.
 */
export const groupRoomsByTag = (rooms: RoomItem[], tags: RoomTag[]) => {
	const groups: RoomTagGroup[] = [...tags]
		.sort(byTagName)
		.map((tag) => ({ tag, rooms: rooms.filter((room) => room.tagIds?.includes(tag.id)).sort(byRoomName) }))
		.filter((group) => group.rooms.length > 0);

	const knownTagIds = new Set(tags.map((tag) => tag.id));
	const untaggedRooms = rooms.filter((room) => !room.tagIds?.some((tagId) => knownTagIds.has(tagId))).sort(byRoomName);

	return { groups, untaggedRooms };
};

export const tagsOfRoom = (room: RoomItem, tags: RoomTag[]): RoomTag[] =>
	tags.filter((tag) => room.tagIds?.includes(tag.id)).sort(byTagName);
