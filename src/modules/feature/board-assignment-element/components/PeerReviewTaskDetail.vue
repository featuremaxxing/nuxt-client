<template>
	<div class="peer-review-task-detail" data-testid="peer-review-task-detail">
		<div v-if="fileRecord" class="d-flex align-center ga-2 mb-3" data-testid="peer-review-task-file-row">
			<VIcon :icon="mdiFileDocumentOutline" size="small" />
			<span class="flex-grow-1 text-truncate">{{ fileRecord.name }}</span>
			<VBtn
				v-if="isPdfMimeType(fileRecord.mimeType)"
				variant="text"
				size="small"
				:prepend-icon="mdiEyeOutline"
				data-testid="peer-review-task-view"
				@click="onViewFile"
			>
				{{ t("components.cardElement.assignmentElement.viewFile") }}
			</VBtn>
			<!-- Non-PDF files (docx, images, ...) have no in-browser preview here - a reviewer must
			     still be able to get at the file some way, so this is the fallback for everything the
			     "Ansehen" button above doesn't cover. -->
			<VBtn
				v-else
				variant="text"
				size="small"
				:prepend-icon="mdiDownload"
				data-testid="peer-review-task-download"
				@click="onDownloadFile"
			>
				{{ t("common.actions.download") }}
			</VBtn>
			<VBtn
				v-if="fileRecord && (isPdfMimeType(fileRecord.mimeType) || isImageMimeType(fileRecord.mimeType))"
				variant="tonal"
				size="small"
				:prepend-icon="mdiPencilOutline"
				data-testid="peer-review-task-annotate"
				@click="emit('annotate-file')"
			>
				{{ t("components.cardElement.assignmentElement.annotate") }}
			</VBtn>
		</div>

		<div v-if="correctionFiles.length > 0" class="mb-3">
			<div
				v-for="record in correctionFiles"
				:key="record.id"
				class="d-flex align-center ga-2 mt-1"
				data-testid="peer-review-correction-file"
			>
				<VIcon :icon="mdiFileDocumentOutline" size="small" />
				<span class="flex-grow-1 text-truncate">{{ record.name }}</span>
				<VBtn
					v-if="isPdfMimeType(record.mimeType) || isImageMimeType(record.mimeType)"
					variant="tonal"
					size="small"
					:prepend-icon="mdiPencilOutline"
					:data-testid="`peer-review-correction-annotate-${record.id}`"
					@click="emit('continue-correction', record)"
				>
					{{ t("components.cardElement.assignmentElement.annotator.continue") }}
				</VBtn>
				<VBtn
					variant="text"
					size="small"
					:icon="mdiTrayArrowDown"
					:data-testid="`peer-review-correction-download-${record.id}`"
					@click="emit('download-correction', record)"
				/>
			</div>
		</div>

		<VTextField
			:model-value="points"
			type="number"
			density="compact"
			:label="t('components.cardElement.assignmentElement.pointsLabel')"
			:min="0"
			hide-details
			style="max-width: 140px"
			data-testid="peer-review-points-input"
			@update:model-value="(value: string) => emit('update:points', value)"
		/>

		<VTextarea
			:model-value="feedbackComment"
			rows="2"
			auto-grow
			density="compact"
			class="mt-3"
			:label="t('components.cardElement.assignmentElement.teacherComment')"
			data-testid="peer-review-comment-input"
			@update:model-value="(value: string) => emit('update:feedbackComment', value)"
		/>

		<div class="d-flex justify-end mt-2">
			<VBtn color="primary" :loading="submitting" data-testid="peer-review-submit" @click="emit('submit')">
				{{ t("components.cardElement.assignmentElement.peerReview.submitReview") }}
			</VBtn>
		</div>
	</div>
</template>

<script setup lang="ts">
import { FileRecord } from "@/types/file/File";
import { isImageMimeType, isPdfMimeType } from "@/utils/fileHelper";
import {
	mdiDownload,
	mdiEyeOutline,
	mdiFileDocumentOutline,
	mdiPencilOutline,
	mdiTrayArrowDown,
} from "@icons/material";
import { useI18n } from "vue-i18n";

// Pure display of one peer review task's form - all state lives in the parent list, this
// only renders it and reports interactions via events, mirroring AssignmentSubmissionDetail.
defineProps<{
	fileRecord: FileRecord | undefined;
	// this reviewer's own annotated corrections so far - no audio (see the review notes), just
	// the PDF/image annotator AssignmentSubmissionDetail already uses for the teacher
	correctionFiles: FileRecord[];
	points: number | null;
	feedbackComment: string;
	submitting: boolean;
}>();

const emit = defineEmits<{
	(e: "view-file"): void;
	(e: "download-file"): void;
	(e: "annotate-file"): void;
	(e: "continue-correction", record: FileRecord): void;
	(e: "download-correction", record: FileRecord): void;
	(e: "update:points", value: string): void;
	(e: "update:feedbackComment", value: string): void;
	(e: "submit"): void;
}>();

const { t } = useI18n();

const onViewFile = () => emit("view-file");
const onDownloadFile = () => emit("download-file");
</script>
