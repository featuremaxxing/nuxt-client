<template>
	<VCard
		class="room-content-grid-item room-learning-path-card"
		:class="isDraft ? 'bg-white' : 'bg-surface-light'"
		tabindex="0"
		:variant="isDraft ? 'outlined' : 'flat'"
		:aria-label="ariaLabel"
		:data-testid="`board-grid-item-${index}`"
		:ripple="false"
		@keydown.enter.self="router.push(boardPath)"
	>
		<RouterLink
			tabindex="-1"
			:to="boardPath"
			class="grid-item-router-link pa-4"
			:data-testid="`board-grid-item-link-${index}`"
		>
			<div class="d-flex align-center flex-wrap ga-2 pr-8">
				<VIcon size="18" :icon="mdiMapMarkerPath" />
				<h3
					class="grid-item-card-title text-break text-body-1 font-weight-bold ma-0"
					:class="{ 'opacity-80': isDraft }"
					:data-testid="`board-grid-title-${index}`"
				>
					{{ board.title }}
				</h3>
				<VChip v-if="isDraft" size="small" density="comfortable" :data-testid="`board-grid-item-draft-${index}`">
					{{ t("common.words.draft") }}
				</VChip>
				<VChip
					v-if="summaryText"
					size="small"
					density="comfortable"
					variant="tonal"
					:color="isComplete ? 'success' : undefined"
					:data-testid="`learning-path-card-summary-${index}`"
				>
					{{ summaryText }}
				</VChip>
			</div>

			<ol v-if="chain.length > 0" class="lp-chain mt-3 pa-0" :data-testid="`learning-path-card-steps-${index}`">
				<li
					v-for="(step, stepIndex) in chain"
					:key="step.id"
					class="lp-chain__item"
					:data-testid="`learning-path-card-step-${step.boardId}`"
				>
					<span class="lp-chain__step" :class="`lp-chain__step--${stepState(step)}`">
						<VIcon v-if="stepIcon(step)" size="16" :icon="stepIcon(step)" aria-hidden="true" />
						<span class="lp-chain__title">{{ step.title }}</span>
						<span class="d-sr-only">{{ stepLabel(step) }}</span>
					</span>
					<VIcon
						v-if="stepIndex < chain.length - 1"
						size="16"
						class="lp-chain__arrow"
						:icon="mdiArrowRight"
						aria-hidden="true"
					/>
				</li>
			</ol>
			<p v-else class="text-body-2 text-medium-emphasis mt-2 mb-0" :data-testid="`learning-path-card-empty-${index}`">
				{{ t("pages.room.learningPathCard.empty") }}
			</p>
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
import { isEditorSummary, visibleChain } from "./room-learning-paths";
import RoomBoardMenu from "./RoomBoardMenu.vue";
import { RoomBoardItem } from "@/types/room/Room";
import {
	RoomBoardItemResponse,
	RoomLearningPathStepResponse,
	RoomLearningPathStepResponseStatusEnum as StepStatus,
} from "@api-server";
import { mdiArrowRight, mdiCheckCircle, mdiLockOutline, mdiMapMarker, mdiMapMarkerPath } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps({
	board: { type: Object as PropType<RoomBoardItem>, required: true },
	index: { type: Number, required: true },
});

const emit = defineEmits<{
	"update:visibility": [board: RoomBoardItemResponse, isVisible: boolean];
	"delete:board": [board: RoomBoardItemResponse];
	"duplicate:board": [board: RoomBoardItemResponse];
}>();

const { t } = useI18n();
const router = useRouter();

const boardPath = computed(() => `/boards/${props.board.id}`);
const isDraft = computed(() => props.board.isVisible === false);

const summary = computed(() => props.board.learningPath);
const isEditorView = computed(() => !!summary.value && isEditorSummary(summary.value));
const chain = computed(() => (summary.value ? visibleChain(summary.value) : []));

// where the student goes next: the first step that is open
const nextStepId = computed(() => chain.value.find((step) => step.status === StepStatus.Open)?.id);

const doneCount = computed(() => chain.value.filter((step) => step.status === StepStatus.Done).length);

const isComplete = computed(() => {
	if (!summary.value) return false;
	if (isEditorView.value) {
		const students = summary.value.studentCount ?? 0;
		return students > 0 && summary.value.completedStudentCount === students;
	}
	return chain.value.length > 0 && doneCount.value === chain.value.length;
});

const summaryText = computed(() => {
	if (!summary.value || chain.value.length === 0) return "";
	if (isEditorView.value) {
		const students = summary.value.studentCount ?? 0;
		return students > 0
			? t("pages.room.learningPathCard.classProgress", {
					done: summary.value.completedStudentCount ?? 0,
					total: students,
				})
			: t("pages.room.learningPathCard.boardCount", { count: chain.value.length }, chain.value.length);
	}
	return t("pages.learningPath.progress", { done: doneCount.value, total: chain.value.length });
});

type StepState = "done" | "next" | "open" | "locked" | "draft";

const stepState = (step: RoomLearningPathStepResponse): StepState => {
	if (isEditorView.value) return step.isVisible ? "open" : "draft";
	if (step.status === StepStatus.Done) return "done";
	if (step.status === StepStatus.Locked) return "locked";
	return step.id === nextStepId.value ? "next" : "open";
};

const stepIcon = (step: RoomLearningPathStepResponse): string | undefined => {
	switch (stepState(step)) {
		case "done":
			return mdiCheckCircle;
		case "locked":
			return mdiLockOutline;
		case "next":
			return mdiMapMarker;
		default:
			return undefined;
	}
};

const stepLabel = (step: RoomLearningPathStepResponse): string => {
	const state = stepState(step);
	if (state === "draft") return `, ${t("common.words.draft")}`;
	if (state === "next") return `, ${t("pages.room.learningPathCard.next")}`;
	if (isEditorView.value) return "";
	return `, ${t(`pages.learningPath.status.${step.status}`)}`;
};

const ariaLabel = computed(() =>
	[t("pages.room.boardCard.label.learningPath"), props.board.title, summaryText.value].filter(Boolean).join(": ")
);
</script>

<style scoped>
.lp-chain {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	row-gap: 8px;
	list-style: none;
}

.lp-chain__item {
	display: flex;
	align-items: center;
	min-width: 0;
}

.lp-chain__step {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	max-width: 14rem;
	padding: 2px 10px;
	border-radius: 16px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
	background: rgb(var(--v-theme-surface));
	font-size: 0.875rem;
}

.lp-chain__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.lp-chain__step--done {
	border-color: rgb(var(--v-theme-success));
}

.lp-chain__step--done .v-icon {
	color: rgb(var(--v-theme-success));
}

.lp-chain__step--next {
	border: 2px solid rgb(var(--v-theme-primary));
	color: rgb(var(--v-theme-primary));
	font-weight: 700;
}

.lp-chain__step--locked,
.lp-chain__step--draft {
	color: rgba(var(--v-theme-on-surface), 0.6);
	background: transparent;
}

.lp-chain__step--draft {
	border-style: dashed;
}

.lp-chain__arrow {
	margin: 0 4px;
	color: rgba(var(--v-theme-on-surface), 0.5);
}
</style>
