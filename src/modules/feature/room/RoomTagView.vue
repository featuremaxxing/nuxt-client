<template>
	<div class="mt-8" data-testid="room-tag-view">
		<VAlert v-if="groups.length === 0" type="info" variant="tonal" class="mb-6" data-testid="room-tag-view-empty">
			{{ t("pages.rooms.tags.empty") }}
		</VAlert>
		<div class="room-tag-grid">
			<template v-for="(group, index) in groups" :key="group.tag.id">
				<div class="room-tag-tile" :data-tag-id="group.tag.id">
					<RoomTagStack
						:tag="group.tag"
						:rooms="group.rooms"
						:index
						:is-open="group.tag.id === openTagId"
						tabindex="0"
						role="button"
						:aria-expanded="group.tag.id === openTagId"
						@click="toggle(group.tag.id)"
						@toggle="toggle(group.tag.id)"
						@keydown.enter.self.prevent="toggle(group.tag.id)"
						@keydown.space.self.prevent="toggle(group.tag.id)"
					/>
				</div>
				<RoomTagPanel
					v-if="group.tag.id === openTagId"
					:key="`panel-${group.tag.id}`"
					:tag="group.tag"
					:room-count="group.rooms.length"
					@rename="roomStore.renameTag(group.tag.id, $event)"
					@delete="deleteTag(group.tag)"
					@close="openTagId = undefined"
				>
					<RoomGridItem
						v-for="(room, roomIndex) in group.rooms"
						:key="room.id"
						:room
						:index="roomIndex"
						:current-tag="group.tag"
					/>
				</RoomTagPanel>
			</template>
			<RoomGridItem
				v-for="(room, roomIndex) in untaggedRooms"
				:key="room.id"
				:room
				:index="groups.length + roomIndex"
				data-testid="room-tag-view-untagged"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import RoomGridItem from "./RoomGridItem.vue";
import { useRoomsView } from "./roomsView.composable";
import RoomTagPanel from "./RoomTagPanel.vue";
import RoomTagStack from "./RoomTagStack.vue";
import { RoomItem } from "@/types/room/Room";
import { askDeletion } from "@/utils/confirmation-dialog.utils";
import { groupRoomsByTag, RoomTag, useRoomStore } from "@data-room";
import { useEventListener } from "@vueuse/core";
import { computed, nextTick, PropType, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	rooms: { type: Array as PropType<RoomItem[]>, required: true },
});

const { t } = useI18n();
const roomStore = useRoomStore();
const { openTagId } = useRoomsView();

const grouped = computed(() => groupRoomsByTag(props.rooms, roomStore.tags));
const groups = computed(() => grouped.value.groups);
const untaggedRooms = computed(() => grouped.value.untaggedRooms);

const toggle = (tagId: string) => {
	openTagId.value = openTagId.value === tagId ? undefined : tagId;
};

const deleteTag = async (tag: RoomTag) => {
	const confirmed = await askDeletion(
		t("pages.rooms.tags.deleteDialog.title", { name: tag.name }),
		t("pages.rooms.tags.deleteDialog.text"),
		"info"
	);
	if (!confirmed) return;
	const success = await roomStore.deleteTag(tag.id);
	if (success && openTagId.value === tag.id) openTagId.value = undefined;
};

// a tag that no longer has rooms cannot stay open
watch(groups, (newGroups) => {
	if (openTagId.value && !newGroups.some((group) => group.tag.id === openTagId.value)) {
		openTagId.value = undefined;
	}
});

// opened from elsewhere, e.g. a tag chip: bring the stack into view
watch(
	openTagId,
	async (tagId) => {
		if (!tagId) return;
		await nextTick();
		document.querySelector(`[data-tag-id="${tagId}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
	},
	{ immediate: true }
);

// clicking anywhere else closes the open tag; menus and dialogs live in overlays
useEventListener(document, "click", (event: MouseEvent) => {
	if (!openTagId.value) return;
	const target = event.target as Element | null;
	if (!target?.isConnected) return;
	if (!target.closest(`.room-tag-panel, .v-overlay-container, [data-tag-id="${openTagId.value}"]`)) {
		openTagId.value = undefined;
	}
});
</script>

<style lang="scss" scoped>
.room-tag-grid {
	display: grid;
	grid-gap: 16px;
	grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
	// cards after an open tag fill up its row, the open tag follows below that row
	grid-auto-flow: row dense;
}

// two sheets peeking out behind the card mark a tag as a stack of rooms
.room-tag-tile {
	position: relative;
	isolation: isolate;

	> :first-child {
		height: 100%;
	}

	&::before,
	&::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: 4px;
		background: rgb(var(--v-theme-surface));
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
		z-index: -1;
	}

	&::before {
		transform: translate(5px, 5px);
	}

	&::after {
		transform: translate(10px, 10px);
		opacity: 0.6;
	}
}
</style>
