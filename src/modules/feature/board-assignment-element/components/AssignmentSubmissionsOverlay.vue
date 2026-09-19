<template>
	<VDialog
		:model-value="isOpen"
		max-width="1200"
		:fullscreen="smAndDown"
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
				<VChip size="small" class="mr-2" data-testid="submissions-overlay-count">
					{{ submittedCount }}/{{ submissions.length }}
				</VChip>
				<VBtn icon variant="text" data-testid="submissions-overlay-close" @click="onClose">
					<VIcon :icon="mdiClose" />
				</VBtn>
			</VCardTitle>

			<div v-if="!loading && submissions.length > 0" class="px-4 pb-2">
				<VProgressLinear :model-value="gradedRatio" height="6" rounded color="success" bg-color="surface-variant" />
				<div class="text-caption text-medium-emphasis mt-1" data-testid="submissions-overlay-progress">
					{{
						t("components.cardElement.assignmentElement.submissionsProgress", { graded: gradedCount, open: openCount })
					}}
				</div>
			</div>

			<VDivider />

			<VCardText>
				<div class="d-flex align-center flex-wrap ga-2 mb-3">
					<VChipGroup v-model="filterStatus" mandatory selected-class="text-primary">
						<VChip
							v-for="filter in statusFilters"
							:key="filter.key"
							:value="filter.key"
							size="small"
							filter
							data-testid="assignment-filter-chip"
						>
							{{ filter.label }}
						</VChip>
					</VChipGroup>
					<VSpacer />
					<VSelect
						v-model="sortBy"
						:items="sortOptions"
						density="compact"
						hide-details
						style="max-width: 200px"
						data-testid="assignment-sort-select"
					/>
					<VMenu>
						<template #activator="{ props: menuProps }">
							<VBtn icon variant="text" v-bind="menuProps" data-testid="assignment-export-menu">
								<VIcon :icon="mdiDotsVertical" />
							</VBtn>
						</template>
						<VList density="compact">
							<VListItem :disabled="isCsvExporting" data-testid="assignment-csv-button" @click="exportCsv">
								<template #prepend><VIcon :icon="mdiFileDelimited" size="small" /></template>
								<VListItemTitle>{{ t("components.cardElement.assignmentElement.exportCsv") }}</VListItemTitle>
							</VListItem>
							<VListItem
								:disabled="isArchiveExporting"
								data-testid="assignment-archive-button"
								@click="downloadArchive"
							>
								<template #prepend><VIcon :icon="mdiFolderZipOutline" size="small" /></template>
								<VListItemTitle>{{ t("components.cardElement.assignmentElement.downloadArchive") }}</VListItemTitle>
							</VListItem>
						</VList>
					</VMenu>
				</div>

				<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>

				<div v-else class="submissions-layout">
					<VList
						v-if="!smAndDown || selectedSubmission === undefined"
						class="submissions-list"
						density="compact"
						role="listbox"
						data-testid="submissions-list"
					>
						<div v-if="visibleSubmissions.length === 0" class="text-caption text-medium-emphasis pa-4">
							{{ t("components.cardElement.assignmentElement.noSubmissionsForFilter") }}
						</div>
						<VListItem
							v-for="submission in visibleSubmissions"
							:key="submission.userId"
							class="submission-block"
							role="option"
							:active="submission.userId === selectedUserId"
							:aria-selected="submission.userId === selectedUserId"
							data-testid="submission-block"
							@click="selectedUserId = submission.userId"
						>
							<div class="d-flex align-center ga-2">
								<span class="submission-name flex-grow-1 text-truncate" data-testid="submission-name">
									{{ submission.lastName }}, {{ submission.firstName }}
								</span>
								<VIcon v-if="isGraded(submission)" :icon="mdiCheckCircle" size="x-small" color="success" />
							</div>
							<div class="d-flex align-center ga-2 mt-1">
								<VChip size="x-small" :color="statusColor(submission)">{{ statusLabel(submission) }}</VChip>
								<VChip v-if="submission.isLate" size="x-small" color="warning">
									{{ t("components.cardElement.assignmentElement.status.late") }}
								</VChip>
							</div>
						</VListItem>
					</VList>

					<div v-if="!smAndDown || selectedSubmission !== undefined" class="submissions-detail">
						<div v-if="smAndDown" class="mb-2">
							<VBtn
								variant="text"
								size="small"
								:prepend-icon="mdiChevronLeft"
								data-testid="submission-back"
								@click="selectedUserId = undefined"
							>
								{{ t("components.cardElement.assignmentElement.submissionsTitle") }}
							</VBtn>
						</div>

						<div v-if="selectedSubmission === undefined" class="text-caption text-medium-emphasis pa-4">
							{{ t("components.cardElement.assignmentElement.selectSubmission") }}
						</div>

						<template v-else>
							<div class="d-flex align-center justify-space-between mb-2">
								<VBtn
									icon
									variant="text"
									size="small"
									:disabled="!hasPreviousSubmission"
									:title="t('components.cardElement.assignmentElement.previousSubmission')"
									data-testid="submission-previous"
									@click="selectAdjacentSubmission(-1)"
								>
									<VIcon :icon="mdiChevronLeft" />
								</VBtn>
								<VBtn
									icon
									variant="text"
									size="small"
									:disabled="!hasNextSubmission"
									:title="t('components.cardElement.assignmentElement.nextSubmission')"
									data-testid="submission-next"
									@click="selectAdjacentSubmission(1)"
								>
									<VIcon :icon="mdiChevronRight" />
								</VBtn>
							</div>

							<AssignmentSubmissionDetail
								:submission="selectedSubmission"
								:submission-file="submissionFileRecord(selectedSubmission)"
								:preview-url="previewUrl(selectedSubmission)"
								:feedback-files="latestFeedbackFileRecords(selectedSubmission)"
								:feedback-audio-url="feedbackAudioRecord(selectedSubmission)?.url"
								:max-points="maxPoints"
								:points="draftPoints[selectedSubmission.userId] ?? selectedSubmission.points ?? null"
								:feedback-comment="draftFeedback[selectedSubmission.userId] ?? selectedSubmission.feedbackComment ?? ''"
								:is-dirty="isDirty(selectedSubmission)"
								:busy="{
									saving: savingUserId === selectedSubmission.userId,
									returning: returningUserId === selectedSubmission.userId,
									downloading: downloadingUserId === selectedSubmission.userId,
									annotating: annotateBusy,
									uploadingAudio: uploadingAudioUserId === selectedSubmission.userId,
								}"
								:recording="{
									isRecording: recordingUserId === selectedSubmission.userId,
									recorded: recordingTargetUserId === selectedSubmission.userId ? recordedAudio : undefined,
								}"
								@view-file="openFile(selectedSubmission)"
								@annotate-file="openAnnotator(selectedSubmission)"
								@download-file="downloadSubmissionFile(selectedSubmission)"
								@view-feedback="openFeedbackFile"
								@continue-feedback="onContinueFeedback"
								@download-feedback="(record) => downloadFile(record.url, record.name)"
								@start-recording="startRecording(selectedSubmission)"
								@stop-recording="stopRecording"
								@upload-recording="uploadRecording(selectedSubmission)"
								@discard-recording="discardRecording"
								@update:points="onUpdatePoints"
								@update:feedback="onUpdateFeedback"
								@save="onSaveGrade(selectedSubmission)"
								@return="onReturnSubmission(selectedSubmission)"
							/>
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
import { isFeedbackAudioName, isFeedbackName, latestFeedbackFileNames } from "../feedback-files.util";
import AssignmentPdfAnnotator, { type AnnotatorSource } from "./AssignmentPdfAnnotator.vue";
import AssignmentSubmissionDetail from "./AssignmentSubmissionDetail.vue";
import { AssignmentElement } from "@/types/board/ContentElement";
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { AudioRecorder } from "@/utils/audio-recorder";
import { formatUtc } from "@/utils/date-time.utils";
import { downloadFile, isPdfMimeType } from "@/utils/fileHelper";
import { convertDownloadToPreviewUrl, isPreviewPossible } from "@/utils/fileHelper";
import { AssignmentStatus, AssignmentSubmissionResponse } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import {
	mdiCheckCircle,
	mdiChevronLeft,
	mdiChevronRight,
	mdiClose,
	mdiDotsVertical,
	mdiFileDelimited,
	mdiFolderZipOutline,
} from "@icons/material";
import { LightBoxContentType, useLightBox } from "@ui-light-box";
import { onKeyStroke } from "@vueuse/core";
import JSZip from "jszip";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";

