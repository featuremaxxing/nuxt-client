<template>
	<div class="peer-review-task-list" data-testid="peer-review-task-list">
		<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>

		<div
			v-else-if="tasks.length === 0"
			class="text-caption text-medium-emphasis pa-4"
			data-testid="peer-review-no-tasks"
		>
			{{ t("components.cardElement.assignmentElement.peerReview.noTasks") }}
		</div>

		<div v-else class="peer-review-layout">
			<VList class="peer-review-list" density="compact" data-testid="peer-review-tasks">
				<VListItem
					v-for="task in tasks"
					:key="task.id"
					:active="task.id === selectedTaskId"
					data-testid="peer-review-task-item"
					@click="selectTask(task.id)"
				>
					<div class="d-flex align-center ga-2">
						<span class="flex-grow-1 text-truncate">{{ task.file?.name ?? task.submissionId }}</span>
						<VIcon v-if="task.submittedAt" :icon="mdiCheckCircle" size="x-small" color="success" />
					</div>
				</VListItem>
			</VList>

			<div class="peer-review-detail">
				<PeerReviewTaskDetail
					v-if="selectedTask"
					:file-record="selectedFileRecord"
					:correction-files="selectedCorrectionFiles"
					:points="draftPoints[selectedTask.id] ?? selectedTask.points ?? null"
					:feedback-comment="draftComments[selectedTask.id] ?? selectedTask.feedbackComment ?? ''"
					:submitting="submittingTaskId === selectedTask.id"
					@view-file="onViewFile"
					@download-file="onDownloadFile"
					@annotate-file="onAnnotateFile"
					@continue-correction="onContinueCorrection"
					@download-correction="onDownloadCorrection"
					@update:points="onUpdatePoints"
					@update:feedback-comment="onUpdateComment"
					@submit="onSubmit"
				/>
			</div>
		</div>

		<AssignmentPdfAnnotator
			:is-open="annotatorSource !== undefined"
			:source="annotatorSource"
			:error-message="annotateError ? t('components.cardElement.assignmentElement.annotateSaveError') : undefined"
			@cancel="closeAnnotator"
			@save="onAnnotatorSave"
		/>
	</div>
</template>

<script setup lang="ts">
import AssignmentPdfAnnotator, { type AnnotatorSource } from "./AssignmentPdfAnnotator.vue";
import PeerReviewTaskDetail from "./PeerReviewTaskDetail.vue";
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { downloadFile, isPdfMimeType } from "@/utils/fileHelper";
import { PeerReviewTaskResponse } from "@api-server";
import { notifySuccess } from "@data-app";
import { usePeerReviewApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import { mdiCheckCircle } from "@icons/material";
import { LightBoxContentType, useLightBox } from "@ui-light-box";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const { fetchMyTasks, submitReview, ensureReviewFeedbackContainer } = usePeerReviewApi();
const { fetchFiles, getFileRecordsByParentId, upload } = useFileStorageApi();
const lightBox = useLightBox();

const loading = ref(false);
const tasks = ref<PeerReviewTaskResponse[]>([]);
const selectedTaskId = ref<string | undefined>(undefined);
const draftPoints = ref<Record<string, number | null>>({});
const draftComments = ref<Record<string, string>>({});
const submittingTaskId = ref<string | undefined>(undefined);

const annotatorSource = ref<AnnotatorSource | undefined>(undefined);
const annotateError = ref(false);
// the task being annotated, not just its id - ensureReviewFeedbackContainer needs it at save
// time, resolved lazily so opening the annotator never blocks on a network round trip
let annotatorTask: PeerReviewTaskResponse | undefined;

const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value));

const selectedFileRecord = computed(() => {
	if (!selectedTask.value) return undefined;
	// the submission node only ever holds the student's own files - the reviewer has no access
	// to the separate AssignmentFeedback container at all (server-enforced, see A1 in the
	// review notes), so no name filter is needed or even meaningful here any more
	return getFileRecordsByParentId(selectedTask.value.submissionId)[0];
});

