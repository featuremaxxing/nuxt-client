<template>
	<div class="mt-8">
		<!-- one section per kind of board; each keeps its own order within the room's order -->
		<section
			v-for="section in sections"
			:key="section.kind"
			class="room-content-section"
			:aria-labelledby="showHeadings ? `room-section-${section.kind}` : undefined"
			:data-testid="`room-section-${section.kind}`"
		>
			<h2
				v-if="showHeadings"
				:id="`room-section-${section.kind}`"
				class="room-content-section__heading text-subtitle-1 font-weight-bold d-flex align-center ga-2 mb-3"
			>
				<VIcon size="20" :icon="section.icon" />
				{{ section.title }}
			</h2>
			<Sortable
				:ref="(el) => setGridRef(section.kind, el)"
				role="application"
				:list="section.boards"
				:class="`room-content-${section.kind}`"
				item-key="id"
				:options="getSortableOptions({ disabled: !allowedOperations.editContent })"
				@start="isDragging = true"
				@end="onDropEnd($event, section.boards)"
				@focusin.once="notifyOnScreenReader(t('common.instructions.orderBy.arrowKeys'))"
			>
				<template #item="{ element, index }">
					<component
						:is="section.component"
						class="draggable user-select-none room-content-grid-item"
						:class="{
							'cursor-grab room-content-grid-item-editable': allowedOperations.editContent,
							'cursor-default': !allowedOperations.editContent,
						}"
						v-bind="itemProps(element)"
						@contextmenu.prevent
						@click.capture="onItemClick"
						@focusin="focusedBoard = $event.target"
						@keydown.up.down.left.right="onArrowKeyDown($event, section, index)"
						@update:visibility="
							(board: RoomBoardItemResponse, isVisible: boolean) => emit('update:boardVisibility', board, isVisible)
						"
						@delete:board="emit('delete:board', $event)"
						@duplicate:board="emit('duplicate:board', $event)"
					/>
				</template>
			</Sortable>
		</section>
	</div>
</template>

<script setup lang="ts">
import { lockedHintByBoardId, stepInfoByBoardId } from "./room-learning-paths";
import RoomBoardGridItem from "./RoomBoardGridItem.vue";
import RoomFileAreaItem from "./RoomFileAreaItem.vue";
import RoomLearningPathCard from "./RoomLearningPathCard.vue";
import { useAriaLiveNotifier } from "@/composables/ariaLiveNotifier";
import { useSafeTask } from "@/composables/async-tasks.composable";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { RoomBoardItemResponse } from "@api-server";
import { notifyError } from "@data-app";
import { ProgressSummary } from "@data-board-progress";
import { useRoomAllowedOperations, useRoomDetailsStore } from "@data-room";
import { mdiFolderOutline, mdiMapMarkerPath, mdiViewDashboardOutline } from "@icons/material";
import { getGridContainerColumnsCount } from "@util-browser";
import { useErrorHandler } from "@util-error-handling";
import { getSortableOptions } from "@util-sorting";
import { SortableEvent } from "sortablejs";
import { Sortable } from "sortablejs-vue3";
import { Component, computed, nextTick, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	roomId: { type: String, required: true },
	boards: { type: Array as PropType<RoomBoardItem[]>, required: true },
	progressByBoardId: { type: Object as PropType<Record<string, ProgressSummary>>, default: undefined },
});

const emit = defineEmits<{
	"update:boardVisibility": [board: RoomBoardItemResponse, isVisible: boolean];
	"delete:board": [board: RoomBoardItemResponse];
	"duplicate:board": [board: RoomBoardItemResponse];
}>();

const { t } = useI18n();
const { execute, error: reorderError } = useSafeTask();

const { fetchRoomAndBoards, moveBoard } = useRoomDetailsStore();
const { generateErrorText } = useErrorHandler();
const { allowedOperations } = useRoomAllowedOperations();

type SectionKind = "paths" | "boards" | "files";

type Section = {
	kind: SectionKind;
	title: string;
	icon: string;
	component: Component;
	boards: RoomBoardItem[];
};

const kindOf = (board: RoomBoardItem): SectionKind => {
	if (board.layout === BoardLayout.LEARNING_PATH) return "paths";
	if (board.layout === BoardLayout.FILES) return "files";
	return "boards";
};

const sections = computed<Section[]>(() => {
	const all: Section[] = [
		{
			kind: "paths",
			title: t("pages.room.section.learningPaths"),
			icon: mdiMapMarkerPath,
			component: RoomLearningPathCard,
			boards: [],
		},
		{
			kind: "boards",
			title: t("pages.room.section.boards"),
			icon: mdiViewDashboardOutline,
			component: RoomBoardGridItem,
			boards: [],
		},
		{
			kind: "files",
			title: t("pages.room.section.files"),
			icon: mdiFolderOutline,
			component: RoomFileAreaItem,
			boards: [],
		},
	];
	for (const board of props.boards) {
		all.find((section) => section.kind === kindOf(board))?.boards.push(board);
	}

	return all.filter((section) => section.boards.length > 0);
});

