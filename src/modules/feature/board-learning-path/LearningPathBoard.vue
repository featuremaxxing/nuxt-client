<template>
	<DefaultWireframe max-width="full" :breadcrumbs="breadcrumbs">
		<template #header>
			<div class="d-flex align-center">
				<LearningPathMarker :color="color" :size="22" :label="colorName" class="mr-3" />
				<h1 data-testid="learning-path-title">{{ title }}</h1>
				<VChip v-if="!isVisible" class="ml-4" data-testid="board-draft-chip">
					{{ t("common.words.draft") }}
				</VChip>
				<KebabMenu v-if="canManage" class="ml-2" data-testid="board-menu-btn">
					<KebabMenuActionRename @click="isTitleDialogOpen = true" />
					<KebabMenuAction :icon="mdiPalette" data-test-id="kebab-menu-action-color" @click="isColorDialogOpen = true">
						{{ t("pages.learningPath.color.change") }}
					</KebabMenuAction>
					<KebabMenuActionPublish v-if="!isVisible" @click="setVisibility(true)" />
					<KebabMenuActionRevert v-else @click="setVisibility(false)" />
					<KebabMenuActionDelete @click="onDeleteBoard" />
				</KebabMenu>
			</div>
		</template>

		<VProgressLinear v-if="isLoading" indeterminate />
		<VAlert v-else-if="hasError" type="error" variant="tonal" data-testid="learning-path-error">
			{{ t("pages.learningPath.error.load") }}
		</VAlert>
		<template v-else>
			<p class="text-body-2 text-medium-emphasis mb-2" data-testid="learning-path-intro">
				{{ isEditor ? t("pages.learningPath.intro.editor") : t("pages.learningPath.intro.student") }}
			</p>
			<p
				v-if="isEditor && path?.studentCount !== undefined"
				class="text-body-2 mb-2"
				data-testid="learning-path-participants"
			>
				{{
					t("pages.learningPath.participants", {
						count: path.studentCount,
						done: path.completedStudentCount ?? 0,
					})
				}}
			</p>
			<VAlert
				v-if="!isEditor && canChoose"
				:type="isEnrolled ? 'success' : 'info'"
				variant="tonal"
				density="compact"
				class="mb-4"
				data-testid="learning-path-enrollment"
			>
				<div class="d-flex align-center flex-wrap ga-2">
					<span>{{
						isEnrolled ? t("pages.learningPath.enrollment.enrolled") : t("pages.learningPath.enrollment.notEnrolled")
					}}</span>
					<VBtn v-if="isEnrolled" size="small" variant="text" data-testid="learning-path-leave" @click="leave">
						{{ t("pages.learningPath.enrollment.leave") }}
					</VBtn>
					<VBtn v-else size="small" variant="flat" color="primary" data-testid="learning-path-enroll" @click="enroll">
						{{ t("pages.learningPath.enrollment.enroll") }}
					</VBtn>
				</div>
			</VAlert>
			<VAlert v-if="steps.length === 0" type="info" variant="tonal" class="mb-4" data-testid="learning-path-empty">
				{{ isEditor ? t("pages.learningPath.empty.editor") : t("pages.learningPath.empty.student") }}
			</VAlert>
			<div class="lp-layout">
				<LearningPathBoardPicker
					v-if="isEditor"
					:boards="availableBoards"
					:room-boards="roomBoards"
					:card-ids-in-path="cardIdsInPath"
					@add="onAddBoard"
					@add-card="onAddCard"
				/>
				<LearningPathCanvas
					ref="canvas"
					class="flex-grow-1"
					:steps="steps"
					:is-editor="isEditor"
					:color="pathColor"
					:selected-step-id="selectedStep?.id"
					:hints="hints"
					@select="selectedStepId = $event"
					@open="openStep"
					@move="moveStep"
					@connect="onConnect"
					@drop-board="addStep"
					@drop-card="onDropCard"
				/>
				<LearningPathStepPanel
					v-if="isEditor && selectedStep"
					:step="selectedStep"
					:steps="steps"
					:path-id="boardId"
					@update="updateStep(selectedStep.id, $event)"
					@connect="onConnect($event, selectedStep.id)"
					@disconnect="disconnect($event, selectedStep.id)"
					@remove="onRemoveStep(selectedStep)"
					@close="selectedStepId = undefined"
				/>
			</div>
			<LearningPathList v-if="steps.length > 0" class="mt-6" :steps="steps" :hints="hints" :path-id="boardId" />
		</template>
	</DefaultWireframe>
	<LearningPathTitleDialog v-model:is-dialog-open="isTitleDialogOpen" :name="title" @confirm="onRename" />
	<LearningPathColorDialog v-model="isColorDialogOpen" :color="color" @confirm="onChangeColor" />
