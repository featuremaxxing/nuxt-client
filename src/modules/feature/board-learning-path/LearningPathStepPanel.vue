<template>
	<section class="lp-panel" :aria-label="t('pages.learningPath.step.settings')" data-testid="learning-path-step-panel">
		<div class="d-flex align-start">
			<h2 class="text-h4 flex-grow-1 mb-2">{{ step.title || t("pages.learningPath.tile.unavailable") }}</h2>
			<VBtn
				:icon="mdiClose"
				size="small"
				variant="text"
				:aria-label="t('common.labels.close')"
				data-testid="learning-path-panel-close"
				@click="emit('close')"
			/>
		</div>

		<VBtn
			v-if="step.status !== 'unavailable'"
			:to="`/boards/${step.linkedBoardId}`"
			variant="outlined"
			size="small"
			:prepend-icon="mdiOpenInNew"
			class="mb-4"
			data-testid="learning-path-panel-open"
		>
			{{ t("pages.learningPath.step.open") }}
		</VBtn>

		<p v-if="step.studentCount" class="text-body-2 mb-4" data-testid="learning-path-panel-progress">
			{{ t("pages.learningPath.progress", { done: step.doneCount ?? 0, total: step.studentCount }) }}
		</p>

		<h3 class="text-subtitle-1 font-weight-bold">{{ t("pages.learningPath.step.prerequisites") }}</h3>
		<p v-if="prerequisites.length === 0" class="text-body-2 text-medium-emphasis">
			{{ t("pages.learningPath.step.noPrerequisites") }}
		</p>
		<ul v-else class="lp-panel__list">
			<li v-for="prerequisite in prerequisites" :key="prerequisite.id" class="d-flex align-center">
				<span class="flex-grow-1">{{ prerequisite.title || t("pages.learningPath.tile.unavailable") }}</span>
				<VBtn
					:icon="mdiClose"
					size="x-small"
					variant="text"
					:aria-label="t('pages.learningPath.step.removeArrow', { title: prerequisite.title })"
					:data-testid="`learning-path-panel-disconnect-${prerequisite.id}`"
					@click="emit('disconnect', prerequisite.id)"
				/>
			</li>
		</ul>
		<VSelect
			v-if="candidates.length > 0"
			:model-value="null"
			:items="candidates"
			item-title="title"
			item-value="id"
			:label="t('pages.learningPath.step.addPrerequisite')"
			density="compact"
			hide-details
			class="mt-2 mb-4"
			data-testid="learning-path-panel-add-prerequisite"
			@update:model-value="onAddPrerequisite"
		/>

		<VSwitch
			:model-value="step.lockUntilPrerequisitesDone"
			:label="t('pages.learningPath.step.lock')"
			:disabled="prerequisites.length === 0"
			color="primary"
			hide-details
			density="compact"
			data-testid="learning-path-panel-lock"
			@update:model-value="emit('update', { lockUntilPrerequisitesDone: !!$event })"
		/>
		<VRadioGroup
			v-if="prerequisites.length > 1"
			:model-value="step.unlockMode"
			:label="t('pages.learningPath.step.unlockMode.label')"
			density="compact"
			hide-details
			class="mt-2"
			data-testid="learning-path-panel-unlock-mode"
			@update:model-value="emit('update', { unlockMode: $event as LearningPathUnlockMode })"
		>
			<VRadio :label="t('pages.learningPath.step.unlockMode.all')" value="all" />
			<VRadio :label="t('pages.learningPath.step.unlockMode.any')" value="any" />
		</VRadioGroup>

		<VDivider class="my-4" />
		<VBtn
			variant="text"
			color="error"
			:prepend-icon="mdiDeleteOutline"
			data-testid="learning-path-panel-remove"
			@click="emit('remove')"
		>
			{{ t("pages.learningPath.step.remove") }}
		</VBtn>
	</section>
</template>

<script setup lang="ts">
import {
	type LearningPathStep,
	type LearningPathStepUpdate,
	type LearningPathUnlockMode,
	wouldCreateCycle,
} from "@data-board-learning-path";
import { mdiClose, mdiDeleteOutline, mdiOpenInNew } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	step: { type: Object as PropType<LearningPathStep>, required: true },
	steps: { type: Array as PropType<LearningPathStep[]>, required: true },
});

const emit = defineEmits<{
	(e: "update", update: LearningPathStepUpdate): void;
	(e: "connect", fromId: string): void;
	(e: "disconnect", fromId: string): void;
	(e: "remove"): void;
	(e: "close"): void;
}>();

const { t } = useI18n();

const prerequisites = computed(() =>
	props.step.prerequisiteStepIds
		.map((id) => props.steps.find((candidate) => candidate.id === id))
		.filter((candidate): candidate is LearningPathStep => !!candidate)
);

// an arrow from any other step that does not close a circle - the keyboard way to connect steps
const candidates = computed(() =>
	props.steps
		.filter(
			(candidate) =>
				candidate.id !== props.step.id &&
				!props.step.prerequisiteStepIds.includes(candidate.id) &&
				!wouldCreateCycle(props.steps, candidate.id, props.step.id)
		)
		.map((candidate) => ({
			id: candidate.id,
			title: candidate.title || t("pages.learningPath.tile.unavailable"),
		}))
);

const onAddPrerequisite = (fromId: string | null) => {
	if (fromId) emit("connect", fromId);
};
</script>

<style scoped>
.lp-panel {
	width: 320px;
	flex-shrink: 0;
	padding: 16px;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	overflow-y: auto;
}

.lp-panel__list {
	list-style: none;
	padding: 0;
	margin: 0;
}
</style>
