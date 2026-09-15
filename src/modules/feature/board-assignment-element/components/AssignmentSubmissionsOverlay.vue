<template>
	<VDialog
		:model-value="isOpen"
		max-width="720"
		scrollable
		data-testid="assignment-submissions-overlay"
		@update:model-value="onClose"
	>
		<VCard>
			<VCardTitle class="d-flex align-center">
				<span data-testid="submissions-overlay-title">
					{{ t("components.cardElement.assignmentElement.submissionsTitle") }}:
					{{ element.content.title || t("components.cardElement.assignmentElement.untitled") }}
				</span>
				<VSpacer />
				<VBtn icon variant="text" data-testid="submissions-overlay-close" @click="onClose">
					<VIcon :icon="mdiClose" />
				</VBtn>
			</VCardTitle>

			<VDivider />

			<VCardText>
				<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>

				<div v-else class="d-flex flex-column gap-4">
					<div
						v-for="submission in submissions"
						:key="submission.userId"
						class="submission-block"
						data-testid="submission-block"
					>
						<div class="d-flex align-center flex-wrap">
							<span class="submission-name" data-testid="submission-name">
								{{ submission.firstName }} {{ submission.lastName }}
							</span>
							<VChip size="x-small" :color="statusColor(submission)" class="mr-2" data-testid="submission-status">
								{{ statusLabel(submission) }}
							</VChip>
							<VChip v-if="submission.isLate" size="x-small" color="warning" data-testid="submission-late">
								{{ t("components.cardElement.assignmentElement.status.late") }}
							</VChip>
							<VSpacer />
							<span v-if="submission.submittedAt" class="text-caption" data-testid="submission-date">
								{{ formatUtc(submission.submittedAt, "dateTime") }}
							</span>
						</div>

						<div v-if="submission.file" class="d-flex align-center mt-2">
							<VIcon :icon="mdiFileDocumentOutline" size="small" class="mr-2" />
							<span data-testid="submission-file-name">{{ submission.file.name }}</span>
							<VSpacer />
							<VBtn
								variant="tonal"
								size="small"
								:loading="downloadingId === submission.id"
								data-testid="submission-download"
								@click="downloadSubmissionFile(submission)"
							>
								{{ t("components.cardElement.assignmentElement.downloadFile") }}
							</VBtn>
						</div>

						<div v-if="submission.comment" class="submission-comment mt-2" data-testid="submission-comment">
							<span class="text-caption">
								{{ t("components.cardElement.assignmentElement.studentComment") }}:
							</span>
							{{ submission.comment }}
						</div>

						<template v-if="submission.id !== null">
							<VTextField
								:model-value="draftPoints[submission.id] ?? submission.points ?? null"
								type="number"
								density="compact"
								:label="pointsLabel"
								:min="0"
								:max="maxPoints ?? undefined"
								data-testid="submission-points-input"
								@update:model-value="(value: string) => setDraftPoints(submission, value)"
							/>
							<VTextarea
								:model-value="draftFeedback[submission.id] ?? submission.feedbackComment ?? ''"
								rows="2"
								auto-grow
								density="compact"
								:label="t('components.cardElement.assignmentElement.teacherComment')"
								data-testid="submission-feedback-input"
								@update:model-value="(value: string) => setDraftFeedback(submission, value)"
							/>
							<div class="d-flex justify-end gap-2">
								<VBtn
									variant="tonal"
									size="small"
									:loading="savingId === submission.id"
									data-testid="submission-save-grade"
									@click="onSaveGrade(submission)"
								>
									{{ t("common.actions.save") }}
								</VBtn>
								<VBtn
									variant="flat"
									size="small"
									:loading="returningId === submission.id"
									data-testid="submission-return"
									@click="onReturnSubmission(submission)"
								>
									{{ t("components.cardElement.assignmentElement.returnSubmission") }}
								</VBtn>
							</div>
						</template>
					</div>
				</div>
			</VCardText>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import { AssignmentElement } from "@/types/board/ContentElement";
