<template>
	<VDialog
		:model-value="isOpen"
		max-width="860"
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
				<div class="d-flex align-center flex-wrap gap-2 mb-3">
					<VChip
						v-for="filter in statusFilters"
						:key="filter.key"
						:color="filterStatus === filter.key ? 'primary' : undefined"
						data-testid="assignment-filter-chip"
						clickable
						@click="filterStatus = filter.key"
					>
						{{ filter.label }}
					</VChip>
					<VSpacer />
					<VSelect
						v-model="sortBy"
						:items="sortOptions"
						density="compact"
						hide-details
						style="max-width: 220px"
						data-testid="assignment-sort-select"
					/>
				</div>

				<div class="d-flex justify-end gap-2 mb-3">
					<VBtn
						variant="tonal"
						size="small"
						:loading="isCsvExporting"
						data-testid="assignment-csv-button"
						@click="exportCsv"
					>
						{{ t("components.cardElement.assignmentElement.exportCsv") }}
					</VBtn>
					<VBtn
						variant="tonal"
						size="small"
						:loading="isArchiveExporting"
						data-testid="assignment-archive-button"
						@click="downloadArchive"
					>
						{{ t("components.cardElement.assignmentElement.downloadArchive") }}
					</VBtn>
				</div>

				<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>

				<div v-else class="d-flex flex-column gap-4">
					<div
						v-for="submission in visibleSubmissions"
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

						<div
							v-if="submissionFileRecord(submission) || submission.file"
							class="d-flex align-center mt-2"
							data-testid="submission-file-row"
						>
							<PreviewImage
								v-if="previewUrl(submission)"
								:src="previewUrl(submission) ?? ''"
								:alt="submissionFileRecord(submission)?.name ?? ''"
								class="submission-thumbnail mr-3"
								data-testid="submission-file-thumbnail"
								@click="openFile(submission)"
							/>
							<VIcon v-else :icon="mdiFileDocumentOutline" size="small" class="mr-2" />
							<span data-testid="submission-file-name">
								{{ submissionFileRecord(submission)?.name ?? submission.file?.name }}
							</span>
							<VSpacer />
							<VBtn
								v-if="isPdfFile(submission)"
								variant="text"
								size="small"
								data-testid="submission-view"
								@click="openFile(submission)"
							>
								{{ t("components.cardElement.assignmentElement.viewFile") }}
							</VBtn>
							<VBtn
								v-if="isAnnotatable(submission)"
								variant="tonal"
								size="small"
								:disabled="annotateBusy"
								data-testid="submission-annotate"
								@click="openAnnotator(submission)"
							>
								{{ t("components.cardElement.assignmentElement.annotate") }}
							</VBtn>
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

						<div
							v-for="record in latestFeedbackFileRecords(submission)"
							:key="record.id"
							class="d-flex align-center mt-2"
							data-testid="submission-feedback-file"
						>
							<VIcon :icon="mdiFileDocumentOutline" size="small" class="mr-2" />
							<span>{{ record.name }}</span>
							<VSpacer />
							<VBtn
								v-if="isPdfMimeType(record.mimeType) || isImageMimeType(record.mimeType)"
								variant="tonal"
								size="small"
								:disabled="annotateBusy"
								:data-testid="`submission-feedback-annotate-${record.id}`"
								@click="startAnnotator(submission, record)"
							>
								{{ t("components.cardElement.assignmentElement.annotator.continue") }}
							</VBtn>
							<VBtn
								v-if="isViewableFeedbackFile(record)"
								variant="text"
								size="small"
								:data-testid="`submission-feedback-file-view-${record.id}`"
								@click="openFeedbackFile(record)"
							>
								{{ t("components.cardElement.assignmentElement.viewFile") }}
							</VBtn>
							<VBtn
								variant="text"
								size="small"
								:data-testid="`submission-feedback-file-download-${record.id}`"
								@click="downloadFile(record.url, record.name)"
							>
								{{ t("components.cardElement.assignmentElement.downloadFile") }}
							</VBtn>
						</div>

						<div
							v-if="feedbackAudioRecord(submission)"
							class="d-flex align-center mt-2"
							data-testid="submission-feedback-audio"
						>
							<VIcon :icon="mdiMicrophone" size="small" class="mr-2" />
							<audio
								:src="feedbackAudioRecord(submission)?.url"
								controls
								class="flex-grow-1"
								data-testid="submission-audio-player"
								preload="none"
							/>
						</div>

						<div v-if="submission.comment" class="submission-comment mt-2" data-testid="submission-comment">
							<span class="text-caption">
								{{ t("components.cardElement.assignmentElement.studentComment") }}:
							</span>
							{{ submission.comment }}
						</div>

						<template v-if="submission.id !== null">
							<div class="d-flex align-center mt-3" data-testid="submission-audio-feedback-row">
								<template v-if="recordingSubmissionId === submission.id">
									<VBtn size="small" color="error" data-testid="submission-record-stop" @click="stopRecording">
										{{ t("components.cardElement.assignmentElement.audioStop") }}
									</VBtn>
									<span class="text-caption ml-2">{{ t("components.cardElement.assignmentElement.audioRecording") }}</span>
								</template>
								<template v-else-if="recordedAudio && recordingTargetId === submission.id">
									<audio :src="recordedAudio.url" controls class="flex-grow-1" data-testid="submission-recorded-preview" />
									<VBtn
										variant="tonal"
										size="small"
										class="ml-2"
										:loading="uploadingAudioId === submission.id"
										data-testid="submission-audio-upload"
										@click="uploadRecording(submission)"
									>
										{{ t("components.cardElement.assignmentElement.audioUpload") }}
									</VBtn>
									<VBtn
										variant="text"
										size="small"
										data-testid="submission-audio-discard"
										@click="discardRecording"
									>
										{{ t("common.actions.cancel") }}
									</VBtn>
								</template>
								<template v-else>
									<VBtn
										v-if="AudioRecorder.isSupported()"
										variant="tonal"
										size="small"
										:loading="uploadingAudioId === submission.id"
										data-testid="submission-record"
										@click="startRecording(submission)"
									>
										<VIcon :icon="mdiMicrophone" size="small" class="mr-1" />
										{{ t("components.cardElement.assignmentElement.audioRecord") }}
									</VBtn>
								</template>
							</div>

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

		<AssignmentPdfAnnotator
			:is-open="annotatorSource !== undefined"
			:source="annotatorSource"
			:student-name="annotatorStudentName"
			:error-message="annotateError ? t('components.cardElement.assignmentElement.annotateSaveError') : undefined"
			@cancel="closeAnnotator"
			@save="onAnnotatorSave"
		/>
	</VDialog>
