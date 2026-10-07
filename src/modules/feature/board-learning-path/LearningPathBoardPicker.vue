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
		<p class="text-caption text-medium-emphasis mb-2">{{ t("pages.learningPath.picker.hint") }}</p>
		<VTextField
			v-model="search"
			:prepend-inner-icon="mdiMagnify"
			:placeholder="t('pages.learningPath.picker.search')"
			:aria-label="t('pages.learningPath.picker.search')"
			density="compact"
			hide-details
			clearable
			class="mb-2"
			data-testid="learning-path-picker-search"
		/>
		<VProgressLinear v-if="isSearching" indeterminate class="mb-1" />
		<p
			v-if="visibleBoards.length === 0"
			class="text-body-2 text-medium-emphasis"
			data-testid="learning-path-picker-empty"
		>
			{{ query ? t("pages.learningPath.picker.noMatch") : t("pages.learningPath.picker.noBoards") }}
		</p>

		<!-- every board once: a click opens its cards, + adds it as a whole -->
		<ul class="lp-picker__list">
			<li v-for="board in visibleBoards" :key="board.id" :data-testid="`learning-path-picker-board-${board.id}`">
				<div
					class="lp-picker__row lp-picker__row--board"
					:draggable="canAddBoard(board.id)"
					:title="board.title"
					@dragstart="onDragStart($event, board.id)"
				>
					<button
						type="button"
						class="lp-picker__toggle"
						:aria-expanded="isExpanded(board.id)"
						:data-testid="`learning-path-picker-expand-${board.id}`"
						@click="toggle(board.id)"
					>
						<VIcon :icon="isExpanded(board.id) ? mdiChevronDown : mdiChevronRight" size="18" aria-hidden="true" />
						<span class="lp-picker__title">{{ board.title }}</span>
						<span v-if="!board.isVisible" class="lp-picker__badge">{{ t("common.words.draft") }}</span>
					</button>
					<VBtn
						v-if="canAddBoard(board.id)"
						:icon="mdiPlus"
						size="x-small"
						variant="text"
						:aria-label="t('pages.learningPath.addBoard', { title: board.title })"
						:data-testid="`learning-path-picker-add-${board.id}`"
						@click="emit('add', board.id)"
					/>
					<VIcon
						v-else
						:icon="mdiCheck"
						size="18"
						class="lp-picker__added"
						:aria-label="t('pages.learningPath.picker.boardAdded')"
						:data-testid="`learning-path-picker-board-added-${board.id}`"
					/>
				</div>

				<div v-if="isExpanded(board.id)" class="lp-picker__cards">
					<VProgressLinear v-if="loadingIds.has(board.id)" indeterminate class="my-1" />
					<p v-else-if="columnsOf(board.id).length === 0" class="text-caption text-medium-emphasis my-1">
						{{ query ? t("pages.learningPath.picker.noMatch") : t("pages.learningPath.cards.empty") }}
					</p>
					<template v-for="column in columnsOf(board.id)" v-else :key="column.id">
						<p class="lp-picker__column" :data-testid="`learning-path-picker-column-${column.id}`">
							{{ column.title }}
						</p>
						<ul class="lp-picker__list">
							<li
								v-for="card in column.cards"
								:key="card.id"
								class="lp-picker__row lp-picker__row--card"
								:class="{ 'lp-picker__row--added': cardIdsInPath.has(card.id) }"
								:draggable="!cardIdsInPath.has(card.id)"
								:title="card.title"
								:data-testid="`learning-path-picker-card-${card.id}`"
								@dragstart="onCardDragStart($event, board.id, card.id)"
							>
								<VIcon :icon="mdiCardTextOutline" size="16" class="lp-picker__grip" aria-hidden="true" />
								<span class="lp-picker__title text-body-2">{{
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
								<VIcon
									v-else
									:icon="mdiCheck"
									size="16"
									class="lp-picker__added"
									:aria-label="t('pages.learningPath.cards.added')"
								/>
							</li>
						</ul>
					</template>
				</div>
			</li>
		</ul>
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
	mdiFormatText,
	mdiMagnify,
	mdiPlus,
} from "@icons/material";
import { refDebounced } from "@vueuse/core";
import { computed, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	// boards that can still be added as a whole
	boards: { type: Array as PropType<LearningPathAvailableBoard[]>, required: true },
	// every board of the room in the room's order, to add it or single cards of it
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

// --- pasted links ---

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

// --- the boards and their cards ---

// without the room's boards, the addable ones are the list
const allBoards = computed(() => (props.roomBoards.length > 0 ? props.roomBoards : props.boards));
const addableIds = computed(() => new Set(props.boards.map((board) => board.id)));
const canAddBoard = (boardId: string) => addableIds.value.has(boardId);

// the cards of a board are loaded once, when it is opened or searched
const cardsByBoard = ref<Record<string, LearningPathPickableColumn[]>>({});
const loadingIds = ref(new Set<string>());

const loadCards = async (boardId: string): Promise<void> => {
	if (cardsByBoard.value[boardId] || loadingIds.value.has(boardId)) return;
	loadingIds.value = new Set([...loadingIds.value, boardId]);
	try {
		const loaded = await fetchPickableCards(boardId);
		// the columns in their order, an untitled one by its number
		cardsByBoard.value = {
			...cardsByBoard.value,
			[boardId]: loaded.map((column, index) => ({
				...column,
				title: column.title || t("pages.learningPath.cards.column", { position: index + 1 }),
			})),
		};
	} catch {
		cardsByBoard.value = { ...cardsByBoard.value, [boardId]: [] };
	} finally {
		const rest = new Set(loadingIds.value);
		rest.delete(boardId);
		loadingIds.value = rest;
	}
};

const expandedIds = ref(new Set<string>());

const toggle = async (boardId: string) => {
	const next = new Set(expandedIds.value);
	if (next.has(boardId)) {
		next.delete(boardId);
		expandedIds.value = next;
		return;
	}
	next.add(boardId);
	expandedIds.value = next;
	await loadCards(boardId);
};

// --- search ---

const search = ref<string | null>("");
const query = computed(() => (search.value ?? "").trim().toLowerCase());
const debouncedQuery = refDebounced(query, 250);
const matches = (text: string) => text.toLowerCase().includes(query.value);

// a search looks into the cards of every board
watch(debouncedQuery, async (value) => {
	if (value) await Promise.all(allBoards.value.map((board) => loadCards(board.id)));
});
const isSearching = computed(() => !!query.value && loadingIds.value.size > 0);

const matchingColumns = (boardId: string): LearningPathPickableColumn[] =>
	(cardsByBoard.value[boardId] ?? [])
		.map((column) => ({ ...column, cards: column.cards.filter((card) => matches(card.title)) }))
		.filter((column) => column.cards.length > 0);

const boardMatches = (board: LearningPathAvailableBoard) => matches(board.title);

const visibleBoards = computed(() =>
	query.value
		? allBoards.value.filter((board) => boardMatches(board) || matchingColumns(board.id).length > 0)
		: allBoards.value
);

// while searching, boards with matching cards open by themselves and show only those
const isExpanded = (boardId: string) =>
	expandedIds.value.has(boardId) || (!!query.value && matchingColumns(boardId).length > 0);

const columnsOf = (boardId: string): LearningPathPickableColumn[] => {
	const board = allBoards.value.find((candidate) => candidate.id === boardId);
	if (query.value && board && !boardMatches(board)) return matchingColumns(boardId);
	return (cardsByBoard.value[boardId] ?? []).filter((column) => column.cards.length > 0);
};

// --- dragging onto the canvas ---

const onDragStart = (event: DragEvent, boardId: string) => {
	if (!canAddBoard(boardId)) return;
	event.dataTransfer?.setData(BOARD_DRAG_TYPE, boardId);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
};

const onCardDragStart = (event: DragEvent, boardId: string, cardId: string) => {
	event.stopPropagation();
	event.dataTransfer?.setData(CARD_DRAG_TYPE, `${boardId}:${cardId}`);
	if (event.dataTransfer) event.dataTransfer.effectAllowed = "copy";
};
</script>

<style scoped>
.lp-picker {
	width: 300px;
	flex-shrink: 0;
	padding: 16px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	overflow-y: auto;
	max-height: 75vh;
}

.lp-picker__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.lp-picker__row {
	display: flex;
	align-items: center;
	gap: 4px;
	min-height: 32px;
	border-radius: 4px;
}

.lp-picker__row:hover {
	background: rgba(var(--v-theme-on-surface), 0.04);
}

.lp-picker__row--board[draggable="true"],
.lp-picker__row--card[draggable="true"] {
	cursor: grab;
}

.lp-picker__row--added {
	color: rgba(var(--v-theme-on-surface), 0.6);
}

.lp-picker__toggle {
	display: flex;
	align-items: center;
	gap: 4px;
	flex: 1 1 auto;
	min-width: 0;
	padding: 4px 0;
	font: inherit;
	font-weight: 600;
	color: inherit;
	text-align: left;
}

/* one line, the full title is the tooltip */
.lp-picker__title {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.lp-picker__badge {
	flex-shrink: 0;
	padding: 0 6px;
	border-radius: 10px;
	font-size: 0.75rem;
	font-weight: normal;
	background: rgba(var(--v-theme-on-surface), 0.08);
}

.lp-picker__added {
	flex-shrink: 0;
	margin: 0 5px;
	color: rgb(var(--v-theme-success));
}

.lp-picker__cards {
	margin: 0 0 8px 22px;
	padding-left: 8px;
	border-left: 2px solid rgba(var(--v-theme-on-surface), 0.12);
}

.lp-picker__column {
	margin: 8px 0 2px;
	font-size: 0.7rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: rgba(var(--v-theme-on-surface), 0.6);
}

.lp-picker__grip {
	flex-shrink: 0;
	color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
