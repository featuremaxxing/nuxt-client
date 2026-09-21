<template>
	<div class="submission-detail" data-testid="submission-detail">
		<div class="d-flex align-center flex-wrap ga-2 mb-1">
			<span class="submission-name" data-testid="submission-detail-name">
				{{ studentName }}
			</span>
			<VChip size="x-small" :color="statusColor" data-testid="submission-status">
				{{ statusLabel }}
			</VChip>
			<VChip v-if="submission.isLate" size="x-small" color="warning" data-testid="submission-late">
				{{ t("components.cardElement.assignmentElement.status.late") }}
			</VChip>
			<VSpacer />
			<span v-if="submission.submittedAt" class="text-caption" data-testid="submission-date">
				{{ formatUtc(submission.submittedAt, "dateTime") }}
			</span>
		</div>

		<template v-if="submissionFile || submission.file">
			<div class="d-flex align-center mt-3">
				<div class="text-overline text-medium-emphasis" data-testid="submission-section-submission">
					{{ t("components.cardElement.assignmentElement.sectionSubmission") }}
				</div>
				<VSpacer />
				<VSelect
					v-if="fileVersions.length > 1"
					:model-value="selectedVersionId"
					:items="versionItems"
					density="compact"
					hide-details
					variant="plain"
					style="max-width: 220px"
					data-testid="submission-version-select"
					@update:model-value="(value: string) => emit('select-version', value)"
				/>
			</div>
			<div class="d-flex align-center ga-2 mt-1" data-testid="submission-file-row">
				<PreviewImage
					v-if="previewUrl"
					:src="previewUrl"
					:alt="submissionFile?.name ?? ''"
					class="submission-thumbnail"
					data-testid="submission-file-thumbnail"
					@click="emit('view-file')"
				/>
				<VIcon v-else :icon="mdiFileDocumentOutline" size="small" />
				<span class="flex-grow-1 text-truncate" data-testid="submission-file-name">
					{{ submissionFile?.name ?? submission.file?.name }}
				</span>
				<VBtn
					v-if="isPdfFile"
					variant="text"
					size="small"
					:prepend-icon="mdiEyeOutline"
					data-testid="submission-view"
					@click="emit('view-file')"
				>
					{{ t("components.cardElement.assignmentElement.viewFile") }}
				</VBtn>
				<VBtn
					v-if="isAnnotatable"
					variant="tonal"
					size="small"
					:prepend-icon="mdiPencilOutline"
					:disabled="busy.annotating"
					data-testid="submission-annotate"
					@click="emit('annotate-file')"
				>
					{{ t("components.cardElement.assignmentElement.annotate") }}
				</VBtn>
				<VBtn
					variant="text"
					size="small"
					:icon="mdiTrayArrowDown"
					:loading="busy.downloading"
					data-testid="submission-download"
					@click="emit('download-file')"
				/>
			</div>
		</template>

		<template v-if="feedbackFiles.length > 0 || feedbackAudioUrl">
			<div class="text-overline text-medium-emphasis mt-4" data-testid="submission-section-correction">
				{{ t("components.cardElement.assignmentElement.sectionCorrection") }}
			</div>

			<div
				v-for="record in feedbackFiles"
				:key="record.id"
				class="d-flex align-center ga-2 mt-1"
				data-testid="submission-feedback-file"
			>
				<VIcon :icon="mdiFileDocumentOutline" size="small" />
				<span class="flex-grow-1 text-truncate">{{ correctionLabel(record) }}</span>
				<VBtn
					v-if="isViewableFeedbackFile(record)"
					variant="text"
					size="small"
					:prepend-icon="mdiEyeOutline"
					:data-testid="`submission-feedback-file-view-${record.id}`"
					@click="emit('view-feedback', record)"
				>
					{{ t("components.cardElement.assignmentElement.viewFile") }}
				</VBtn>
				<VBtn
					v-if="isPdfMimeType(record.mimeType) || isImageMimeType(record.mimeType)"
					variant="tonal"
					size="small"
					:prepend-icon="mdiPencilOutline"
					:disabled="busy.annotating"
					:data-testid="`submission-feedback-annotate-${record.id}`"
					@click="emit('continue-feedback', record)"
				>
					{{ t("components.cardElement.assignmentElement.annotator.continue") }}
				</VBtn>
				<VBtn
					variant="text"
					size="small"
					:icon="mdiTrayArrowDown"
					:data-testid="`submission-feedback-file-download-${record.id}`"
					@click="emit('download-feedback', record)"
				/>
			</div>

			<div v-if="feedbackAudioUrl" class="d-flex align-center ga-2 mt-2" data-testid="submission-feedback-audio">
				<VIcon :icon="mdiMicrophone" size="small" />
				<audio
					:src="feedbackAudioUrl"
					controls
					class="flex-grow-1"
					data-testid="submission-audio-player"
					preload="none"
				/>
			</div>
		</template>

		<div v-if="submission.comment" class="submission-comment mt-3" data-testid="submission-comment">
			<span class="text-caption text-medium-emphasis">
				{{ t("components.cardElement.assignmentElement.studentComment") }}:
			</span>
			{{ submission.comment }}
		</div>

		<div v-if="submission.peerReviews" class="peer-review-summary mt-3" data-testid="submission-peer-review-summary">
			<span class="text-caption text-medium-emphasis">
				{{
					t("components.cardElement.assignmentElement.peerReview.summaryLabel", {
						count: submission.peerReviews.count,
					})
				}}
				<template v-if="submission.peerReviews.averagePoints !== null">
					· ⌀ {{ submission.peerReviews.averagePoints.toFixed(1) }}
				</template>
			</span>
			<p
				v-for="(comment, index) in submission.peerReviews.comments"
				:key="index"
				class="text-body-2"
				data-testid="submission-peer-review-comment"
			>
				{{ comment }}
			</p>
			<p class="text-caption text-medium-emphasis font-italic">
				{{ t("components.cardElement.assignmentElement.peerReview.advisoryNotice") }}
			</p>
		</div>

		<div v-if="submission.id === null" class="submission-none mt-4" data-testid="submission-none">
			<p class="text-body-2">{{ t("components.cardElement.assignmentElement.noSubmissionYet") }}</p>
			<p class="text-caption text-medium-emphasis">
				{{ t("components.cardElement.assignmentElement.noSubmissionHint") }}
			</p>
		</div>

		<template v-else>
			<VDivider class="mt-4 mb-3" />

			<div class="d-flex align-center ga-2 mb-3" data-testid="submission-audio-feedback-row">
				<template v-if="recording.isRecording">
					<VBtn size="small" color="error" data-testid="submission-record-stop" @click="emit('stop-recording')">
						{{ t("components.cardElement.assignmentElement.audioStop") }}
					</VBtn>
					<span class="text-caption">{{ t("components.cardElement.assignmentElement.audioRecording") }}</span>
				</template>
				<template v-else-if="recording.recorded">
					<audio :src="recording.recorded.url" controls class="flex-grow-1" data-testid="submission-recorded-preview" />
					<VBtn
						variant="tonal"
						size="small"
						:loading="busy.uploadingAudio"
						data-testid="submission-audio-upload"
						@click="emit('upload-recording')"
					>
						{{ t("components.cardElement.assignmentElement.audioUpload") }}
					</VBtn>
					<VBtn variant="text" size="small" data-testid="submission-audio-discard" @click="emit('discard-recording')">
						{{ t("common.actions.cancel") }}
					</VBtn>
				</template>
				<template v-else>
					<VBtn
						v-if="AudioRecorder.isSupported()"
						variant="tonal"
						size="small"
						:prepend-icon="mdiMicrophone"
						:loading="busy.uploadingAudio"
						data-testid="submission-record"
						@click="emit('start-recording')"
					>
						{{ t("components.cardElement.assignmentElement.audioRecord") }}
					</VBtn>
				</template>
			</div>

			<div
				v-if="criteria.length > 0"
				class="d-flex align-center ga-4 flex-wrap"
				data-testid="submission-criteria-points"
			>
				<VTextField
					v-for="criterion in criteria"
					:key="criterion.id"
					:model-value="criterionPoints[criterion.id] ?? null"
					type="number"
					density="compact"
					:label="criterion.name"
					:suffix="`/ ${criterion.maxPoints}`"
					:min="0"
					:max="criterion.maxPoints"
					hide-details
					style="max-width: 160px"
					:data-testid="`submission-criterion-points-${criterion.id}`"
					@update:model-value="(value: string) => emit('update:criterionPoints', criterion.id, value)"
				/>
				<span class="text-body-2 text-medium-emphasis" data-testid="submission-criteria-total">
					{{ t("components.cardElement.assignmentElement.pointsLabel") }}: {{ criteriaPointsTotal }} / {{ maxPoints }}
				</span>
			</div>

			<div v-else class="d-flex align-center ga-4 flex-wrap">
				<VTextField
					:model-value="points"
					type="number"
					density="compact"
					:label="t('components.cardElement.assignmentElement.pointsLabel')"
					:suffix="maxPoints !== null ? `/ ${maxPoints}` : undefined"
					:min="0"
					:max="maxPoints ?? undefined"
					hide-details
					style="max-width: 140px"
					data-testid="submission-points-input"
					@update:model-value="(value: string) => emit('update:points', value)"
				/>
			</div>

			<VTextarea
				:model-value="feedbackComment"
				rows="2"
				auto-grow
				density="compact"
				class="mt-3"
				:label="t('components.cardElement.assignmentElement.teacherComment')"
				data-testid="submission-feedback-input"
				@update:model-value="(value: string) => emit('update:feedback', value)"
			/>

			<span v-if="gradedByName" class="text-caption text-medium-emphasis" data-testid="submission-graded-by">
				{{ t("components.cardElement.assignmentElement.gradedBy", { name: gradedByName }) }}
			</span>

			<div class="d-flex align-center justify-end ga-2 mt-2">
				<span v-if="isDirty" class="text-caption text-medium-emphasis mr-auto" data-testid="submission-unsaved">
					{{ t("components.cardElement.assignmentElement.unsavedChanges") }}
				</span>
				<VBtn
					variant="tonal"
					size="small"
					:loading="busy.saving"
					data-testid="submission-save-grade"
					@click="emit('save')"
				>
					{{ t("common.actions.save") }}
				</VBtn>
				<VBtn
					variant="flat"
					color="primary"
					size="small"
					:loading="busy.returning"
					data-testid="submission-return"
					@click="emit('return')"
				>
					{{ t("components.cardElement.assignmentElement.returnSubmission") }}
				</VBtn>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import { feedbackFileTimestamp } from "../feedback-files.util";