</template>

<script setup lang="ts">
import { AssignmentElement } from "@/types/board/ContentElement";
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { formatUtc } from "@/utils/date-time.utils";
import { downloadFile, isImageMimeType, isPdfMimeType } from "@/utils/fileHelper";
import { AudioRecorder } from "@/utils/audio-recorder";
import { AssignmentStatus, AssignmentSubmissionFileResponse, AssignmentSubmissionResponse } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import { mdiClose, mdiFileDocumentOutline, mdiMicrophone } from "@icons/material";
import { PreviewImage } from "@ui-preview-image";
import { convertDownloadToPreviewUrl, isPreviewPossible } from "@/utils/fileHelper";
import { LightBoxContentType, useLightBox } from "@ui-light-box";
import JSZip from "jszip";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import AssignmentPdfAnnotator, { type AnnotatorSource } from "./AssignmentPdfAnnotator.vue";
import {
	isFeedbackAudioName,
	isFeedbackName,
	latestFeedbackFileNames,
} from "../feedback-files.util";

// Teacher view of all submissions below one assignment element: overview with
// filters and sorting, file preview, audio feedback recording, PDF/image pen
// annotation (saved as a feedback file), draft grading (save), final return
// and CSV/archive export.
const props = defineProps<{
	element: AssignmentElement;
	isOpen: boolean;
}>();

const emit = defineEmits<{
	(e: "close"): void;
}>();

const { t } = useI18n();
const { fetchSubmissions, gradeSubmission, returnSubmission } = useAssignmentApi();
const { fetchFiles, getFileRecordsByParentId, upload } = useFileStorageApi();
const lightBox = useLightBox();

const FEEDBACK_AUDIO_PREFIX = "feedback-audio-";

const loading = ref(false);
const submissions = ref<AssignmentSubmissionResponse[]>([]);
const draftPoints = ref<Record<string, number | null>>({});
const draftFeedback = ref<Record<string, string>>({});
const savingId = ref<string | null>(null);
const returningId = ref<string | null>(null);
const downloadingId = ref<string | null>(null);
const filterStatus = ref<string>("all");
const sortBy = ref<string>("name");
const recordingSubmissionId = ref<string | null>(null);
const recordingTargetId = ref<string | null>(null);
const recordedAudio = ref<{ url: string; blob: Blob } | undefined>(undefined);
const uploadingAudioId = ref<string | null>(null);
const isCsvExporting = ref(false);
const isArchiveExporting = ref(false);

