<template>
	<div class="d-flex flex-wrap align-center ga-2 ml-4 mr-4 mt-2 mb-1">
		<VChip
			size="x-small"
			variant="tonal"
			:to="originRoute"
			:append-icon="mdiArrowTopRight"
			:aria-label="t('components.board.action.openOrigin')"
			data-testid="card-origin-chip"
			@click.stop
			@dblclick.stop
		>
			{{ originTitle ?? t("components.board.action.openOrigin") }}
			<VTooltip activator="parent" location="bottom">
				{{ t("components.board.action.openOrigin") }}
			</VTooltip>
		</VChip>
		<span v-if="isAllDone" class="text-caption text-success d-flex align-center" data-testid="pinned-card-status-done">
			<VIcon :icon="mdiCheck" size="small" class="mr-1" />
			{{ t("pages.learningRoom.status.done") }}
		</span>
		<template v-else>
			<span
				v-if="dueDateLabel"
				class="text-caption"
				:class="{ 'text-error font-weight-bold': isOverdue }"
				data-testid="pinned-card-status-due"
			>
				{{ dueDateLabel }}
			</span>
			<span v-if="hasProgress" class="text-caption text-medium-emphasis" data-testid="pinned-card-status-progress">
				{{ t("pages.learningRoom.status.progress", { done: progressDone, total: progressTotal }) }}
			</span>
		</template>
	</div>
</template>

<script setup lang="ts">
import { formatUtc } from "@/utils/date-time.utils";
import { mdiArrowTopRight, mdiCheck } from "@icons/material";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

type Props = {
	/** route to the card in its original room */
	originRoute?: { name: string; params: { id: string }; hash: string };
	originTitle?: string;
	progressDone?: number;
	progressTotal?: number;
	nextDueDate?: string;
};

const props = defineProps<Props>();
const { t } = useI18n();

// Only shows what is true - the card is never moved to "done" on its own, that
// stays the student's decision.
const hasProgress = computed(() => (props.progressTotal ?? 0) > 0);
const isAllDone = computed(() => hasProgress.value && props.progressDone === props.progressTotal);

const isOverdue = computed(() => !!props.nextDueDate && new Date(props.nextDueDate).getTime() < Date.now());
const dueDateLabel = computed(() => {
	const formatted = props.nextDueDate ? formatUtc(props.nextDueDate, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.dueDateLabel", { date: formatted }) : undefined;
});
</script>