import { FileRecord } from "@/types/file/File";
import { AudioRecorder } from "@/utils/audio-recorder";
import { formatUtc } from "@/utils/date-time.utils";
import { isImageMimeType, isPdfMimeType, isPreviewPossible } from "@/utils/fileHelper";
import {
	AssignmentStatus,
	AssignmentSubmissionFileResponse,
	AssignmentSubmissionResponse,
	AssignmentSubmissionRubricCriterionResponse,
} from "@api-server";
import {
	mdiEyeOutline,
	mdiFileDocumentOutline,
	mdiMicrophone,
	mdiPencilOutline,
	mdiTrayArrowDown,
} from "@icons/material";
import { PreviewImage } from "@ui-preview-image";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

// Pure display of one submission's correction workspace: file previews, the
// teacher's own correction files/audio, and the grading form. All state (drafts,
// upload/annotator busy flags, recording) lives in the parent overlay - this
// component only renders it and reports interactions via events.
const props = defineProps<{
	submission: AssignmentSubmissionResponse;
	submissionFile: FileRecord | undefined;
	previewUrl: string | undefined;
	// every version of the student's submission document, newest first, for the version
	// switcher; empty/single-item lists collapse to no switcher at all
	fileVersions: AssignmentSubmissionFileResponse[];
	selectedVersionId: string | null;
	feedbackFiles: FileRecord[];
	feedbackAudioUrl: string | undefined;
	maxPoints: number | null;
	points: number | null;
	// non-empty only for assignments with a rubric - when present, one input per criterion
	// replaces the flat points field above
	criteria: AssignmentSubmissionRubricCriterionResponse[];
	criterionPoints: Record<string, number | null>;
	feedbackComment: string;
	isDirty: boolean;
	busy: {
		saving: boolean;
		returning: boolean;
		downloading: boolean;
		annotating: boolean;
		uploadingAudio: boolean;
	};
	recording: {
		isRecording: boolean;
		recorded: { url: string } | undefined;
	};
}>();

