<template>
	<section
		class="lp-picker"
		:aria-label="t('pages.learningPath.availableBoards')"
		data-testid="learning-path-board-picker"
	>
		<h2 class="text-subtitle-1 font-weight-bold mb-1">{{ t("pages.learningPath.availableBoards") }}</h2>
		<p class="text-body-2 text-medium-emphasis mb-2">{{ t("pages.learningPath.availableBoardsHint") }}</p>
		<p v-if="boards.length === 0" class="text-body-2" data-testid="learning-path-picker-empty">
			{{ t("pages.learningPath.allAdded") }}
		</p>
		<ul class="lp-picker__list">
			<li
				v-for="board in boards"
				:key="board.id"
				class="lp-picker__item"
				draggable="true"
				:data-testid="`learning-path-picker-board-${board.id}`"
				@dragstart="onDragStart($event, board)"
			>
				<VIcon :icon="mdiDrag" size="18" class="lp-picker__grip" aria-hidden="true" />
				<span class="flex-grow-1">
					{{ board.title }}
					<span v-if="!board.isVisible" class="text-medium-emphasis">({{ t("common.words.draft") }})</span>
				</span>
				<VBtn
					:icon="mdiPlus"
					size="x-small"
					variant="text"
					:aria-label="t('pages.learningPath.addBoard', { title: board.title })"
					:data-testid="`learning-path-picker-add-${board.id}`"
					@click="emit('add', board.id)"
				/>
			</li>
		</ul>
	</section>
</template>

<script setup lang="ts">
import { BOARD_DRAG_TYPE } from "./canvas";
import { type LearningPathAvailableBoard } from "@data-board-learning-path";
import { mdiDrag, mdiPlus } from "@icons/material";
import { PropType } from "vue";
import { useI18n } from "vue-i18n";

defineProps({
	boards: { type: Array as PropType<LearningPathAvailableBoard[]>, required: true },
});

const emit = defineEmits<{
	(e: "add", boardId: string): void;
}>();

const { t } = useI18n();

const onDragStart = (event: DragEvent, board: LearningPathAvailableBoard) => {
	event.dataTransfer?.setData(BOARD_DRAG_TYPE, board.id);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
};
</script>

<style scoped>
.lp-picker {
	width: 260px;
	flex-shrink: 0;
	padding: 16px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	overflow-y: auto;
}

.lp-picker__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.lp-picker__item {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 4px 0;
	cursor: grab;
}

.lp-picker__grip {
	color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
