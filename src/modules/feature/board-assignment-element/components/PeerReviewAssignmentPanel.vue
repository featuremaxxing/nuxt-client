<template>
	<VDialog :model-value="isOpen" max-width="600" data-testid="peer-review-panel" @update:model-value="onClose">
		<VCard>
			<VCardTitle class="d-flex align-center">
				<span>{{ t("components.cardElement.assignmentElement.peerReview.manageTitle") }}</span>
				<VSpacer />
				<VBtn icon variant="text" data-testid="peer-review-panel-close" @click="onClose">
					<VIcon :icon="mdiClose" />
				</VBtn>
			</VCardTitle>

			<VCardText>
				<template v-if="mode === 'auto'">
					<VBtn color="primary" :loading="autoAssigning" data-testid="peer-review-auto-assign" @click="onAutoAssign">
						{{ t("components.cardElement.assignmentElement.peerReview.autoAssign") }}
					</VBtn>
				</template>

				<template v-else>
					<div
						v-for="submission in reviewableSubmissions"
						:key="submission.userId"
						class="d-flex align-center ga-2 mb-2"
						data-testid="peer-review-assign-row"
					>
						<span class="flex-grow-1 text-truncate">{{ nameOf(submission) }}</span>
						<VSelect
							:model-value="unselectedReviewer"
							:items="reviewerItemsFor(submission)"
							:label="t('components.cardElement.assignmentElement.peerReview.selectReviewer')"
							density="compact"
							hide-details
							style="max-width: 220px"
							data-testid="peer-review-reviewer-select"
							@update:model-value="(reviewerUserId: string) => onAssign(submission, reviewerUserId)"
						/>
					</div>
					<div v-if="reviewableSubmissions.length === 0" class="text-caption text-medium-emphasis">
						{{ t("components.cardElement.assignmentElement.noSubmissionsForFilter") }}
					</div>
				</template>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { AssignmentSubmissionResponse } from "@api-server";
import { notifySuccess } from "@data-app";
import { usePeerReviewApi } from "@data-assignment";
import { mdiClose } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

// Teacher-only management surface for peer review, opened from AssignmentSubmissionsOverlay.
// Manual mode assigns one reviewer at a time (selecting in the dropdown fires the request
// immediately); auto mode is a single action that replaces every previous assignment.
const props = defineProps<{
	isOpen: boolean;
	elementId: string;
	mode: "manual" | "auto";
	submissions: AssignmentSubmissionResponse[];
}>();

const emit = defineEmits<{
	(e: "close"): void;
}>();

const { t } = useI18n();
const { autoAssign, manualAssign } = usePeerReviewApi();

const autoAssigning = ref(false);
// each row's select is always reset to unselected after firing its immediate assign request
const unselectedReviewer = ref<string | null>(null);

const nameOf = (submission: AssignmentSubmissionResponse) =>
	`${submission.lastName ?? ""}, ${submission.firstName ?? ""}`.replace(/^, |, $/, "").trim() || submission.userId;

// only actual submissions can be reviewed; a placeholder row (id === null) has nothing to show
const reviewableSubmissions = computed(() => props.submissions.filter((s) => s.id !== null));

const reviewerItemsFor = (submission: AssignmentSubmissionResponse) =>
	props.submissions
		.filter((candidate) => candidate.userId !== submission.userId)
		.map((candidate) => ({ title: nameOf(candidate), value: candidate.userId }));

const onAssign = async (submission: AssignmentSubmissionResponse, reviewerUserId: string) => {
	if (!submission.id) return;
	const result = await manualAssign(props.elementId, [{ submissionId: submission.id, reviewerUserId }]);
	if (result) {
		notifySuccess(t("components.cardElement.assignmentElement.peerReview.manualAssignSuccess"));
	}
};

const onAutoAssign = async () => {
	autoAssigning.value = true;
	try {
		const result = await autoAssign(props.elementId);
		if (result) {
			notifySuccess(
				t("components.cardElement.assignmentElement.peerReview.autoAssignSuccess", { count: result.assignedCount })
			);
		}
	} finally {
		autoAssigning.value = false;
	}
};

const onClose = () => {
	emit("close");
};
</script>
