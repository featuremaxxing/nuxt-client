<template>
	<section
		class="lp-picker"
		:aria-label="t('pages.learningPath.availableBoards')"
		data-testid="learning-path-board-picker"
	>
		<VBtn
			block
			variant="outlined"
			size="small"
			:prepend-icon="mdiFormatText"
			class="mb-4"
			data-testid="learning-path-picker-add-text"
			@click="emit('add-text')"
		>
			{{ t("pages.learningPath.text.add") }}
		</VBtn>
		<!-- the quick way: paste the copied link of a card (or board), several at once are fine -->
		<VTextarea
			v-model="linkText"
			:label="t('pages.learningPath.links.label')"
			:hint="t('pages.learningPath.links.hint')"
			:error-messages="linkError"
			rows="1"
			auto-grow
			density="compact"
			class="mb-1"
			data-testid="learning-path-picker-links"
			@keydown.enter.exact.prevent="onAddLinks"
			@update:model-value="linkError = ''"
		/>
		<VBtn
			block
			size="small"
			variant="flat"
			color="primary"
			:disabled="!linkText.trim()"
			class="mb-4"
			data-testid="learning-path-picker-links-add"
			@click="onAddLinks"
		>
			{{ t("pages.learningPath.links.add") }}
		</VBtn>
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

		<template v-if="roomBoards.length > 0">
			<h2 class="text-subtitle-1 font-weight-bold mt-4 mb-1">{{ t("pages.learningPath.cards.title") }}</h2>
			<p class="text-body-2 text-medium-emphasis mb-2">{{ t("pages.learningPath.cards.pickerHint") }}</p>
			<ul class="lp-picker__list">
				<li v-for="board in roomBoards" :key="board.id" :data-testid="`learning-path-picker-cards-of-${board.id}`">
					<button
						type="button"
						class="lp-picker__toggle"
						:aria-expanded="expandedBoardId === board.id"
						:data-testid="`learning-path-picker-expand-${board.id}`"
						@click="toggle(board.id)"
					>
						<VIcon :icon="expandedBoardId === board.id ? mdiChevronDown : mdiChevronRight" size="18" />
						<span class="flex-grow-1 text-left">{{ board.title }}</span>
					</button>
					<template v-if="expandedBoardId === board.id">
						<VProgressLinear v-if="isLoadingCards" indeterminate class="my-1" />
						<p v-else-if="columns.length === 0" class="text-body-2 text-medium-emphasis ml-6">
							{{ t("pages.learningPath.cards.empty") }}
						</p>
						<div v-for="column in columns" v-else :key="column.id" class="ml-6">
							<p
								class="text-caption font-weight-bold mt-2 mb-0"
								:data-testid="`learning-path-picker-column-${column.id}`"
							>
								{{ column.title }}
							</p>
							<ul class="lp-picker__list">
								<li
									v-for="card in column.cards"
									:key="card.id"
									class="lp-picker__item"
									:class="{ 'lp-picker__item--added': cardIdsInPath.has(card.id) }"
									:draggable="!cardIdsInPath.has(card.id)"
									:data-testid="`learning-path-picker-card-${card.id}`"
									@dragstart="onCardDragStart($event, board.id, card.id)"
								>
									<VIcon :icon="mdiCardTextOutline" size="16" class="lp-picker__grip" aria-hidden="true" />
									<span class="flex-grow-1 text-body-2">{{
										card.title || t("pages.learningPath.cards.untitled")
									}}</span>
									<VBtn
										v-if="!cardIdsInPath.has(card.id)"
										:icon="mdiPlus"
										size="x-small"
										variant="text"
										:aria-label="
											t('pages.learningPath.cards.add', { title: card.title || t('pages.learningPath.cards.untitled') })
										"
										:data-testid="`learning-path-picker-add-card-${card.id}`"
										@click="emit('add-card', board.id, card.id)"
									/>
									<VIcon v-else :icon="mdiCheck" size="16" :aria-label="t('pages.learningPath.cards.added')" />
								</li>
							</ul>
						</div>
					</template>
				</li>
			</ul>
		</template>
	</section>
</template>

<script setup lang="ts">
import { BOARD_DRAG_TYPE, CARD_DRAG_TYPE } from "./canvas";
import {
	fetchPickableCards,
	type LearningPathAvailableBoard,
	type LearningPathPickableColumn,
	type LearningPathStepLink,
	parseStepLinks,
} from "@data-board-learning-path";
import {
	mdiCardTextOutline,
	mdiCheck,
	mdiChevronDown,
	mdiChevronRight,
	mdiDrag,
	mdiFormatText,
	mdiPlus,
} from "@icons/material";
import { PropType, ref } from "vue";
import { useI18n } from "vue-i18n";

defineProps({
	// boards that can be added as a whole
	boards: { type: Array as PropType<LearningPathAvailableBoard[]>, required: true },
	// every board of the room, to add single cards of
	roomBoards: { type: Array as PropType<LearningPathAvailableBoard[]>, default: () => [] },
	cardIdsInPath: { type: Object as PropType<Set<string>>, default: () => new Set<string>() },
});

const emit = defineEmits<{
	(e: "add", boardId: string): void;
	(e: "add-card", boardId: string, cardId: string): void;
	(e: "add-text"): void;
	(e: "add-links", links: LearningPathStepLink[]): void;
}>();

const { t } = useI18n();

const linkText = ref("");
const linkError = ref("");

const onAddLinks = () => {
	if (!linkText.value.trim()) return;
	const links = parseStepLinks(linkText.value);
	if (links.length === 0) {
		linkError.value = t("pages.learningPath.links.none");
		return;
	}
	emit("add-links", links);
	linkText.value = "";
};

const onDragStart = (event: DragEvent, board: LearningPathAvailableBoard) => {
	event.dataTransfer?.setData(BOARD_DRAG_TYPE, board.id);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
};

const onCardDragStart = (event: DragEvent, boardId: string, cardId: string) => {
	event.dataTransfer?.setData(CARD_DRAG_TYPE, `${boardId}:${cardId}`);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
};

// one board is open at a time, its cards are loaded when it opens
const expandedBoardId = ref<string>();
const columns = ref<LearningPathPickableColumn[]>([]);
const isLoadingCards = ref(false);

const toggle = async (boardId: string) => {
	if (expandedBoardId.value === boardId) {
		expandedBoardId.value = undefined;
		return;
	}
	expandedBoardId.value = boardId;
	columns.value = [];
	isLoadingCards.value = true;
	try {
		const loaded = await fetchPickableCards(boardId);
		if (expandedBoardId.value === boardId) {
			// the columns in their order, an untitled one by its number
			columns.value = loaded
				.map((column, index) => ({
					...column,
					title: column.title || t("pages.learningPath.cards.column", { position: index + 1 }),
				}))
				.filter((column) => column.cards.length > 0);
		}
	} catch {
		columns.value = [];
	} finally {
		isLoadingCards.value = false;
	}
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
	max-height: 65vh;
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

.lp-picker__item--added {
	cursor: default;
	color: rgba(var(--v-theme-on-surface), 0.6);
}

.lp-picker__toggle {
	display: flex;
	align-items: center;
	gap: 4px;
	width: 100%;
	padding: 4px 0;
	font: inherit;
	color: inherit;
}

.lp-picker__grip {
	color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