let recorder: AudioRecorder | undefined;

const maxPoints = computed(() => props.element.content.maxPoints ?? null);

const pointsLabel = computed(() =>
	maxPoints.value === null
		? t("components.cardElement.assignmentElement.pointsLabel")
		: `${t("components.cardElement.assignmentElement.pointsLabel")} (0–${maxPoints.value})`
);

const statusFilters = computed(() => [
	{ key: "all", label: t("components.cardElement.assignmentElement.filter.all") },
	{ key: "open", label: t("components.cardElement.assignmentElement.filter.open") },
	{ key: "submitted", label: t("components.cardElement.assignmentElement.filter.submitted") },
	{ key: "returned", label: t("components.cardElement.assignmentElement.filter.returned") },
	{ key: "late", label: t("components.cardElement.assignmentElement.filter.late") },
]);

const sortOptions = computed(() => [
	{ title: t("components.cardElement.assignmentElement.sort.name"), value: "name" },
	{ title: t("components.cardElement.assignmentElement.sort.nameDesc"), value: "nameDesc" },
	{ title: t("components.cardElement.assignmentElement.sort.date"), value: "date" },
	{ title: t("components.cardElement.assignmentElement.sort.status"), value: "status" },
]);

const STATUS_ORDER: Record<string, number> = {
	open: 0,
	submitted: 1,
	inReview: 2,
	returned: 3,
};

const visibleSubmissions = computed(() => {
	let result = [...submissions.value];

	if (filterStatus.value === "open") {
		result = result.filter((s) => s.status === AssignmentStatus.OPEN);
	} else if (filterStatus.value === "submitted") {
		result = result.filter((s) => s.status === AssignmentStatus.SUBMITTED || s.status === AssignmentStatus.IN_REVIEW);
	} else if (filterStatus.value === "returned") {
		result = result.filter((s) => s.status === AssignmentStatus.RETURNED);
	} else if (filterStatus.value === "late") {
		result = result.filter((s) => s.isLate);
	}

	const nameOf = (s: AssignmentSubmissionResponse) => `${s.lastName} ${s.firstName}`;
	if (sortBy.value === "name") {
		result.sort((a, b) => nameOf(a).localeCompare(nameOf(b)));
	} else if (sortBy.value === "nameDesc") {
		result.sort((a, b) => nameOf(b).localeCompare(nameOf(a)));
	} else if (sortBy.value === "date") {
		result.sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
	} else if (sortBy.value === "status") {
		result.sort((a, b) => (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0));
	}

	return result;
});

const load = async () => {
	loading.value = true;
	const list = await fetchSubmissions(props.element.id);
	submissions.value = list?.submissions ?? [];

	// previews and audio players need the file records (url, preview status) -
	// one request per submission, tolerating individual failures
	await Promise.allSettled(
		submissions.value
			.filter((submission) => submission.id !== null)
			.map((submission) => fetchFiles(submission.id as string, FileRecordParent.BOARDNODES))
	);

	loading.value = false;
};

watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			draftPoints.value = {};
			draftFeedback.value = {};
			filterStatus.value = "all";
			sortBy.value = "name";
			void load();
		}
	}
);

const recordsOf = (submission: AssignmentSubmissionResponse) =>
	submission.id ? getFileRecordsByParentId(submission.id) : [];

const submissionFileRecord = (submission: AssignmentSubmissionResponse) =>
	recordsOf(submission).find((record) => !isFeedbackName(record.name));

const feedbackAudioRecord = (submission: AssignmentSubmissionResponse) =>
	recordsOf(submission).find((record) => isFeedbackAudioName(record.name));

// Only the newest correction per kind (pdf/image) is offered - re-annotating a
// correction creates a new version and the server returns feedback files newest first.
const latestFeedbackFileRecords = (submission: AssignmentSubmissionResponse): FileRecord[] => {
	const latestNames = latestFeedbackFileNames(submission.feedbackFiles);
	const byName = new Map(
		recordsOf(submission)
			.filter((record) => isFeedbackName(record.name) && !isFeedbackAudioName(record.name))
			.map((record) => [record.name, record])
	);

	return [...latestNames].map((name) => byName.get(name)).filter((record): record is FileRecord => !!record);
};

