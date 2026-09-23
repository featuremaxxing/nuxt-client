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

				<div
					v-for="submission in reviewableSubmissions"
					:key="submission.userId"
					class="mb-3"
					data-testid="peer-review-assign-row"
				>
					<div class="d-flex align-center ga-2">
						<span class="flex-grow-1 text-truncate">{{ nameOf(submission) }}</span>
						<VSelect
							v-if="mode === 'manual'"
							:model-value="emptySelection"
							:items="reviewerItemsFor(submission)"
							:label="t('components.cardElement.assignmentElement.peerReview.selectReviewer')"
							density="compact"
							hide-details
							style="max-width: 220px"
							data-testid="peer-review-reviewer-select"
							@update:model-value="(reviewerUserId: string | null) => onAssign(submission, reviewerUserId)"
						/>
					</div>
					<div v-if="assignmentsFor(submission.id).length > 0" class="d-flex flex-wrap ga-1 mt-1">
						<VChip
							v-for="assignment in assignmentsFor(submission.id)"
							:key="assignment.reviewerUserId"
							size="small"
							:closable="!assignment.submittedAt"
							:title="
								assignment.submittedAt
									? t('components.cardElement.assignmentElement.peerReview.assignmentSubmitted')
									: t('components.cardElement.assignmentElement.peerReview.removeAssignment')
							"
							data-testid="peer-review-assignment-chip"
							@click:close="onUnassign(submission, assignment)"
						>
							{{ reviewerNameOf(assignment) }}
						</VChip>
					</div>
				</div>
				<div v-if="reviewableSubmissions.length === 0" class="text-caption text-medium-emphasis">
					{{ t("components.cardElement.assignmentElement.noSubmissionsForFilter") }}
				</div>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { AssignmentSubmissionResponse, PeerReviewAssignmentResponse } from "@api-server";
import { notifySuccess } from "@data-app";
import { usePeerReviewApi } from "@data-assignment";
import { mdiClose } from "@icons/material";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

// Teacher-only management surface for peer review, opened from AssignmentSubmissionsOverlay,
// which also owns fetching `assignments` (so a removal or a fresh assignment made here is
// reflected in the manage button's counter too - see the "changed" emit below).
// Manual mode assigns one reviewer at a time (selecting in the dropdown fires the request
// immediately); auto mode is a single action that replaces every previous assignment. Existing
// assignments are shown as removable chips in both modes.
const props = defineProps<{
	isOpen: boolean;
	elementId: string;
	mode: "manual" | "auto";
	submissions: AssignmentSubmissionResponse[];
	assignments: PeerReviewAssignmentResponse[];
}>();

const emit = defineEmits<{
	(e: "close"): void;
	(e: "changed"): void;
}>();

const { t } = useI18n();
const { autoAssign, manualAssign, unassign } = usePeerReviewApi();

const autoAssigning = ref(false);
// the select is never bound to real state - selecting a reviewer fires the assign request
// immediately and the dropdown resets to empty, the chip below is the actual state
const emptySelection: string | null = null;

const nameOf = (submission: AssignmentSubmissionResponse) =>
	`${submission.lastName ?? ""}, ${submission.firstName ?? ""}`.replace(/^, |, $/, "").trim() || submission.userId;

const reviewerNameOf = (assignment: PeerReviewAssignmentResponse) =>
	`${assignment.reviewerLastName ?? ""}, ${assignment.reviewerFirstName ?? ""}`.replace(/^, |, $/, "").trim() ||
	assignment.reviewerUserId;

// only actual submissions can be reviewed; a placeholder row (id === null) has nothing to show
const reviewableSubmissions = computed(() => props.submissions.filter((s) => s.id !== null));

const assignmentsFor = (submissionId: string | null) =>
	submissionId ? props.assignments.filter((assignment) => assignment.submissionId === submissionId) : [];

// already-assigned reviewers are filtered out so the same person can't be picked twice from
// this dropdown - manualAssign would just replace the pairing, but the UI should make that
// unreachable rather than rely on the backend to make it harmless
const reviewerItemsFor = (submission: AssignmentSubmissionResponse) => {
	const alreadyAssigned = new Set(assignmentsFor(submission.id).map((assignment) => assignment.reviewerUserId));

	return props.submissions
		.filter((candidate) => candidate.userId !== submission.userId && !alreadyAssigned.has(candidate.userId))
		.map((candidate) => ({ title: nameOf(candidate), value: candidate.userId }));
};

const onAssign = async (submission: AssignmentSubmissionResponse, reviewerUserId: string | null) => {
	if (!submission.id || !reviewerUserId) return;
	const result = await manualAssign(props.elementId, [{ submissionId: submission.id, reviewerUserId }]);
	if (result) {
		notifySuccess(t("components.cardElement.assignmentElement.peerReview.manualAssignSuccess"));
		emit("changed");
	}
};

const onUnassign = async (submission: AssignmentSubmissionResponse, assignment: PeerReviewAssignmentResponse) => {
	if (!submission.id || assignment.submittedAt) return;
	const success = await unassign(props.elementId, submission.id, assignment.reviewerUserId);
	if (success) {
		emit("changed");
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
			emit("changed");
		}
	} finally {
		autoAssigning.value = false;
	}
};

const onClose = () => {
	emit("close");
};
</script>
