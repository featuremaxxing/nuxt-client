<template>
	<VListItem class="assignment-item" data-testid="assignment-list-item" @click="$emit('click')">
		<template #prepend>
			<VIcon :icon="mdiClipboardTextOutline" />
		</template>

		<VListItemTitle class="assignment-title" data-testid="assignment-item-title">
			{{ assignment.title || t("components.cardElement.assignmentElement.untitled") }}
		</VListItemTitle>
		<VListItemSubtitle class="assignment-chips">
			<VChip
				v-if="startDateLabel"
				size="x-small"
				class="mr-2"
				data-testid="assignment-item-start-date"
			>
				{{ startDateLabel }}
			</VChip>
			<VChip v-if="dueDateLabel" size="x-small" class="mr-2" data-testid="assignment-item-due-date">
				{{ dueDateLabel }}
			</VChip>
			<VChip
				v-if="submissionsLabel"
				size="x-small"
				class="mr-2"
				data-testid="assignment-item-submissions"
			>
				{{ submissionsLabel }}
			</VChip>
			<VChip
				v-if="statusLabel"
				size="x-small"
				:color="statusColor"
				data-testid="assignment-item-status"
			>
				{{ statusLabel }}
			</VChip>
		</VListItemSubtitle>

		<template #append>
			<VIcon :icon="mdiChevronRight" />
		</template>
	</VListItem>
</template>

<script setup lang="ts">
import { AssignmentListItemResponse, AssignmentStatus } from "@api-server";
import { formatUtc } from "@/utils/date-time.utils";
import { mdiChevronRight, mdiClipboardTextOutline } from "@icons/material";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	assignment: AssignmentListItemResponse;
}>();

defineEmits<{
	(e: "click"): void;
}>();

const { t } = useI18n();

const startDateLabel = computed(() => {
	const formatted = props.assignment.startDate ? formatUtc(props.assignment.startDate, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.startDateLabel", { date: formatted }) : undefined;
});

const dueDateLabel = computed(() => {
	const formatted = props.assignment.dueDate ? formatUtc(props.assignment.dueDate, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.dueDateLabel", { date: formatted }) : undefined;
});

// teacher-only chips
const submissionsLabel = computed(() =>
	props.assignment.submissionsTotal === null || props.assignment.submissionsTotal === undefined
		? undefined
		: t("pages.assignments.submissions", {
				submitted: props.assignment.submissionsSubmitted ?? 0,
				total: props.assignment.submissionsTotal,
			})
);

// student-only chips
const statusLabel = computed(() => {
	const status = props.assignment.ownSubmissionStatus;
	if (status === null || status === undefined) {
		return undefined;
	}
	const key = `components.cardElement.assignmentElement.status.${status}`;
	const late = props.assignment.ownSubmissionIsLate
		? ` (${t("components.cardElement.assignmentElement.status.late")})`
		: "";
	return `${t(key)}${late}`;
});

const statusColor = computed(() => {
	switch (props.assignment.ownSubmissionStatus) {
		case AssignmentStatus.RETURNED:
			return "success";
		case AssignmentStatus.SUBMITTED:
		case AssignmentStatus.IN_REVIEW:
			return "info";
		case AssignmentStatus.OPEN:
			return props.assignment.isSubmittable ? undefined : "warning";
		default:
			return undefined;
	}
});
</script>

<style scoped lang="scss">
.assignment-title {
	font-weight: 600;
}
.assignment-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	margin-top: 4px;
}
</style>