// Teacher view of all submissions below one assignment element: a list to page
// through on the left and the selected student's correction workspace on the
// right (AssignmentSubmissionDetail) - filters, sorting, export and the PDF/image
// annotator dialog are owned here.
const props = defineProps<{
	element: AssignmentElement;
	isOpen: boolean;
}>();

const emit = defineEmits<{
	(e: "close"): void;
}>();

const { t } = useI18n();
const { smAndDown } = useDisplay();
const { fetchSubmissions, gradeSubmission, returnSubmission } = useAssignmentApi();
const { fetchFiles, getFileRecordsByParentId, upload } = useFileStorageApi();
const lightBox = useLightBox();

const FEEDBACK_AUDIO_PREFIX = "feedback-audio-";

const loading = ref(false);
const submissions = ref<AssignmentSubmissionResponse[]>([]);
const draftPoints = ref<Record<string, number | null>>({});
const draftFeedback = ref<Record<string, string>>({});
const savingUserId = ref<string | undefined>(undefined);
const returningUserId = ref<string | undefined>(undefined);
const downloadingUserId = ref<string | undefined>(undefined);
const filterStatus = ref<string>("all");
const sortBy = ref<string>("name");
// undefined = nothing selected; unlike submission.id (null for anyone who hasn't
// submitted yet, which several rows can share at once), userId always exists and
// is unique per row, so it is the only safe identity to key the selection on.
const selectedUserId = ref<string | undefined>(undefined);
const recordingUserId = ref<string | undefined>(undefined);
const recordingTargetUserId = ref<string | undefined>(undefined);
const recordedAudio = ref<{ url: string; blob: Blob } | undefined>(undefined);
const uploadingAudioUserId = ref<string | undefined>(undefined);
const isCsvExporting = ref(false);
const isArchiveExporting = ref(false);

