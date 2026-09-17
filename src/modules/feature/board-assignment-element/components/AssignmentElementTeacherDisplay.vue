<template>
	<VCardText class="assignment-teacher" data-testid="assignment-teacher-display">
		<div class="assignment-title">
			{{ element.content.title || t("components.cardElement.assignmentElement.untitled") }}
		</div>

		<RenderHTML
			v-if="element.content.text"
			class="assignment-description"
			:html="element.content.text"
			data-testid="assignment-description"
		/>

		<div class="d-flex flex-wrap ga-2 mb-2">
			<VChip
				v-if="startDateLabel"
				size="small"
				variant="tonal"
				:prepend-icon="mdiClockOutline"
				data-testid="assignment-start-date-chip"
			>
				{{ startDateLabel }}
			</VChip>
			<VChip v-if="dueDateLabel" size="small" variant="tonal" :prepend-icon="mdiClockOutline">{{ dueDateLabel }}</VChip>
		</div>

		<VSkeletonLoader v-if="loading" type="text" width="200" data-testid="assignment-progress-skeleton" />
		<template v-else>
			<VProgressLinear
				:model-value="submittedRatio"
				height="6"
				rounded
				color="primary"
				bg-color="surface-variant"
				class="mb-1"
			/>
			<div class="text-caption text-medium-emphasis mb-2" data-testid="assignment-progress-label">
				{{
					t("components.cardElement.assignmentElement.submittedOf", { submitted: submittedCount, total }) +
					" · " +
					t("components.cardElement.assignmentElement.submissionsProgress", {
						graded: gradedCount,
						open: total - gradedCount,
					})
				}}
			</div>
		</template>

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
import { RenderHTML } from "@feature-render-html";
import { mdiClockOutline } from "@icons/material";
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
const gradedCount = ref(0);
const dueDateIso = ref<string | null>(null);

onMounted(async () => {
	const list = await fetchSubmissions(props.element.id);
	if (list) {
		total.value = list.submissions.length;
		submittedCount.value = list.submissions.filter((s) => s.status !== AssignmentStatus.OPEN).length;
		gradedCount.value = list.submissions.filter(
			(s) => s.status === AssignmentStatus.RETURNED || s.points !== null
		).length;
		dueDateIso.value = list.dueDate ?? null;
	}
	loading.value = false;
});

const submittedRatio = computed(() => (total.value === 0 ? 0 : (submittedCount.value / total.value) * 100));

const dueDateLabel = computed(() => {
	const formatted = dueDateIso.value ? formatUtc(dueDateIso.value, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.dueDateLabel", { date: formatted }) : undefined;
});

const startDateLabel = computed(() => {
	const formatted = props.element.content.startDate
		? formatUtc(props.element.content.startDate, "dateTime")
		: undefined;
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
.assignment-description {
	margin-bottom: 8px;
}
</style>
