import { RoomItem } from "@/types/room/Room";
import { createGlobalState, useLocalStorage } from "@vueuse/core";
import { ref } from "vue";

export type RoomsViewMode = "all" | "tags";

/** State of the rooms overview shared by the page, the grids and the room cards. */
export const useRoomsView = createGlobalState(() => {
	const viewMode = useLocalStorage<RoomsViewMode>("rooms-overview-view-mode", "all");
	const openTagId = ref<string>();
	const roomToTag = ref<RoomItem>();

	/** Shows the rooms of one tag, e.g. after a click on a tag chip of a room. */
	const showTag = (tagId: string) => {
		viewMode.value = "tags";
		openTagId.value = tagId;
	};

	const editTags = (room: RoomItem) => {
		roomToTag.value = room;
	};

	return { viewMode, openTagId, roomToTag, showTag, editTags };
});