let recorder: AudioRecorder | undefined;

const maxPoints = computed(() => props.element.content.maxPoints ?? null);

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

const submittedCount = computed(() => submissions.value.filter((s) => s.status !== AssignmentStatus.OPEN).length);

const isGraded = (submission: AssignmentSubmissionResponse) =>
	submission.status === AssignmentStatus.RETURNED || submission.points !== null;

const gradedCount = computed(() => submissions.value.filter(isGraded).length);
const openCount = computed(() => submissions.value.length - gradedCount.value);
const gradedRatio = computed(() =>
	submissions.value.length === 0 ? 0 : (gradedCount.value / submissions.value.length) * 100
);

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

const selectedSubmission = computed(() => visibleSubmissions.value.find((s) => s.userId === selectedUserId.value));

// same list and the same key as the selection itself, so the displayed row, the
// prev/next buttons and the arrow keys can never disagree about which row is active
const selectedIndex = computed(() => visibleSubmissions.value.findIndex((s) => s.userId === selectedUserId.value));
const hasPreviousSubmission = computed(() => selectedIndex.value > 0);
const hasNextSubmission = computed(
	() => selectedIndex.value >= 0 && selectedIndex.value < visibleSubmissions.value.length - 1
);

const selectAdjacentSubmission = (offset: number) => {
	const target = visibleSubmissions.value[selectedIndex.value + offset];
	if (target) {
		selectedUserId.value = target.userId;
	}
};

// keep a valid selection whenever the visible list changes (filter/sort/reload) -
// falls back to the first visible submission, or none when the list is empty
watch(visibleSubmissions, (list) => {
	if (!list.some((s) => s.userId === selectedUserId.value)) {
		selectedUserId.value = list[0]?.userId;
	}
});

const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof HTMLElement)) return false;
	return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
};

