<template>
	<FileAreaBoard v-if="fileAreaBoard" :board-id="boardId" :board="fileAreaBoard" />
	<Board v-else-if="isResolved" :board-id="boardId" />
</template>

<script setup lang="ts">
import { BoardLayout, BoardResponse } from "@api-server";
import { useBoardApi, useSharedBoardPageInformation } from "@data-board";
import { useEnvConfig } from "@data-env";
import { Board } from "@feature-board";
import { FileAreaBoard } from "@feature-board-file-area";
import { useTitle } from "@vueuse/core";
import { onMounted, ref } from "vue";

const props = defineProps({
	boardId: {
		type: String,
		required: true,
	},
});

const { pageTitle } = useSharedBoardPageInformation();
const { fetchBoardCall } = useBoardApi();

useTitle(pageTitle);

const fileAreaBoard = ref<BoardResponse>();
// Only file areas are looked up up front, they have their own view. Every other board is
// loaded by the board itself.
const isResolved = ref(!useEnvConfig().value.FEATURE_BOARD_FILE_AREA_ENABLED);

onMounted(async () => {
	if (isResolved.value) return;

	try {
		const board = await fetchBoardCall(props.boardId);
		if (board.layout === BoardLayout.FILES) fileAreaBoard.value = board;
	} catch {
		// the board reports the problem (missing rights, unknown board) itself
	} finally {
		isResolved.value = true;
	}
});
</script>
