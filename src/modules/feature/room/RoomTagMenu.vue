<template>
	<KebabMenu :aria-label="t('pages.rooms.tags.menu.ariaLabel', { name: room.name })" data-testid="room-tag-menu">
		<KebabMenuAction :icon="mdiTagEditOutline" data-test-id="room-tag-menu-edit" @click="editTags(room)">
			{{ t("pages.rooms.tags.menu.edit") }}
		</KebabMenuAction>
		<KebabMenuAction
			v-if="currentTag"
			:icon="mdiTagRemoveOutline"
			data-test-id="room-tag-menu-remove"
			@click="removeCurrentTag"
		>
			{{ t("pages.rooms.tags.menu.remove", { name: currentTag.name }) }}
		</KebabMenuAction>
	</KebabMenu>
</template>

<script setup lang="ts">
import { useRoomsView } from "./roomsView.composable";
import { RoomItem } from "@/types/room/Room";
import { RoomTag, tagsOfRoom, useRoomStore } from "@data-room";
import { mdiTagEditOutline, mdiTagRemoveOutline } from "@icons/material";
import { KebabMenu, KebabMenuAction } from "@ui-kebab-menu";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	room: { type: Object as PropType<RoomItem>, required: true },
	/** The tag whose rooms are shown around this room; offers to take the room out of it. */
	currentTag: { type: Object as PropType<RoomTag>, default: undefined },
});

const { t } = useI18n();
const roomStore = useRoomStore();
const { editTags } = useRoomsView();

const removeCurrentTag = () => {
	const names = tagsOfRoom(props.room, roomStore.tags)
		.filter((tag) => tag.id !== props.currentTag?.id)
		.map((tag) => tag.name);
	roomStore.setRoomTags(props.room.id, names);
};
</script>
