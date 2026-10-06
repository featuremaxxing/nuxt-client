import { RoomTag } from "./room-tags";
import { useSafeAxiosTask } from "@/composables/async-tasks.composable";
import { useI18nGlobal } from "@/plugins/i18n";
import { RoomCreateParams, RoomItem } from "@/types/room/Room";
import { $axios } from "@/utils/api";
import { MoveItemBodyParams, RoomApiFactory } from "@api-server";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

export const useRoomStore = defineStore("room-store", () => {
	const PLURAL_COUNT = 2;
	const { t } = useI18nGlobal();
	const roomApi = RoomApiFactory(undefined, "/v3", $axios);

	const rooms = ref<RoomItem[]>([]);
	const tags = ref<RoomTag[]>([]);
	const isEmpty = computed(() => rooms.value.length === 0);

	const { execute, isRunning: isLoading } = useSafeAxiosTask();

	const fetchRoomsPlain = async () => {
		const { result } = await execute(
			roomApi.roomControllerGetRooms,
			t("common.notifications.errors.notLoaded", { type: t("common.labels.room", PLURAL_COUNT) }, PLURAL_COUNT)
		);
		return result;
	};

	const fetchRooms = async () => {
		const result = await fetchRoomsPlain();
		if (result) {
			rooms.value = result?.data.data;
			tags.value = result?.data.tags ?? [];
		}
	};

	const createRoom = async (params: RoomCreateParams) =>
		await execute(
			() => roomApi.roomControllerCreateRoom(params),
			t("common.notifications.errors.notCreated", { type: t("common.labels.room") })
		);

	const moveRoom = async (params: MoveItemBodyParams) =>
		await execute(
			() => roomApi.roomControllerMoveRoom(params),
			t("common.notifications.errors.notMoved", { type: t("common.labels.room") })
		);

	const setRoomTags = async (roomId: string, names: string[]) => {
		const { result, success } = await execute(
			() => roomApi.roomControllerSetRoomTags(roomId, { names }),
			t("pages.rooms.tags.error.notSaved")
		);
		if (result) {
			const { tagIds, tags: allTags } = result.data;
			rooms.value = rooms.value.map((room) => (room.id === roomId ? { ...room, tagIds } : room));
			tags.value = allTags;
		}
		return success;
	};

	/** Renaming a tag to the name of another tag merges both, so the rooms are reloaded afterwards. */
	const renameTag = async (tagId: string, name: string) => {
		const { success } = await execute(
			() => roomApi.roomControllerRenameRoomTag(tagId, { name }),
			t("pages.rooms.tags.error.notSaved")
		);
		await fetchRooms();
		return success;
	};

	const deleteTag = async (tagId: string) => {
		const { success } = await execute(
			() => roomApi.roomControllerDeleteRoomTag(tagId),
			t("pages.rooms.tags.error.notDeleted")
		);
		if (success) {
			tags.value = tags.value.filter((tag) => tag.id !== tagId);
			rooms.value = rooms.value.map((room) =>
				room.tagIds?.includes(tagId) ? { ...room, tagIds: room.tagIds.filter((id) => id !== tagId) } : room
			);
		}
		return success;
	};

	const deleteRoom = async (roomId: string) =>
		await execute(
			() => roomApi.roomControllerDeleteRoom(roomId),
			t("common.notifications.errors.notDeleted", { type: t("common.labels.room") })
		);

	const copyRoom = async (roomId: string) =>
		await execute(
			() => roomApi.roomControllerCopyRoom(roomId),
			t("common.notifications.errors.notDuplicated", { type: t("common.labels.room") })
		);

	const leaveRoom = async (roomId: string) =>
		await execute(
			() => roomApi.roomControllerLeaveRoom(roomId),
			t("common.notifications.errors.notExited", { type: t("common.labels.room") })
		);

	return {
		rooms,
		tags,
		isLoading,
		isEmpty,
		fetchRooms,
		fetchRoomsPlain,
		createRoom,
		copyRoom,
		moveRoom,
		setRoomTags,
		renameTag,
		deleteTag,
		deleteRoom,
		leaveRoom,
	};
});
