<template>
	<div v-if="entries.length > 0" class="lp-card-hint d-flex flex-wrap ga-1" data-testid="learning-path-card-hint">
		<span
			v-for="entry in entries"
			:key="entry.pathId"
			class="lp-card-hint__chip text-caption"
			:data-testid="`learning-path-card-hint-${entry.pathId}`"
		>
			<LearningPathMarker :color="entry.color" :size="12" />
			{{ t("pages.learningPath.cards.chip.step", { title: entry.pathTitle, position: entry.position }) }}
			<template v-if="entry.status === 'locked'">
				<VIcon :icon="mdiLockOutline" size="12" aria-hidden="true" />
				<span>{{ t("pages.learningPath.cards.chip.locked") }}</span>
			</template>
			<template v-else-if="entry.status === 'done'">
				<VIcon :icon="mdiCheckCircle" size="12" color="success" aria-hidden="true" />
				<span class="d-sr-only">{{ t("pages.learningPath.status.done") }}</span>
			</template>
		</span>
	</div>
</template>

<script setup lang="ts">
import { LEARNING_PATH_CARD_STEPS_KEY, type LearningPathCardStep } from "@data-board-learning-path";
import { mdiCheckCircle, mdiLockOutline } from "@icons/material";
import { LearningPathMarker } from "@ui-room-details";
import { computed, inject, ref } from "vue";
import { useI18n } from "vue-i18n";

// On a card that is a step of learning paths: which ones, the step's number and - for students - whether
// the learning path still keeps it closed. The card itself stays open, the learning path only guides.
const props = defineProps<{ cardId: string }>();

const { t } = useI18n();
const cardSteps = inject(LEARNING_PATH_CARD_STEPS_KEY, ref<Record<string, LearningPathCardStep["paths"]>>({}));

const entries = computed(() => cardSteps.value[props.cardId] ?? []);
</script>

<style scoped>
.lp-card-hint__chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 1px 8px;
	border-radius: 12px;
	background: rgba(var(--v-theme-on-surface), 0.06);
}
</style>