</template>

<script setup lang="ts">
import LearningPathBoardPicker from "./LearningPathBoardPicker.vue";
import LearningPathCanvas from "./LearningPathCanvas.vue";
import LearningPathList from "./LearningPathList.vue";
import LearningPathStepPanel from "./LearningPathStepPanel.vue";
import LearningPathTitleDialog from "./LearningPathTitleDialog.vue";
import { askDeletionForItem } from "@/utils/confirmation-dialog.utils";
import { buildPageTitle } from "@/utils/pageTitle";
import { BoardResponse } from "@api-server";
import { useBoardApi, useSharedBoardPageInformation } from "@data-board";
import {
	type LearningPathColor,
	learningPathColorValue,
	type LearningPathStep,
	stepRoute,
	useLearningPathSocket,
	useLearningPathState,
} from "@data-board-learning-path";
import { mdiPalette } from "@icons/material";
import {
	KebabMenu,
	KebabMenuAction,
	KebabMenuActionDelete,
	KebabMenuActionPublish,
	KebabMenuActionRename,
	KebabMenuActionRevert,
} from "@ui-kebab-menu";
import { DefaultWireframe } from "@ui-layout";
import { LearningPathColorDialog, LearningPathMarker } from "@ui-room-details";
import { useTitle } from "@vueuse/core";
import { computed, nextTick, onMounted, PropType, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const props = defineProps({
	boardId: { type: String, required: true },
	// the skeleton the page already loaded to find out that this is a learning path
	board: { type: Object as PropType<BoardResponse>, required: true },
});

const { t } = useI18n();
const router = useRouter();
const boardApi = useBoardApi();
const { createPageInformation, breadcrumbs: sharedBreadcrumbs } = useSharedBoardPageInformation();

const boardId = toRef(props, "boardId");
const title = ref("");
const isVisible = ref(true);
watch(
	() => props.board,
	(board) => {
		title.value = board.title;
		isVisible.value = board.isVisible;
	},
	{ immediate: true }
);
const canManage = computed(() => props.board.allowedOperations?.updateBoardTitle ?? false);

const {
	path,
	steps,
	isEditor,
	color,
	isEnrolled,
	canChoose,
	availableBoards,
	roomBoards,
	cardIdsInPath,
	isLoading,
	hasError,
	load,
	reloadSoon,
	addStep,
	moveStep,
	updateStep,
	connect,
	disconnect,
	removeStep,
	setColor,
	enroll,
	leave,
} = useLearningPathState(boardId);

useLearningPathSocket(boardId, {
	onChanged: reloadSoon,
	onBoardDeleted: () => router.replace("/rooms"),
});

const breadcrumbs = computed(() =>
	sharedBreadcrumbs.value.map((crumb, index, all) =>
		index === all.length - 1 ? { ...crumb, title: title.value } : crumb
	)
);

useTitle(
	computed(() => buildPageTitle(title.value, sharedBreadcrumbs.value[sharedBreadcrumbs.value.length - 2]?.title))
);

const canvas = ref<InstanceType<typeof LearningPathCanvas>>();

const selectedStepId = ref<string>();
const selectedStep = computed(() => steps.value.find((step) => step.id === selectedStepId.value));

const pathColor = computed(() => learningPathColorValue(color.value));
const colorName = computed(() => (color.value ? t(`pages.learningPath.color.${color.value}`) : ""));

const isColorDialogOpen = ref(false);
const onChangeColor = async (newColor: LearningPathColor) => {
	isColorDialogOpen.value = false;
	await setColor(newColor);
};

// what a student still has to do before a locked step opens
const hints = computed<Record<string, string>>(() => {
	const isMissing = (step: LearningPathStep | undefined): step is LearningPathStep =>
		!!step && step.status !== "done" && step.status !== "unavailable";

	return Object.fromEntries(
		steps.value
			.filter((step) => step.status === "locked")
			.map((step) => {
				// no learning path chosen yet, or the board is kept closed by another learning path the student goes
				if (step.lock?.reason === "chooseLearningPath") {
					return [step.id, t("pages.learningPath.lockedHint.chooseLearningPath")];
				}
				if (step.lock && step.lock.pathId !== boardId.value) {
					return [step.id, t("pages.room.boardCard.locked", { title: step.lock.pathTitle })];
				}

				const titles = step.prerequisiteStepIds
					.map((id) => steps.value.find((candidate) => candidate.id === id))
					.filter(isMissing)
					.map((candidate) => candidate.title)
					.join(", ");
				const key =
					step.unlockMode === "any" && step.prerequisiteStepIds.length > 1
						? "pages.learningPath.lockedHint.any"
						: "pages.learningPath.lockedHint.all";
				return [step.id, t(key, { titles })];
			})
	);
});

// a card step opens the card on its own, as part of the learning path
const openStep = (step: LearningPathStep) => router.push(stepRoute(step, boardId.value));

const onAddBoard = async (linkedBoardId: string) => {
	const position = canvas.value?.freePosition() ?? { x: 0, y: 0 };
	await addStep(linkedBoardId, position.x, position.y);
};

const onAddCard = async (linkedBoardId: string, cardId: string) => {
	const position = canvas.value?.freePosition() ?? { x: 0, y: 0 };
	await addStep(linkedBoardId, position.x, position.y, cardId);
};

const onDropCard = (linkedBoardId: string, cardId: string, positionX: number, positionY: number) =>
	addStep(linkedBoardId, positionX, positionY, cardId);

const onConnect = async (fromId: string, toId: string) => {
	const connected = await connect(fromId, toId);
	if (connected) selectedStepId.value = toId;
};

const onRemoveStep = async (step: LearningPathStep) => {
	const shouldRemove = await askDeletionForItem(
		step.title,
		step.linkedCardId ? "components.boardCard" : "common.words.board"
	);
	if (!shouldRemove) return;
	selectedStepId.value = undefined;
	await removeStep(step.id);
};

// --- board actions ---

const isTitleDialogOpen = ref(false);

const onRename = async (name: string) => {
	isTitleDialogOpen.value = false;
	await boardApi.updateBoardTitleCall(boardId.value, name);
	title.value = name;
};

const setVisibility = async (visible: boolean) => {
	await boardApi.updateBoardVisibilityCall(boardId.value, visible);
	isVisible.value = visible;
};

const onDeleteBoard = async () => {
	const shouldDelete = await askDeletionForItem(title.value, "common.words.board");
	if (!shouldDelete) return;

	const roomPath = sharedBreadcrumbs.value.find((crumb) => crumb.to?.toString().startsWith("/rooms/"))?.to;
	await boardApi.deleteBoardCall(boardId.value);
	router.replace(roomPath ?? "/rooms");
};

onMounted(async () => {
	createPageInformation(boardId.value);
	await load();
	await nextTick();
	canvas.value?.fitView();
});
</script>

<style scoped>
.lp-layout {
	display: flex;
	gap: 16px;
	align-items: stretch;
}

@media (max-width: 960px) {
	.lp-layout {
		flex-direction: column;
	}

	.lp-layout > :deep(section) {
		width: auto;
	}
}
</style>
