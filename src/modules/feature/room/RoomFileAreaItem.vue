<template>
	<VCard
		class="room-content-grid-item room-file-area-item"
		:class="isDraft ? 'bg-white' : 'bg-surface-light'"
		tabindex="0"
		:variant="isDraft ? 'outlined' : 'flat'"
		:aria-label="ariaLabel"
		:data-testid="`board-grid-item-${index}`"
		:ripple="false"
		@keydown.enter.self="router.push(boardPath)"
	>
		<RouterLink
			tabindex="-1"
			:to="boardPath"
			class="grid-item-router-link d-flex align-center ga-2 py-3 pl-4"
			:class="hasMenu ? 'pr-12' : 'pr-4'"
			:data-testid="`board-grid-item-link-${index}`"
		>
			<VIcon size="20" :icon="mdiFolderOutline" class="text-medium-emphasis" />
			<h3
				class="grid-item-card-title text-break text-body-1 font-weight-bold ma-0"
				:class="{ 'opacity-80': isDraft }"
				:data-testid="`board-grid-title-${index}`"
			>
				{{ board.title }}
			</h3>
			<span v-if="isDraft" class="text-body-2 text-medium-emphasis">{{ t("common.words.draft") }}</span>
		</RouterLink>

		<RoomBoardMenu
			:board="board"
			:index="index"
			@update:visibility="(board, isVisible) => emit('update:visibility', board, isVisible)"
			@delete:board="emit('delete:board', $event)"
			@duplicate:board="emit('duplicate:board', $event)"
		/>
	</VCard>
</template>

<script setup lang="ts">
import RoomBoardMenu from "./RoomBoardMenu.vue";
import { RoomBoardItem } from "@/types/room/Room";
import { RoomBoardItemResponse } from "@api-server";
import { mdiFolderOutline } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps({
	board: { type: Object as PropType<RoomBoardItem>, required: true },
	index: { type: Number, required: true },
});

const emit = defineEmits<{
	"update:visibility": [board: RoomBoardItemResponse, isVisible: boolean];
	"delete:board": [board: RoomBoardItemResponse];
	"duplicate:board": [board: RoomBoardItemResponse];
}>();

const { t } = useI18n();
const router = useRouter();

const boardPath = computed(() => `/boards/${props.board.id}`);
const isDraft = computed(() => props.board.isVisible === false);

const hasMenu = computed(() => {
	const { copyBoard, deleteBoard, updateBoardVisibility } = props.board.allowedOperations ?? {};
	return copyBoard || deleteBoard || updateBoardVisibility;
});

const ariaLabel = computed(() => {
	const draft = isDraft.value ? ` - ${t("common.words.draft")}` : "";
	return `${t("pages.room.boardCard.label.fileArea")}${draft}: ${props.board.title}`;
});
</script>

<style scoped>
.room-file-area-item :deep(.board-grid-item-menu) {
	top: 50%;
	transform: translateY(-50%);
}
</style>
