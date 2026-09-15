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
				<div v-if="maxPoints !== null" class="assignment-points">
					{{ t("components.cardElement.assignmentElement.points", { points: ownSubmission.points ?? 0, maxPoints }) }}
				</div>
				<div v-if="ownSubmission.feedbackComment" data-testid="assignment-teacher-comment">
					<span class="text-caption">{{ t("components.cardElement.assignmentElement.teacherComment") }}: </span>
					{{ ownSubmission.feedbackComment }}
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
import { FileRecordParent } from "@/types/file/File";
import { formatUtc } from "@/utils/date-time.utils";
import { AssignmentStatus, AssignmentSubmissionResponse, SubmitSubmissionBodyParams } from "@api-server";
import { useAssignmentApi } from "@data-assignment";
import { useFileStorageApi } from "@data-file";
import { RenderHTML } from "@feature-render-html";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
	element: AssignmentElement;
}>();

const { t } = useI18n();
const { fetchSubmissions, createOwnSubmission, submit } = useAssignmentApi();
const { upload } = useFileStorageApi();

const loading = ref(true);
const uploading = ref(false);
const ownSubmission = ref<AssignmentSubmissionResponse | undefined>(undefined);
const isSubmittable = ref(true);
const maxPoints = ref<number | null>(null);
const dueDateIso = ref<string | null>(null);
const comment = ref("");

const load = async () => {
	loading.value = true;
	const list = await fetchSubmissions(props.element.id);
	if (list) {
		ownSubmission.value = list.submissions[0];
		isSubmittable.value = list.isSubmittable;
		maxPoints.value = list.maxPoints ?? null;
		dueDateIso.value = list.dueDate ?? null;
		comment.value = ownSubmission.value?.comment ?? comment.value;
	}
	loading.value = false;
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
.assignment-points {
	font-weight: 600;
}
</style>
