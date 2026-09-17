<template>
	<VCardText class="assignment-student" data-testid="assignment-student-display">
		<div class="assignment-title">
			{{ element.content.title || t("components.cardElement.assignmentElement.untitled") }}
		</div>

		<RenderHTML
			v-if="element.content.text"
			class="assignment-description"
			:html="element.content.text"
			data-testid="assignment-description"
		/>

		<VChip v-if="dueDateLabel" size="small" class="mb-2" data-testid="assignment-due-date-chip">
			{{ dueDateLabel }}
		</VChip>

		<div v-if="loading" class="text-caption">{{ t("common.labels.loading") }}</div>

		<template v-else-if="ownSubmission">
			<VChip size="small" :color="statusColor" class="mb-2" data-testid="assignment-status-chip">
				{{ statusLabel }}
			</VChip>

			<div v-if="ownSubmission.file" class="assignment-file" data-testid="assignment-own-file">
				{{ ownSubmission.file.name }}
			</div>

			<div v-if="isReturned" class="assignment-feedback" data-testid="assignment-feedback">
				<div class="assignment-feedback-heading" data-testid="assignment-feedback-heading">
					{{ t("components.cardElement.assignmentElement.feedbackHeading") }}
				</div>
				<div v-if="maxPoints !== null" class="assignment-points">
					{{ t("components.cardElement.assignmentElement.points", { points: ownSubmission.points ?? 0, maxPoints }) }}
				</div>
				<div v-if="ownSubmission.feedbackComment" data-testid="assignment-teacher-comment">
					{{ ownSubmission.feedbackComment }}
				</div>
				<audio
					v-if="feedbackAudioUrl"
					:src="feedbackAudioUrl"
					controls
					class="mt-2"
					preload="none"
					data-testid="assignment-feedback-audio"
				/>
				<div
					v-for="record in feedbackFileRecords"
					:key="record.id"
					class="d-flex align-center mt-2"
					data-testid="assignment-feedback-file"
				>
					<VIcon :icon="mdiFileDocumentOutline" size="small" class="mr-2" />
					<span class="text-body-2">{{ record.name }}</span>
					<VSpacer />
					<VBtn
						v-if="isPdfMimeType(record.mimeType) || (isImageMimeType(record.mimeType) && isPreviewPossible(record.previewStatus))"
						variant="text"
						size="small"
						:data-testid="`assignment-feedback-file-view-${record.id}`"
						@click="openFeedbackFile(record)"
					>
						{{ t("components.cardElement.assignmentElement.viewFile") }}
					</VBtn>
					<VBtn
						variant="text"
						size="small"
						:data-testid="`assignment-feedback-file-download-${record.id}`"
						@click="downloadFile(record.url, record.name)"
					>
						{{ t("components.cardElement.assignmentElement.downloadFile") }}
					</VBtn>
				</div>
			</div>

			<VTextarea
				v-if="canStillSubmit"
				v-model="comment"
				:label="t('components.cardElement.assignmentElement.comment')"
				rows="2"
				auto-grow
				density="compact"
				data-testid="assignment-comment-input"
				class="mb-2"
			/>

			<VFileInput
				v-if="canStillSubmit"
				:label="uploadLabel"
				density="compact"
				:loading="uploading"
				data-testid="assignment-file-input"
				@update:model-value="onFileSelected"
			/>
			<div v-else-if="!isReturned" class="text-caption" data-testid="assignment-closed">
				{{ t("components.cardElement.assignmentElement.closed") }}
			</div>
		</template>
	</VCardText>
</template>

<script setup lang="ts">
import { AssignmentElement } from "@/types/board/ContentElement";
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { formatUtc } from "@/utils/date-time.utils";
import { downloadFile, convertDownloadToPreviewUrl, isImageMimeType, isPdfMimeType, isPreviewPossible } from "@/utils/fileHelper";
import { AssignmentStatus, AssignmentSubmissionResponse, SubmitSubmissionBodyParams } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import { RenderHTML } from "@feature-render-html";
import { mdiFileDocumentOutline } from "@icons/material";
import { LightBoxContentType, useLightBox } from "@ui-light-box";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
}>();

const { t } = useI18n();
const { fetchSubmissions, createOwnSubmission, submit } = useAssignmentApi();
const { upload, fetchFiles, getFileRecordsByParentId } = useFileStorageApi();
const lightBox = useLightBox();

const loading = ref(true);
const uploading = ref(false);
const ownSubmission = ref<AssignmentSubmissionResponse | undefined>(undefined);
const isSubmittable = ref(true);
const maxPoints = ref<number | null>(null);
const dueDateIso = ref<string | null>(null);
const comment = ref("");
const feedbackAudioUrl = ref<string | undefined>(undefined);
const feedbackFileRecords = ref<FileRecord[]>([]);

