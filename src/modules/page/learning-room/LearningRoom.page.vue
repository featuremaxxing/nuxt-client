<template>
	<div>
		<VAlert
			v-if="showEmptyHint"
			type="info"
			variant="tonal"
			class="mx-4 mt-4 mb-0"
			data-testid="learning-room-empty-hint"
		>
			<div class="text-h6 mb-1">{{ t("pages.learningRoom.empty.title") }}</div>
			<div class="mb-3">{{ t("pages.learningRoom.empty.description") }}</div>
			<VBtn variant="outlined" size="small" to="/rooms" data-testid="learning-room-empty-action">
				{{ t("pages.learningRoom.empty.action") }}
			</VBtn>
		</VAlert>

		<Board v-if="boardId" :board-id="boardId" />
	</div>
</template>

<script setup lang="ts">
import { useBoardStore } from "@data-board";
import { useLearningRoomApi, usePinnedCardsStore } from "@data-learning-room";
import { Board } from "@feature-board";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { fetchLearningRoom } = useLearningRoomApi();
const pinnedCardsStore = usePinnedCardsStore();
const boardStore = useBoardStore();

const boardId = ref<string>();

useTitle(computed(() => t("pages.learningRoom.title")));

// the learning room is a personal ColumnBoard, so the regular board component
// renders it - columns, own cards, drag and drop all come from there. Only the
// board id has to be looked up, because the user never sees it in a url.
onMounted(async () => {
	const board = await fetchLearningRoom();

	if (board) {
		boardId.value = board.id;
	}

	await pinnedCardsStore.ensureLoaded();

	// Unpinning goes through the learning room api, so the board store never hears
	// about it and the card would sit there until a reload. The same watcher also
	// catches pins made in another tab, which arrive via the broadcast channel.
	// deliberately not pinnedCardIds: that updates optimistically, and reloading
	// before the server has removed the pointer would fetch the card straight back
	watch(
		() => pinnedCardsStore.confirmedChangeCount,
		async () => {
			await boardStore.reloadBoard();
		}
	);
});

// follows the live board, so the hint goes away with the first card and comes
// back once the last one is gone
const showEmptyHint = computed(() => {
	const board = boardStore.board;
	if (!board || board.id !== boardId.value) return false;

	return board.columns.every((column) => column.cards.length === 0);
});
</script>
