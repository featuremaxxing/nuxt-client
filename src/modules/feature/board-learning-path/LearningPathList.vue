<template>
	<section :aria-label="t('pages.learningPath.list.title')" data-testid="learning-path-list">
		<h2 class="text-subtitle-1 font-weight-bold mb-2">{{ t("pages.learningPath.list.title") }}</h2>
		<ol class="lp-list">
			<li
				v-for="step in ordered"
				:key="step.id"
				class="lp-list__item"
				:data-testid="`learning-path-list-item-${step.id}`"
			>
				<VIcon :icon="iconOf(step)" size="18" :class="`lp-list__icon--${step.status}`" aria-hidden="true" />
				<RouterLink v-if="isOpenable(step)" :to="`/boards/${step.linkedBoardId}`">
					{{ step.title }}
				</RouterLink>
				<span v-else>{{ step.title || t("pages.learningPath.tile.unavailable") }}</span>
				<span class="text-medium-emphasis">– {{ t(`pages.learningPath.status.${step.status}`) }}</span>
				<span v-if="hints[step.id]" class="text-medium-emphasis">({{ hints[step.id] }})</span>
			</li>
		</ol>
	</section>
</template>

<script setup lang="ts">
import { type LearningPathStep, orderedSteps } from "@data-board-learning-path";
import { mdiCheckCircle, mdiEyeOffOutline, mdiLockOutline, mdiMapMarkerPath } from "@icons/material";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	steps: { type: Array as PropType<LearningPathStep[]>, required: true },
	hints: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
});

const { t } = useI18n();

const ordered = computed(() => orderedSteps(props.steps));

const isOpenable = (step: LearningPathStep) => step.status === "open" || step.status === "done";

const iconOf = (step: LearningPathStep) => {
	if (step.status === "done") return mdiCheckCircle;
	if (step.status === "locked") return mdiLockOutline;
	if (step.status === "unavailable") return mdiEyeOffOutline;
	return mdiMapMarkerPath;
};
</script>

<style scoped>
.lp-list {
	padding-left: 1.5rem;
}

.lp-list__item {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 6px;
	padding: 2px 0;
}

.lp-list__icon--done {
	color: rgb(var(--v-theme-success));
}

.lp-list__icon--open {
	color: rgb(var(--v-theme-primary));
}
</style>
