<template>
	<VCard
		class="room-content-grid-item d-flex flex-column"
		:class="[isDraft || isLocked ? 'bg-white' : 'bg-surface-light', { 'room-content-grid-item--locked': isLocked }]"
		tabindex="0"
		:variant="isDraft || isLocked ? 'outlined' : 'flat'"
		:aria-label="ariaLabel"
		:data-testid="`board-grid-item-${index}`"
		:ripple="false"
		@keydown.enter.self="router.push(boardPath)"
	>
		<!-- the whole card leads to the board; the kebab menu sits on top of the link -->
		<RouterLink
			tabindex="-1"
			:to="boardPath"
			class="grid-item-router-link flex-grow-1 pb-4"
			:data-testid="`board-grid-item-link-${index}`"
		>
			<VCardSubtitle
				class="mt-4 d-flex align-center"
				:class="{ 'opacity-80': isDraft }"
				:data-testid="`board-grid-item-subtitle-${index}`"
			>
				<VIcon size="14" class="mr-1" :icon="subtitleIcon" />
				{{ subtitleText }}
			</VCardSubtitle>
			<VCardTitle
				:class="{ 'opacity-80': isDraft || isLocked }"
				class="grid-item-card-title"
				:data-testid="`board-grid-title-${index}`"
			>
				<h3 class="text-break text-body-1 font-weight-bold ma-0">{{ board.title }}</h3>
			</VCardTitle>
			<template v-if="!isLocked">
				<p
					v-for="step in learningPathSteps"
					:key="step.title"
					class="mx-4 mb-2 text-body-2 text-medium-emphasis d-flex align-center"
					:data-testid="`board-grid-item-path-step-${index}`"
				>
					<LearningPathMarker :color="step.color" :size="14" class="mr-2" />
					{{ t("pages.room.boardCard.pathStep", step) }}
				</p>
			</template>
			<p
				v-if="isRework && !isLocked"
				class="mx-4 mb-2 text-body-2 d-flex align-center"
				:data-testid="`board-grid-item-rework-${index}`"
			>
				<LearningPathReworkMark :size="16" class="mr-2" />
				<span>
					<strong>{{ t("pages.learningPath.rework") }}:</strong> {{ t("pages.learningPath.reworkHint") }}
				</span>
			</p>
			<p
				v-if="lockedBy"
				class="mx-4 mb-0 text-body-2 text-medium-emphasis d-flex align-center"
				:data-testid="`board-grid-item-locked-${index}`"
			>
				<VIcon size="16" class="mr-1" :icon="mdiLockOutline" />
				{{ lockedHint || t("pages.room.boardCard.locked", { title: lockedBy.title }) }}
			</p>
			<ProgressBar
				v-if="progress && progress.total > 0"
				:done="progress.done"
				:total="progress.total"
				:label="t('pages.room.boardCard.progress', { percent: progressPercent })"
				class="mx-4"
				:data-testid="`board-grid-item-progress-${index}`"
			/>
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
import { type LearningPathStepInfo } from "./room-learning-paths";
import RoomBoardMenu from "./RoomBoardMenu.vue";
import { BoardLayout } from "@/types/board/Board";
import { RoomBoardItem } from "@/types/room/Room";
import { RoomBoardItemResponse } from "@api-server";
import { ProgressSummary } from "@data-board-progress";
import { ProgressBar } from "@feature-board-progress";
import {
	mdiFolderMultipleOutline,
	mdiLockOutline,
	mdiMapMarkerPath,
	mdiViewAgendaOutline,
	mdiViewDashboardOutline,
} from "@icons/material";
import { LearningPathMarker, LearningPathReworkMark } from "@ui-room-details";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps({
	roomId: { type: String, required: true },
	board: { type: Object as PropType<RoomBoardItem>, required: true },
	index: { type: Number, required: true },
	progress: { type: Object as PropType<ProgressSummary>, default: undefined },
	// where the board sits in a learning path of the room
	learningPathSteps: { type: Array as PropType<LearningPathStepInfo[]>, default: () => [] },
	// what still has to be completed before a locked board opens
	lockedHint: { type: String, default: "" },
	// the student completed the board before, but something new came up
	isRework: { type: Boolean, default: false },
});

const { t } = useI18n();
const router = useRouter();

const emit = defineEmits<{
	"update:visibility": [board: RoomBoardItemResponse, isVisible: boolean];
	"delete:board": [board: RoomBoardItemResponse];
	"duplicate:board": [board: RoomBoardItemResponse];
}>();

const isListBoard = computed(() => props.board.layout === BoardLayout.LIST);

const isDraft = computed(() => props.board.isVisible === false);

const isFileArea = computed(() => props.board.layout === BoardLayout.FILES);

const isLearningPath = computed(() => props.board.layout === BoardLayout.LEARNING_PATH);

// a learning path keeps this board closed for the user: the card leads to the learning path instead
const lockedBy = computed(() => props.board.lockedByLearningPath);
const isLocked = computed(() => !!lockedBy.value);

const progressPercent = computed(() =>
	props.progress && props.progress.total > 0 ? Math.round((props.progress.done / props.progress.total) * 100) : 0
);

const subtitleIcon = computed(() => {
	if (isLocked.value) return mdiLockOutline;
	if (isFileArea.value) return mdiFolderMultipleOutline;
	if (isLearningPath.value) return mdiMapMarkerPath;
	return isListBoard.value ? mdiViewAgendaOutline : mdiViewDashboardOutline;
});

const subtitleText = computed(() => {
	let text = isListBoard.value
		? t("pages.room.boardCard.label.listBoard")
		: t("pages.room.boardCard.label.columnBoard");
	if (isFileArea.value) text = t("pages.room.boardCard.label.fileArea");
	if (isLearningPath.value) text = t("pages.room.boardCard.label.learningPath");

	if (isLocked.value) return `${text} - ${t("pages.room.boardCard.label.locked")}`;

	if (isDraft.value) {
		const suffix = ` - ${t("common.words.draft")}`;
		return text + suffix;
	}

	return text;
});

const ariaLabel = computed(() => {
	const target = isLocked.value ? `, ${t("pages.room.boardCard.label.openLearningPath")}` : "";
	return `${subtitleText.value}: ${props.board.title}${target}`;
});

const boardPath = computed(() => (lockedBy.value?.id ? `/boards/${lockedBy.value.id}` : `/boards/${props.board.id}`));
</script>

<style>
.room-content-grid-item-editable:focus-within {
	outline: auto;
}

.room-content-grid-item.cursor-default:hover:not(:has(.grid-item-router-link:hover)) .v-card__overlay {
	opacity: 0;
}

.room-content-grid-item--locked {
	border-style: dashed !important;
}

.grid-item-card-title {
	max-width: 100%;
	line-height: 1.5 !important;
	white-space: normal;
}

.grid-item-router-link {
	display: block;
	text-decoration: none;
	color: inherit;
}

.grid-item-router-link:hover .grid-item-card-title {
	text-decoration: underline;
}

.grid-item-router-link .v-card-subtitle {
	padding-right: 3rem;
}
</style>
