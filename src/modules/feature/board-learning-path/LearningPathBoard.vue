<template>
	<DefaultWireframe max-width="full" :breadcrumbs="breadcrumbs">
		<template #header>
			<div class="d-flex align-center">
				<h1 data-testid="learning-path-title">{{ title }}</h1>
				<VChip v-if="!isVisible" class="ml-4" data-testid="board-draft-chip">
					{{ t("common.words.draft") }}
				</VChip>
				<KebabMenu v-if="canManage" class="ml-2" data-testid="board-menu-btn">
					<KebabMenuActionRename @click="isTitleDialogOpen = true" />
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
			<VAlert v-if="steps.length === 0" type="info" variant="tonal" class="mb-4" data-testid="learning-path-empty">
				{{ isEditor ? t("pages.learningPath.empty.editor") : t("pages.learningPath.empty.student") }}
			</VAlert>
			<div class="lp-layout">
				<LearningPathBoardPicker v-if="isEditor" :boards="availableBoards" @add="onAddBoard" />
				<LearningPathCanvas
					ref="canvas"
					class="flex-grow-1"
					:steps="steps"
					:is-editor="isEditor"
					:selected-step-id="selectedStep?.id"
					:hints="hints"
					@select="selectedStepId = $event"
					@open="openStep"
					@move="moveStep"
					@connect="onConnect"
					@drop-board="addStep"
				/>
				<LearningPathStepPanel
					v-if="isEditor && selectedStep"
					:step="selectedStep"
					:steps="steps"
					@update="updateStep(selectedStep.id, $event)"
					@connect="onConnect($event, selectedStep.id)"
					@disconnect="disconnect($event, selectedStep.id)"
					@remove="onRemoveStep(selectedStep)"
					@close="selectedStepId = undefined"
				/>
			</div>
			<LearningPathList v-if="steps.length > 0" class="mt-6" :steps="steps" :hints="hints" />
		</template>
	</DefaultWireframe>
	<LearningPathTitleDialog v-model:is-dialog-open="isTitleDialogOpen" :name="title" @confirm="onRename" />
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
import { type LearningPathStep, useLearningPathSocket, useLearningPathState } from "@data-board-learning-path";
import {
	KebabMenu,
	KebabMenuActionDelete,
	KebabMenuActionPublish,
	KebabMenuActionRename,
	KebabMenuActionRevert,
} from "@ui-kebab-menu";
import { DefaultWireframe } from "@ui-layout";
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
	steps,
	isEditor,
	availableBoards,
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

// what a student still has to complete before a locked step opens
const hints = computed<Record<string, string>>(() => {
	const isMissing = (step: LearningPathStep | undefined): step is LearningPathStep =>
		!!step && step.status !== "done" && step.status !== "unavailable";

	return Object.fromEntries(
		steps.value
			.filter((step) => step.status === "locked")
			.map((step) => {
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

const openStep = (step: LearningPathStep) => router.push(`/boards/${step.linkedBoardId}`);

const onAddBoard = async (linkedBoardId: string) => {
	const position = canvas.value?.freePosition() ?? { x: 0, y: 0 };
	await addStep(linkedBoardId, position.x, position.y);
};

const onConnect = async (fromId: string, toId: string) => {
	const connected = await connect(fromId, toId);
	if (connected) selectedStepId.value = toId;
};

const onRemoveStep = async (step: LearningPathStep) => {
	const shouldRemove = await askDeletionForItem(step.title, "common.words.board");
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
