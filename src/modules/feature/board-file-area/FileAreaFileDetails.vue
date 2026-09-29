<template>
	<aside class="file-area-details" data-testid="file-area-details" :aria-label="file.name">
		<div class="file-area-details__preview">
			<VImg
				v-if="isPreviewPossible(file.previewStatus) && !imgError"
				:src="convertDownloadToPreviewUrl(file.url, PreviewWidth._500)"
				:alt="file.name"
				max-height="240"
				@error="imgError = true"
			/>
			<VIcon v-else :icon="mdiFileDocumentOutline" size="64" aria-hidden="true" />
		</div>
		<h2 class="text-subtitle-1 text-break mt-4">{{ file.name }}</h2>
		<dl class="file-area-details__meta text-body-2">
			<dt>{{ t("pages.folder.columns.size") }}</dt>
			<dd>{{ formattedSize }}</dd>
			<dt>{{ t("pages.folder.columns.lastModifiedAt") }}</dt>
			<dd>{{ dayjs(file.updatedAt).format("DD.MM.YYYY HH:mm") }}</dd>
		</dl>
		<VBtn
			class="mt-4"
			color="primary"
			variant="flat"
			:prepend-icon="mdiTrayArrowDown"
			data-testid="file-area-download"
			@click="emit('download', file)"
		>
			{{ t("pages.boardFileArea.download") }}
		</VBtn>
	</aside>
</template>

<script setup lang="ts">
import { FileRecord } from "@/types/file/File";
import { convertDownloadToPreviewUrl, isPreviewPossible } from "@/utils/fileHelper";
import { PreviewWidth } from "@api-file-storage";
import { mdiFileDocumentOutline, mdiTrayArrowDown } from "@icons/material";
import dayjs from "dayjs";
import { computed, PropType, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	file: { type: Object as PropType<FileRecord>, required: true },
});

const emit = defineEmits<{ (e: "download", file: FileRecord): void }>();

const { t } = useI18n();

const imgError = ref(false);
watch(
	() => props.file.id,
	() => (imgError.value = false)
);

const formattedSize = computed(() => {
	const size = props.file.size;
	if (size < 1024) return `${size} B`;
	if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
	return `${(size / (1024 * 1024)).toFixed(1)} MB`;
});
</script>

<style scoped>
.file-area-details {
	flex: 0 0 300px;
	padding: 16px;
}

.file-area-details__preview {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120px;
	background-color: rgba(var(--v-theme-on-surface), 0.04);
	border-radius: 4px;
}

.file-area-details__meta {
	display: grid;
	grid-template-columns: auto 1fr;
	gap: 4px 12px;
}

.file-area-details__meta dt {
	color: rgba(var(--v-theme-on-surface), 0.6);
}

@media (max-width: 599px) {
	.file-area-details {
		flex-basis: 100%;
	}
}
</style>