// this reviewer's own corrections, on their own container - never fetched until that container
// exists (see load()); newest-first, matching correctionFiles from the server
const selectedCorrectionFiles = computed((): FileRecord[] => {
	const containerId = selectedTask.value?.feedbackContainerId;
	if (!containerId) return [];

	return getFileRecordsByParentId(containerId);
});

const load = async () => {
	loading.value = true;
	const result = await fetchMyTasks();
	tasks.value = result ?? [];
	if (!tasks.value.some((task) => task.id === selectedTaskId.value)) {
		selectedTaskId.value = tasks.value[0]?.id;
	}
	await Promise.allSettled([
		...tasks.value.map((task) => fetchFiles(task.submissionId, FileRecordParent.BOARDNODES)),
		...tasks.value
			.filter((task) => task.feedbackContainerId)
			.map((task) => fetchFiles(task.feedbackContainerId as string, FileRecordParent.BOARDNODES)),
	]);
	loading.value = false;
};

onMounted(load);

const selectTask = (taskId: string) => {
	selectedTaskId.value = taskId;
};

const onUpdatePoints = (value: string) => {
	if (!selectedTask.value) return;
	draftPoints.value[selectedTask.value.id] = value === "" ? null : Number(value);
};

const onUpdateComment = (value: string) => {
	if (!selectedTask.value) return;
	draftComments.value[selectedTask.value.id] = value;
};

const onViewFile = () => {
	const record = selectedFileRecord.value;
	if (!record || !isPdfMimeType(record.mimeType)) return;

	lightBox.open({ type: LightBoxContentType.PDF, downloadUrl: record.url, name: record.name });
};

const onDownloadFile = () => {
	const record = selectedFileRecord.value;
	if (!record) return;

	downloadFile(record.url, record.name);
};

const onDownloadCorrection = (record: FileRecord) => {
	downloadFile(record.url, record.name);
};

const onAnnotateFile = () => {
	const task = selectedTask.value;
	const record = selectedFileRecord.value;
	if (!task || !record) return;

	startAnnotator(task, record);
};

const onContinueCorrection = (record: FileRecord) => {
	const task = selectedTask.value;
	if (!task) return;

	startAnnotator(task, record);
};

const startAnnotator = (task: PeerReviewTaskResponse, record: FileRecord) => {
	annotateError.value = false;
	annotatorTask = task;
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
	if (!annotatorTask) return;

	try {
		// created on first save, reused on every re-annotation after that
		const container = await ensureReviewFeedbackContainer(annotatorTask.id);
		if (!container) {
			annotateError.value = true;
			return;
		}

		const file = new File([blob], name, { type: blob.type });
		await upload(file, container.feedbackContainerId, FileRecordParent.BOARDNODES);
		annotateError.value = false;
		closeAnnotator();
		await load();
	} catch {
		// the file storage RPC can fail on broken records - keep the annotator open so the
		// reviewer does not lose their strokes, and show the error in place
		annotateError.value = true;
	}
};

const onSubmit = async () => {
	if (!selectedTask.value) return;
	const task = selectedTask.value;
	submittingTaskId.value = task.id;
	try {
		const points = draftPoints.value[task.id] ?? task.points ?? undefined;
		const feedbackComment = draftComments.value[task.id] ?? task.feedbackComment ?? undefined;
		const result = await submitReview(task.id, {
			points: points === null ? undefined : points,
			feedbackComment: feedbackComment === null ? undefined : feedbackComment,
		});
		if (result) {
			notifySuccess(t("components.cardElement.assignmentElement.peerReview.reviewSubmitted"));
			await load();
		}
	} finally {
		submittingTaskId.value = undefined;
	}
};
</script>

<style scoped lang="scss">
.peer-review-layout {
	display: flex;
	gap: 16px;
	align-items: flex-start;
}
.peer-review-list {
	flex: 0 0 240px;
	max-height: 60vh;
	overflow-y: auto;
	border-right: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.peer-review-detail {
	flex: 1 1 auto;
	min-width: 0;
}
</style>