const load = async () => {
	loading.value = true;
	const list = await fetchSubmissions(props.element.id);
	if (list) {
		ownSubmission.value = list.submissions[0];
		isSubmittable.value = list.isSubmittable;
		maxPoints.value = list.maxPoints ?? null;
		dueDateIso.value = list.dueDate ?? null;
		comment.value = ownSubmission.value?.comment ?? comment.value;

		// feedback (audio + annotated corrections) is revealed together with
		// points/comment once the teacher has returned the submission
		if (isReturned.value && ownSubmission.value?.id) {
			try {
				await fetchFiles(ownSubmission.value.id, FileRecordParent.BOARDNODES);
				const records = getFileRecordsByParentId(ownSubmission.value.id);
				const isFeedback = (name: string) => name.startsWith("feedback-");
				const isFeedbackAudio = (name: string) => name.startsWith("feedback-audio-");

				feedbackAudioUrl.value = records.find(
					(record) => isFeedbackAudio(record.name) && ownSubmission.value?.feedbackAudio?.name === record.name
				)?.url;
				feedbackFileRecords.value =
					ownSubmission.value.feedbackFiles && ownSubmission.value.feedbackFiles.length > 0
						? records.filter((record) => isFeedback(record.name) && !isFeedbackAudio(record.name))
						: [];
			} catch {
				feedbackAudioUrl.value = undefined;
				feedbackFileRecords.value = [];
			}
		} else {
			feedbackAudioUrl.value = undefined;
			feedbackFileRecords.value = [];
		}
	}
	loading.value = false;
};

const openFeedbackFile = (record: FileRecord) => {
	if (isPdfMimeType(record.mimeType)) {
		lightBox.open({ type: LightBoxContentType.PDF, downloadUrl: record.url, name: record.name });

		return;
	}

	lightBox.open({
		type: LightBoxContentType.IMAGE,
		downloadUrl: record.url,
		name: record.name,
		previewUrl: convertDownloadToPreviewUrl(record.url),
		alt: record.name,
	});
};

onMounted(load);

const dueDateLabel = computed(() => {
	const formatted = dueDateIso.value ? formatUtc(dueDateIso.value, "dateTime") : undefined;
	return formatted ? t("components.cardElement.assignmentElement.dueDateLabel", { date: formatted }) : undefined;
});

const isReturned = computed(() => ownSubmission.value?.status === AssignmentStatus.RETURNED);

const canStillSubmit = computed(() => isSubmittable.value && !isReturned.value);

const uploadLabel = computed(() =>
	ownSubmission.value?.status === AssignmentStatus.OPEN
		? t("components.cardElement.assignmentElement.uploadFile")
		: t("components.cardElement.assignmentElement.replaceFile")
);

const statusColor = computed(() => {
	switch (ownSubmission.value?.status) {
		case AssignmentStatus.RETURNED:
			return "success";
		case AssignmentStatus.SUBMITTED:
		case AssignmentStatus.IN_REVIEW:
			return ownSubmission.value?.isLate ? "warning" : "info";
		default:
			return undefined;
	}
});

const statusLabel = computed(() => {
	const key = `components.cardElement.assignmentElement.status.${ownSubmission.value?.status ?? "open"}`;
	const late = ownSubmission.value?.isLate ? ` (${t("components.cardElement.assignmentElement.status.late")})` : "";
	return `${t(key)}${late}`;
});

const onFileSelected = async (files: File | File[] | null) => {
	const file = Array.isArray(files) ? files[0] : files;
	if (!file) {
		return;
	}

	uploading.value = true;
	try {
		let submissionId = ownSubmission.value?.id;
		if (!submissionId) {
			const created = await createOwnSubmission(props.element.id);
			submissionId = created?.id ?? undefined;
		}
		if (!submissionId) {
			return;
		}

		await upload(file, submissionId, FileRecordParent.BOARDNODES);
		const body: SubmitSubmissionBodyParams = {};
		if (comment.value.trim() !== "") {
			body.comment = comment.value.trim();
		}
		await submit(submissionId, body);
		await load();
	} finally {
		uploading.value = false;
	}
};
</script>

<style scoped lang="scss">
.assignment-title {
	font-weight: 600;
	margin-bottom: 4px;
}
.assignment-description {
	margin-bottom: 8px;
}
.assignment-file,
.assignment-feedback {
	margin-bottom: 8px;
}
.assignment-feedback {
	margin-top: 16px;
	padding-top: 12px;
	border-top: 1px solid rgba(0, 0, 0, 0.12);
}
.assignment-feedback-heading {
	font-weight: 600;
	margin-bottom: 4px;
}
.assignment-points {
	font-weight: 600;
}
</style>
