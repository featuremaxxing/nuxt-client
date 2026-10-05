<template>
	<KebabMenu v-if="hasAnyAllowedOperation" class="board-grid-item-menu" :data-testid="`board-dot-menu-${index}`">
		<KebabMenuActionPublish
			v-if="board.allowedOperations?.updateBoardVisibility && isDraft"
			@click="emit('update:visibility', board, true)"
		/>
		<KebabMenuActionRevert
			v-if="board.allowedOperations?.updateBoardVisibility && !isDraft"
			@click="emit('update:visibility', board, false)"
		/>
		<KebabMenuActionDuplicate v-if="board.allowedOperations?.copyBoard" @click="emit('duplicate:board', board)" />
		<KebabMenuActionDelete v-if="board.allowedOperations?.deleteBoard" @click="emit('delete:board', board)" />
	</KebabMenu>
</template>

<script setup lang="ts">
import { RoomBoardItem } from "@/types/room/Room";
import { RoomBoardItemResponse } from "@api-server";
import {
	KebabMenu,
	KebabMenuActionDelete,
	KebabMenuActionDuplicate,
	KebabMenuActionPublish,
	KebabMenuActionRevert,
} from "@ui-kebab-menu";
import { computed, PropType } from "vue";

const props = defineProps({
	board: { type: Object as PropType<RoomBoardItem>, required: true },
	index: { type: Number, required: true },
});

const emit = defineEmits<{
	"update:visibility": [board: RoomBoardItemResponse, isVisible: boolean];
	"delete:board": [board: RoomBoardItemResponse];
	"duplicate:board": [board: RoomBoardItemResponse];
}>();

const isDraft = computed(() => props.board.isVisible === false);

const hasAnyAllowedOperation = computed(() => {
	const { copyBoard, deleteBoard, updateBoardVisibility } = props.board.allowedOperations ?? {};
	return copyBoard || deleteBoard || updateBoardVisibility;
});
</script>

<style>
.board-grid-item-menu {
	position: absolute;
	top: 0.25rem;
	right: 0.25rem;
	z-index: var(--z-elevated);
}
</style>