// a room with only one kind of boards looks as it always did
const showHeadings = computed(() => sections.value.length > 1);

const stepInfo = computed(() => stepInfoByBoardId(props.boards));

const lockedHints = computed(() => {
	const hints = lockedHintByBoardId(props.boards);
	return Object.fromEntries(
		Object.entries(hints).map(([boardId, hint]) => [
			boardId,
			t(`pages.learningPath.lockedHint.${hint.mode}`, { titles: hint.titles.join(", ") }),
		])
	);
});

// the index is the position in the whole room, so test ids and screen reader positions stay unique
const itemProps = (board: RoomBoardItem) => {
	const index = props.boards.indexOf(board);
	if (kindOf(board) !== "boards") return { board, index };

	return {
		board,
		index,
		roomId: props.roomId,
		progress: props.progressByBoardId?.[board.id],
		learningPathStep: stepInfo.value[board.id],
		lockedHint: lockedHints.value[board.id] ?? "",
	};
};

const gridRefs = new Map<SectionKind, unknown>();
const setGridRef = (kind: SectionKind, el: unknown) => {
	if (el) gridRefs.set(kind, el);
	else gridRefs.delete(kind);
};

const focusedBoard = ref();
const isDragging = ref(false);
const { notifyOnScreenReader } = useAriaLiveNotifier();

// Fix for firefox
const onItemClick = (evt: Event) => {
	if (isDragging.value) {
		evt.preventDefault();
	}
};

// Moves a board to where another board of its section stands in the room's order.
const reorderRoom = (sectionBoards: RoomBoardItem[], newIndex: number, oldIndex: number) => {
	if (newIndex === oldIndex) return;

	const board = sectionBoards[oldIndex];
	const target = sectionBoards[newIndex];
	const toPosition = props.boards.indexOf(target);
	if (!board || toPosition < 0) return;

	execute(async () => {
		if (document.startViewTransition) {
			await document.startViewTransition(async () => {
				await moveBoard(props.roomId, board.id, toPosition);
				await fetchRoomAndBoards(props.roomId);
			}).finished;
		} else {
			await moveBoard(props.roomId, board.id, toPosition);
			await fetchRoomAndBoards(props.roomId);
		}

		notifyOnScreenReader(t("common.actions.moved", { elementName: board.title, position: newIndex + 1 }));
	});
};

const onDropEnd = async ({ newIndex, oldIndex }: SortableEvent, sectionBoards: RoomBoardItem[]) => {
	isDragging.value = false;
	if (newIndex !== undefined && oldIndex !== undefined) {
		reorderRoom(sectionBoards, newIndex, oldIndex);
	}
};

const onArrowKeyDown = (e: KeyboardEvent, section: Section, oldIndex: number) => {
	if (!allowedOperations.value.editContent) return;

	const last = section.boards.length - 1;
	const grid = gridRefs.get(section.kind) as { containerRef?: HTMLElement } | undefined;
	const cols = getGridContainerColumnsCount(grid?.containerRef);

	let newIndex = 0;
	switch (e.key) {
		case "ArrowUp":
			newIndex = Math.max(0, oldIndex - cols);
			break;
		case "ArrowDown":
			newIndex = Math.min(last, oldIndex + cols);
			break;
		case "ArrowLeft":
			newIndex = Math.max(0, oldIndex - 1);
			break;
		case "ArrowRight":
			newIndex = Math.min(last, oldIndex + 1);
			break;
	}
	reorderRoom(section.boards, newIndex, oldIndex);
};

watch(reorderError, (newError) => {
	if (newError) {
		notifyError(generateErrorText("notMoved", "board"));
	}
});

watch(
	() => props.boards,
	async () => {
		await nextTick();
		focusedBoard.value?.focus();
	}
);
</script>
<style scoped>
.room-content-section + .room-content-section {
	margin-top: 2rem;
}

.room-content-boards,
.room-content-paths {
	display: grid;
	grid-gap: 16px;
}

.room-content-boards {
	grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

.room-content-paths {
	grid-template-columns: minmax(0, 1fr);
}

.room-content-files {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
}

.room-content-grid-item {
	view-transition-name: match-element;
}

::view-transition-group(*) {
	animation-duration: 250ms;
	animation-timing-function: cubic-bezier(1, 0, 0, 1);
}
</style>
