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
import { isPdfMimeType } from "@/utils/fileHelper";
import { mdiEyeOutline, mdiFileDocumentOutline } from "@icons/material";
import { useI18n } from "vue-i18n";

// Pure display of one peer review task's form - all state lives in the parent list, this
// only renders it and reports interactions via events, mirroring AssignmentSubmissionDetail.
defineProps<{
	fileRecord: FileRecord | undefined;
	points: number | null;
	feedbackComment: string;
	submitting: boolean;
}>();

const emit = defineEmits<{
	(e: "view-file"): void;
	(e: "update:points", value: string): void;
	(e: "update:feedbackComment", value: string): void;
	(e: "submit"): void;
}>();

const { t } = useI18n();

const onViewFile = () => emit("view-file");
</script>
