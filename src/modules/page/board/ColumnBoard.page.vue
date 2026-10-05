<template>
	<!-- keyed by board: switching between boards (e.g. from a link on a card) starts each view afresh -->
	<FileAreaBoard
		v-if="specialBoard?.layout === BoardLayout.FILES"
		:key="boardId"
		:board-id="boardId"
		:board="specialBoard"
	/>
	<LearningPathBoard
		v-else-if="specialBoard?.layout === BoardLayout.LEARNING_PATH"
		:key="boardId"
		:board-id="boardId"
		:board="specialBoard"
	/>
	<Board v-else-if="isResolved" :key="boardId" :board-id="boardId" />
</template>

<script setup lang="ts">
import { BoardLayout, BoardResponse } from "@api-server";
import { useBoardApi, useSharedBoardPageInformation } from "@data-board";
import { useEnvConfig } from "@data-env";
import { Board } from "@feature-board";
import { FileAreaBoard } from "@feature-board-file-area";
import { LearningPathBoard } from "@feature-board-learning-path";
import { useTitle } from "@vueuse/core";
import { ref, watch } from "vue";

const props = defineProps({
	boardId: {
		type: String,
		required: true,
	},
});

const { pageTitle } = useSharedBoardPageInformation();
const { fetchBoardCall } = useBoardApi();

useTitle(pageTitle);

const specialBoard = ref<BoardResponse>();
const isResolved = ref(false);

const SPECIAL_LAYOUTS: BoardLayout[] = [BoardLayout.FILES, BoardLayout.LEARNING_PATH];

// Only file areas and learning paths are looked up up front, they have their own views. Every
// other board is loaded by the board itself. The page stays mounted when the route switches to
// another board, so this runs for every board id.
const resolveBoard = async (boardId: string) => {
	specialBoard.value = undefined;
	const config = useEnvConfig().value;
	if (!config.FEATURE_BOARD_FILE_AREA_ENABLED && !config.FEATURE_BOARD_LEARNING_PATH_ENABLED) {
		isResolved.value = true;
		return;
	}

	isResolved.value = false;
	try {
		const board = await fetchBoardCall(boardId);
		// a later navigation may have overtaken this request
		if (boardId !== props.boardId) return;
		if (SPECIAL_LAYOUTS.includes(board.layout)) specialBoard.value = board;
	} catch {
		// the board reports the problem (missing rights, unknown board) itself
	} finally {
		if (boardId === props.boardId) isResolved.value = true;
	}
};

watch(() => props.boardId, resolveBoard, { immediate: true });
</script>
