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
import { useLearningRoomApi } from "@data-learning-room";
import { Board } from "@feature-board";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { fetchLearningRoom } = useLearningRoomApi();

const boardId = ref<string>();
const cardCount = ref(0);
const isLoaded = ref(false);

useTitle(computed(() => t("pages.learningRoom.title")));

// the learning room is a personal ColumnBoard, so the regular board component
// renders it - columns, own cards, drag and drop all come from there. Only the
// board id has to be looked up, because the user never sees it in a url.
onMounted(async () => {
	const board = await fetchLearningRoom();

	if (board) {
		boardId.value = board.id;
		cardCount.value = board.columns.reduce((count, column) => count + column.cards.length, 0);
	}
	isLoaded.value = true;
});

const showEmptyHint = computed(() => isLoaded.value && cardCount.value === 0);
</script>