const emit = defineEmits<{
	(e: "view-file"): void;
	(e: "select-version", fileRecordId: string): void;
	(e: "annotate-file"): void;
	(e: "download-file"): void;
	(e: "view-feedback", record: FileRecord): void;
	(e: "continue-feedback", record: FileRecord): void;
	(e: "download-feedback", record: FileRecord): void;
	(e: "start-recording"): void;
	(e: "stop-recording"): void;
	(e: "upload-recording"): void;
	(e: "discard-recording"): void;
	(e: "update:points", value: string): void;
	(e: "update:criterionPoints", criterionId: string, value: string): void;
	(e: "update:feedback", value: string): void;
	(e: "save"): void;
	(e: "return"): void;
}>();

const { t } = useI18n();

const studentName = computed(
	() => `${props.submission.firstName ?? ""} ${props.submission.lastName ?? ""}`.trim() || "—"
);

// Only relevant once a room has more than one teacher - see AssignmentUc.listSubmissions
// (gradedBy) and the "Bewertet von X" plan entry. Absent for ungraded submissions and
// never present at all for a student's own view.
const gradedByName = computed(() =>
	`${props.submission.gradedByFirstName ?? ""} ${props.submission.gradedByLastName ?? ""}`.trim()
);

const statusLabel = computed(() => t(`components.cardElement.assignmentElement.status.${props.submission.status}`));