import { FileRecordParent } from "@/types/file/File";
import { formatUtc } from "@/utils/date-time.utils";
import { downloadFile } from "@/utils/fileHelper";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import { mdiClose, mdiFileDocumentOutline } from "@icons/material";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

// Teacher view of all submissions below one assignment element: overview,
// file download, draft grading (save) and final return. The PDF annotation,
// text and audio feedback tools of the original brief are a later round -
// this covers the file-based V1 flow.
const props = defineProps<{
	element: AssignmentElement;
	isOpen: boolean;
}>();

const emit = defineEmits<{
	(e: "close"): void;
}>();

const { t } = useI18n();
const { fetchSubmissions, gradeSubmission, returnSubmission } = useAssignmentApi();
const { fetchFiles, getFileRecordsByParentId } = useFileStorageApi();

const loading = ref(false);
const submissions = ref<AssignmentSubmissionResponse[]>([]);
const draftPoints = ref<Record<string, number | null>>({});
const draftFeedback = ref<Record<string, string>>({});
const savingId = ref<string | null>(null);
const returningId = ref<string | null>(null);
const downloadingId = ref<string | null>(null);

const maxPoints = computed(() => props.element.content.maxPoints ?? null);

const pointsLabel = computed(() =>
	maxPoints.value === null
		? t("components.cardElement.assignmentElement.pointsLabel")
		: `${t("components.cardElement.assignmentElement.pointsLabel")} (0–${maxPoints.value})`
);

const load = async () => {
	loading.value = true;
	const list = await fetchSubmissions(props.element.id);
	submissions.value = list?.submissions ?? [];
	loading.value = false;
};

watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			draftPoints.value = {};
			draftFeedback.value = {};
			void load();
		}
	},
	{ immediate: true }
);

const setDraftPoints = (submission: AssignmentSubmissionResponse, value: string) => {
	if (submission.id) {
		draftPoints.value[submission.id] = value === "" ? null : Number(value);
	}
};

const setDraftFeedback = (submission: AssignmentSubmissionResponse, value: string) => {
	if (submission.id) {
		draftFeedback.value[submission.id] = value;
	}
};

const gradeBody = (submissionId: string, submission: AssignmentSubmissionResponse) => {
	const points = draftPoints.value[submissionId] ?? submission.points ?? null;
	return {
		points: points === null ? undefined : points,
		feedbackComment: draftFeedback.value[submissionId] ?? submission.feedbackComment ?? null,
	};
};

const onSaveGrade = async (submission: AssignmentSubmissionResponse) => {
	if (!submission.id) return;
	savingId.value = submission.id;
	await gradeSubmission(submission.id, gradeBody(submission.id, submission));
	await load();
	savingId.value = null;
};

const onReturnSubmission = async (submission: AssignmentSubmissionResponse) => {
	if (!submission.id) return;
	returningId.value = submission.id;
	await returnSubmission(submission.id, gradeBody(submission.id, submission));
	await load();
	returningId.value = null;
};

const downloadSubmissionFile = async (submission: AssignmentSubmissionResponse) => {
	if (!submission.id) return;
	downloadingId.value = submission.id;
	try {
		await fetchFiles(submission.id, FileRecordParent.BOARDNODES);
		const record = getFileRecordsByParentId(submission.id)[0];
		if (record) {
			downloadFile(record.url, record.name);
		}
	} finally {
		downloadingId.value = null;
	}
};

const statusLabel = (submission: AssignmentSubmissionResponse) =>
	t(`components.cardElement.assignmentElement.status.${submission.status}`);

const statusColor = (submission: AssignmentSubmissionResponse) => {
	switch (submission.status) {
		case AssignmentStatus.RETURNED:
			return "success";
		case AssignmentStatus.SUBMITTED:
		case AssignmentStatus.IN_REVIEW:
			return "info";
		default:
			return undefined;
	}
};

const onClose = () => {
	emit("close");
};
</script>

<style scoped lang="scss">
.submission-block {
	border: 1px solid rgba(0, 0, 0, 0.12);
	border-radius: 8px;
	padding: 12px;
}
.submission-name {
	font-weight: 600;
	margin-right: 8px;
}
.submission-comment {
	word-break: break-word;
}
</style>