// arrow-key paging through the list, mirroring the prev/next buttons exactly -
// ignored while typing in a field, and while the annotator or light box sits on
// top of this dialog. The overlay stays mounted (v-is-open, not v-if), so this
// listener must gate on isOpen itself rather than relying on being unmounted.
onKeyStroke(["ArrowLeft", "ArrowRight"], (event) => {
	if (!props.isOpen) return;
	if (annotatorSource.value !== undefined) return;
	if (lightBox.isLightBoxOpen.value) return;
	if (isEditableTarget(event.target)) return;

	if (event.key === "ArrowLeft" && hasPreviousSubmission.value) {
		selectAdjacentSubmission(-1);
	} else if (event.key === "ArrowRight" && hasNextSubmission.value) {
		selectAdjacentSubmission(1);
	}
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
	draftPoints.value[submission.userId] = value === "" ? null : Number(value);
};

const setDraftFeedback = (submission: AssignmentSubmissionResponse, value: string) => {
	draftFeedback.value[submission.userId] = value;
};

// wrapped so the template can bind them without inlining a closure over
// selectedSubmission (which the template type checker cannot narrow past undefined)
const onContinueFeedback = (record: FileRecord) => {
	if (selectedSubmission.value) startAnnotator(selectedSubmission.value, record);
};

const onUpdatePoints = (value: string) => {
	if (selectedSubmission.value) setDraftPoints(selectedSubmission.value, value);
};

const onUpdateFeedback = (value: string) => {
	if (selectedSubmission.value) setDraftFeedback(selectedSubmission.value, value);
};

const isDirty = (submission: AssignmentSubmissionResponse) => {
	const pointsDirty =
		submission.userId in draftPoints.value && draftPoints.value[submission.userId] !== (submission.points ?? null);
	const feedbackDirty =
		submission.userId in draftFeedback.value &&
		draftFeedback.value[submission.userId] !== (submission.feedbackComment ?? "");

	return pointsDirty || feedbackDirty;
};

const gradeBody = (submission: AssignmentSubmissionResponse) => {
	const points = draftPoints.value[submission.userId] ?? submission.points ?? null;
	return {
		points: points === null ? undefined : points,
		feedbackComment: draftFeedback.value[submission.userId] ?? submission.feedbackComment ?? null,
	};
};

const onSaveGrade = async (submission: AssignmentSubmissionResponse) => {
	if (!submission.id) return;
	savingUserId.value = submission.userId;
	await gradeSubmission(submission.id, gradeBody(submission));
	await load();
	savingUserId.value = undefined;
};

const onReturnSubmission = async (submission: AssignmentSubmissionResponse) => {
	if (!submission.id) return;
	returningUserId.value = submission.userId;
	await returnSubmission(submission.id, gradeBody(submission));
	await load();
	returningUserId.value = undefined;
};

const downloadSubmissionFile = async (submission: AssignmentSubmissionResponse) => {
	downloadingUserId.value = submission.userId;
	try {
		const record = submissionFileRecord(submission);
		if (record) {
			downloadFile(record.url, record.name);
		}
	} finally {
		downloadingUserId.value = undefined;
	}
};

const startRecording = async (submission: AssignmentSubmissionResponse) => {
	recorder = new AudioRecorder();
	try {
		await recorder.start();
		recordingUserId.value = submission.userId;
		recordingTargetUserId.value = submission.userId;
	} catch {
		// microphone denied or unavailable - nothing to clean up, the UI stays unchanged
		recorder = undefined;
	}
};

const stopRecording = async () => {
	if (!recorder) return;
	const blob = await recorder.stop();
	recordedAudio.value = { url: URL.createObjectURL(blob), blob };
	recordingUserId.value = undefined;
};

const discardRecording = () => {
	if (recordedAudio.value) {
		URL.revokeObjectURL(recordedAudio.value.url);
	}
	recordedAudio.value = undefined;
	recordingUserId.value = undefined;
	recordingTargetUserId.value = undefined;
	recorder = undefined;
};

const uploadRecording = async (submission: AssignmentSubmissionResponse) => {
	if (!recordedAudio.value || !submission.id) return;

	uploadingAudioUserId.value = submission.userId;
	try {
		const blob = recordedAudio.value.blob;
		const extension = AudioRecorder.getExtension(blob.type);
		const file = new File([blob], `${FEEDBACK_AUDIO_PREFIX}${Date.now()}.${extension}`, { type: blob.type });
		await upload(file, submission.id, FileRecordParent.BOARDNODES);
		discardRecording();
		await load();
	} finally {
		uploadingAudioUserId.value = undefined;
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
	`${submission.lastName ?? ""}, ${submission.firstName ?? ""}`.replace(/^, |, $/, "").trim() || (submission.id ?? "—");

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
			draftPoints.value = {};
			draftFeedback.value = {};
			filterStatus.value = "all";
			sortBy.value = "name";
			selectedUserId.value = undefined;
			discardRecording();
			void load();
		}
	},
	{ immediate: true }
);
</script>

<style scoped lang="scss">
.submissions-layout {
	display: flex;
	gap: 16px;
	align-items: flex-start;
}
.submissions-list {
	flex: 0 0 240px;
	max-height: 65vh;
	overflow-y: auto;
	border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.submissions-detail {
	flex: 1 1 auto;
	min-width: 0;
	max-height: 65vh;
	overflow-y: auto;
	padding: 0 4px;
}
.submission-block {
	border-radius: 8px;
	margin-bottom: 4px;
}
</style>