const previewUrl = (submission: AssignmentSubmissionResponse) => {
	const record = submissionFileRecord(submission);
	if (!record || !isPreviewPossible(record.previewStatus)) {
		return undefined;
	}

	return convertDownloadToPreviewUrl(record.url);
};

const openFile = (submission: AssignmentSubmissionResponse) => {
	const record = submissionFileRecord(submission);
	if (!record) {
		return;
	}

	if (isPdfMimeType(record.mimeType)) {
		lightBox.open({
			type: LightBoxContentType.PDF,
			downloadUrl: record.url,
			name: record.name,
		});

		return;
	}

	lightBox.open({
		type: LightBoxContentType.IMAGE,
		downloadUrl: record.url,
		name: record.name,
		previewUrl: previewUrl(submission),
	});
};

const submissionMimeType = (submission: AssignmentSubmissionResponse) => submissionFileRecord(submission)?.mimeType;

const isPdfFile = (submission: AssignmentSubmissionResponse) => {
	const mimeType = submissionMimeType(submission);

	return mimeType !== undefined && isPdfMimeType(mimeType);
};

const isImageFile = (submission: AssignmentSubmissionResponse) => {
	const mimeType = submissionMimeType(submission);

	return mimeType !== undefined && isImageMimeType(mimeType);
};

const isAnnotatable = (submission: AssignmentSubmissionResponse) => isPdfFile(submission) || isImageFile(submission);

const annotateBusy = computed(() => annotatorSaving.value);

const annotatorSource = ref<AnnotatorSource | undefined>(undefined);
const annotatorSaving = ref(false);
const annotateError = ref(false);
const annotatorStudentName = ref<string | undefined>(undefined);
let annotatorSubmissionId: string | null = null;

const studentNameOf = (submission: AssignmentSubmissionResponse) =>
	`${submission.firstName ?? ""} ${submission.lastName ?? ""}`.trim() || undefined;

const openAnnotator = (submission: AssignmentSubmissionResponse) => {
	const record = submissionFileRecord(submission);
	if (!record) return;

	startAnnotator(submission, record);
};

const startAnnotator = (submission: AssignmentSubmissionResponse, record: FileRecord) => {
	annotateError.value = false;
	annotatorSubmissionId = submission.id ?? null;
	annotatorStudentName.value = studentNameOf(submission);
	annotatorSource.value = {
		kind: isPdfMimeType(record.mimeType) ? "pdf" : "image",
		url: record.url,
		name: record.name,
	};
};

const closeAnnotator = () => {
	annotatorSource.value = undefined;
};

const onAnnotatorSave = async ({ blob, name }: { blob: Blob; name: string }) => {
	if (!annotatorSubmissionId) return;

	annotatorSaving.value = true;
	try {
		const file = new File([blob], name, { type: blob.type });
		await upload(file, annotatorSubmissionId, FileRecordParent.BOARDNODES);
		annotateError.value = false;
		closeAnnotator();
		await load();
	} catch {
		// the file storage RPC can fail on broken records - keep the annotator open
		// so the teacher does not lose their strokes, and show the error in place
		annotateError.value = true;
	} finally {
		annotatorSaving.value = false;
	}
};

const isViewableFeedbackFile = (record: FileRecord): boolean => {
	if (isPdfMimeType(record.mimeType)) {
		return true;
	}

	return isImageMimeType(record.mimeType) && isPreviewPossible(record.previewStatus);
};

const openFeedbackFile = (record: FileRecord) => {
	if (isPdfMimeType(record.mimeType)) {
		lightBox.open({
			type: LightBoxContentType.PDF,
			downloadUrl: record.url,
			name: record.name,
		});

		return;
	}

	lightBox.open({
		type: LightBoxContentType.IMAGE,
		downloadUrl: record.url,
		name: record.name,
		// show the original image - the preview service only delivers small
		// thumbnails (max 500px), which look blurry in a fullscreen light box
		previewUrl: record.url,
		alt: record.name,
	});
};

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
		const record = submissionFileRecord(submission);
		if (record) {
			downloadFile(record.url, record.name);
		}
	} finally {
		downloadingId.value = null;
	}
};

const startRecording = async (submission: AssignmentSubmissionResponse) => {
	recorder = new AudioRecorder();
	try {
		await recorder.start();
		recordingSubmissionId.value = submission.id;
		recordingTargetId.value = submission.id;
	} catch {
		// microphone denied or unavailable - nothing to clean up, the UI stays unchanged
		recorder = undefined;
	}
};

const stopRecording = async () => {
	if (!recorder) return;
	const blob = await recorder.stop();
	recordedAudio.value = { url: URL.createObjectURL(blob), blob };
	recordingSubmissionId.value = null;
};