const statusColor = computed(() => {
	switch (props.submission.status) {
		case AssignmentStatus.RETURNED:
			return "success";
		case AssignmentStatus.SUBMITTED:
		case AssignmentStatus.IN_REVIEW:
			return "info";
		default:
			return undefined;
	}
});

const criteriaPointsTotal = computed(() =>
	props.criteria.reduce((sum, criterion) => sum + (props.criterionPoints[criterion.id] ?? 0), 0)
);

const versionItems = computed(() =>
	props.fileVersions.map((version) => ({
		title:
			version.createdAt && formatUtc(version.createdAt, "dateTime")
				? t("components.cardElement.assignmentElement.versions.entry", {
						version: version.version ?? "?",
						date: formatUtc(version.createdAt, "dateTime"),
					})
				: version.name,
		value: version.fileRecordId,
	}))
);

const submissionMimeType = computed(() => props.submissionFile?.mimeType);

const isPdfFile = computed(() => submissionMimeType.value !== undefined && isPdfMimeType(submissionMimeType.value));

const isImageFile = computed(() => submissionMimeType.value !== undefined && isImageMimeType(submissionMimeType.value));

const isAnnotatable = computed(() => isPdfFile.value || isImageFile.value);

const isViewableFeedbackFile = (record: FileRecord): boolean => {
	if (isPdfMimeType(record.mimeType)) {
		return true;
	}

	return isImageMimeType(record.mimeType) && isPreviewPossible(record.previewStatus);
};

const correctionLabel = (record: FileRecord): string => {
	const timestamp = feedbackFileTimestamp(record.name);
	if (timestamp === undefined) {
		return record.name;
	}

	const date = formatUtc(new Date(timestamp), "dateTime");
	return date ? t("components.cardElement.assignmentElement.correctionFile", { date }) : record.name;
};
</script>

<style scoped lang="scss">
.submission-name {
	font-weight: 600;
}
.submission-comment {
	word-break: break-word;
}
.submission-none {
	opacity: 0.8;
}
.submission-thumbnail {
	width: 72px;
	height: 48px;
	border-radius: 4px;
	object-fit: cover;
	cursor: pointer;
	flex-shrink: 0;
}
</style>
