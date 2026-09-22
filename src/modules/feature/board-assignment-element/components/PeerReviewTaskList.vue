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
					:points="draftPoints[selectedTask.id] ?? selectedTask.points ?? null"
					:feedback-comment="draftComments[selectedTask.id] ?? selectedTask.feedbackComment ?? ''"
					:submitting="submittingTaskId === selectedTask.id"
					@view-file="onViewFile"
					@download-file="onDownloadFile"
					@update:points="onUpdatePoints"
					@update:feedback-comment="onUpdateComment"
					@submit="onSubmit"
				/>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { isFeedbackName } from "../feedback-files.util";
import PeerReviewTaskDetail from "./PeerReviewTaskDetail.vue";
import { FileRecordParent } from "@/types/file/File";
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
const { fetchMyTasks, submitReview } = usePeerReviewApi();
const { fetchFiles, getFileRecordsByParentId } = useFileStorageApi();
const lightBox = useLightBox();

const loading = ref(false);
const tasks = ref<PeerReviewTaskResponse[]>([]);
const selectedTaskId = ref<string | undefined>(undefined);
const draftPoints = ref<Record<string, number | null>>({});
const draftComments = ref<Record<string, string>>({});
const submittingTaskId = ref<string | undefined>(undefined);

const selectedTask = computed(() => tasks.value.find((task) => task.id === selectedTaskId.value));

const selectedFileRecord = computed(() => {
	if (!selectedTask.value) return undefined;
	return getFileRecordsByParentId(selectedTask.value.submissionId).find((record) => !isFeedbackName(record.name));
});

const load = async () => {
	loading.value = true;
	const result = await fetchMyTasks();
	tasks.value = result ?? [];
	if (!tasks.value.some((task) => task.id === selectedTaskId.value)) {
		selectedTaskId.value = tasks.value[0]?.id;
	}
	await Promise.allSettled(tasks.value.map((task) => fetchFiles(task.submissionId, FileRecordParent.BOARDNODES)));
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