const discardRecording = () => {
	if (recordedAudio.value) {
		URL.revokeObjectURL(recordedAudio.value.url);
	}
	recordedAudio.value = undefined;
	recordingSubmissionId.value = null;
	recordingTargetId.value = null;
	recorder = undefined;
};

const uploadRecording = async (submission: AssignmentSubmissionResponse) => {
	if (!recordedAudio.value || !submission.id) return;

	uploadingAudioId.value = submission.id;
	try {
		const blob = recordedAudio.value.blob;
		const extension = AudioRecorder.getExtension(blob.type);
		const file = new File([blob], `${FEEDBACK_AUDIO_PREFIX}${Date.now()}.${extension}`, { type: blob.type });
		await upload(file, submission.id, FileRecordParent.BOARDNODES);
		discardRecording();
		await load();
	} finally {
		uploadingAudioId.value = null;
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

const nameOf = (submission: AssignmentSubmissionResponse) =>
	`${submission.lastName ?? ""}, ${submission.firstName ?? ""}`.replace(/^, |, $/, "").trim() ||
	(submission.id ?? "—");

const exportCsv = () => {
	isCsvExporting.value = true;
	try {
		const rows: string[][] = submissions.value.map((submission) => [
			nameOf(submission),
			statusLabel(submission),
			submission.submittedAt ? (formatUtc(submission.submittedAt, "dateTime") ?? "") : "",
			submission.isLate ? "x" : "",
			submission.points !== null && submission.points !== undefined ? String(submission.points) : "",
			submission.feedbackComment ?? "",
			submission.comment ?? "",
			submission.file?.name ?? "",
		]);

		const header = [
			t("components.cardElement.assignmentElement.csv.name"),
			t("components.cardElement.assignmentElement.csv.status"),
			t("components.cardElement.assignmentElement.csv.submittedAt"),
			t("components.cardElement.assignmentElement.csv.late"),
			t("components.cardElement.assignmentElement.csv.points"),
			t("components.cardElement.assignmentElement.teacherComment"),
			t("components.cardElement.assignmentElement.studentComment"),
			t("components.cardElement.assignmentElement.csv.file"),
		];

		const csv = [header, ...rows]
			.map((row) => row.map((cell) => `"${(cell ?? "").replaceAll('"', '""')}"`).join(";"))
			.join("\r\n");

		// BOM so Excel opens UTF-8 umlauts correctly
		const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		downloadFile(url, `${csvFileNameBase()}.csv`);
		URL.revokeObjectURL(url);
	} finally {
		isCsvExporting.value = false;
	}
};

const csvFileNameBase = () =>
	(props.element.content.title || t("components.cardElement.assignmentElement.untitled"))
		.replaceAll(/[^\wÄÖÜäöüß -]/g, "")
		.trim() || "assignments";

const downloadArchive = async () => {
	isArchiveExporting.value = true;
	try {
		const zip = new JSZip();
		const usedNames = new Map<string, number>();

		for (const submission of submissions.value) {
			if (!submission.id) continue;
			const records = recordsOf(submission).filter((record) => !record.isUploading);
			if (records.length === 0) continue;

			let folder = nameOf(submission);
			const seen = usedNames.get(folder) ?? 0;
			usedNames.set(folder, seen + 1);
			if (seen > 0) {
				folder = `${folder} (${seen + 1})`;
			}

			for (const record of records) {
				const response = await fetch(record.url);
				if (!response.ok) {
					continue;
				}
				zip.file(`${folder}/${record.name}`, await response.blob());
			}
		}

		const blob = await zip.generateAsync({ type: "blob" });
		const url = URL.createObjectURL(blob);
		downloadFile(url, `${csvFileNameBase()}-Abgaben.zip`);
		URL.revokeObjectURL(url);
	} finally {
		isArchiveExporting.value = false;
	}
};

const onClose = () => {
	emit("close");
};

// opening the overlay (re)loads everything; discardRecording must exist by the time
// this runs, so the watcher is declared after the function definitions
watch(
	() => props.isOpen,
	(isOpen) => {
		if (isOpen) {
			discardRecording();
			void load();
		}
	},
	{ immediate: true }
);
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
.submission-thumbnail {
	width: 72px;
	height: 48px;
	border-radius: 4px;
	object-fit: cover;
	cursor: pointer;
}
.gap-2 {
	gap: 8px;
}
.gap-4 {
	gap: 16px;
}
</style>
