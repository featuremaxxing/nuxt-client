<template>
	<VCardText class="assignment-teacher" data-testid="assignment-teacher-display">
		<div class="assignment-title">
			{{ element.content.title || t("components.cardElement.assignmentElement.untitled") }}
		</div>

		<VChip v-if="startDateLabel" size="small" class="mb-2" data-testid="assignment-start-date-chip">
			{{ startDateLabel }}
		</VChip>
		<VChip v-if="dueDateLabel" size="small" class="mb-2">{{ dueDateLabel }}</VChip>

		<VBtn
			variant="tonal"
			size="small"
			:loading="loading"
			data-testid="assignment-view-submissions-button"
			@click="isSubmissionsOverlayOpen = true"
		>
			{{ buttonLabel }}
		</VBtn>

		<AssignmentSubmissionsOverlay
			:element="element"
			:is-open="isSubmissionsOverlayOpen"
			@close="isSubmissionsOverlayOpen = false"
		/>
	</VCardText>
</template>

<script setup lang="ts">
import AssignmentSubmissionsOverlay from "./AssignmentSubmissionsOverlay.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { formatUtc } from "@/utils/date-time.utils";
import { AssignmentStatus } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
}>();

const { t } = useI18n();
const { fetchSubmissions } = useAssignmentApi();

const isSubmissionsOverlayOpen = ref(false);
const loading = ref(true);
const total = ref(0);
const submittedCount = ref(0);
const dueDateIso = ref<string | null>(null);

onMounted(async () => {
	const list = await fetchSubmissions(props.element.id);
	if (list) {
		total.value = list.submissions.length;
		submittedCount.value = list.submissions.filter((s) => s.status !== AssignmentStatus.OPEN).length;
		dueDateIso.value = list.dueDate ?? null;
	}
	loading.value = false;
});

const dueDateLabel = computed(() => {
	const formatted = dueDateIso.value ? formatUtc(dueDateIso.value, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.dueDateLabel", { date: formatted }) : undefined;
});

const startDateLabel = computed(() => {
	const formatted = props.element.content.startDate ? formatUtc(props.element.content.startDate, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.startDateLabel", { date: formatted }) : undefined;
});

const buttonLabel = computed(() =>
	t("components.cardElement.assignmentElement.viewSubmissions", {
		submitted: submittedCount.value,
		total: total.value,
	})
);
</script>

<style scoped lang="scss">
.assignment-title {
	font-weight: 600;
	margin-bottom: 4px;
}
</style>
