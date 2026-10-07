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
				<!-- a text tile is read right in the list, a locked one only says so -->
				<div v-if="step.isText" class="flex-grow-1" :data-testid="`learning-path-list-text-${step.id}`">
					<template v-if="step.status === 'locked'">
						<span>{{ step.title || t("pages.learningPath.text.locked") }}</span>
						<span class="text-medium-emphasis"> – {{ t("pages.learningPath.status.locked") }}</span>
						<span v-if="hints[step.id]" class="text-medium-emphasis"> ({{ hints[step.id] }})</span>
					</template>
					<template v-else>
						<span class="font-weight-bold">{{ step.title }}</span>
						<p v-if="step.text" class="lp-list__text mb-0">{{ step.text }}</p>
					</template>
				</div>
				<template v-else>
					<RouterLink v-if="isOpenable(step)" :to="stepRoute(step, pathId)">
						{{ step.title }}
					</RouterLink>
					<span v-else>{{ step.title || t("pages.learningPath.tile.unavailable") }}</span>
					<span v-if="step.linkedCardId && step.boardTitle" class="text-medium-emphasis">
						({{ t("pages.learningPath.cards.from", { title: step.boardTitle }) }})
					</span>
					<span class="text-medium-emphasis">– {{ t(`pages.learningPath.status.${step.status}`) }}</span>
					<template v-if="step.reopened">
						<LearningPathReworkMark :size="16" />
						<span class="font-weight-bold" data-testid="learning-path-list-rework">
							{{ t("pages.learningPath.rework") }}: {{ t("pages.learningPath.reworkHint") }}
						</span>
					</template>
					<span v-if="hints[step.id]" class="text-medium-emphasis">({{ hints[step.id] }})</span>
				</template>
			</li>
		</ol>
	</section>
</template>

<script setup lang="ts">
import { type LearningPathStep, orderedSteps, stepRoute } from "@data-board-learning-path";
import { mdiCheckCircle, mdiEyeOffOutline, mdiFormatText, mdiLockOutline, mdiMapMarkerPath } from "@icons/material";
import { LearningPathReworkMark } from "@ui-room-details";
import { computed, PropType } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	steps: { type: Array as PropType<LearningPathStep[]>, required: true },
	hints: { type: Object as PropType<Record<string, string>>, default: () => ({}) },
	// the learning path board, card steps open as part of it
	pathId: { type: String, default: "" },
});

const { t } = useI18n();

const ordered = computed(() => orderedSteps(props.steps));

const isOpenable = (step: LearningPathStep) => step.status === "open" || step.status === "done";

const iconOf = (step: LearningPathStep) => {
	if (step.isText && step.status !== "locked") return mdiFormatText;
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

.lp-list__text {
	white-space: pre-wrap;
}
</style>
