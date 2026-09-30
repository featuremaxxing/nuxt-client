<template>
	<section
		class="file-area-column"
		:class="{ 'file-area-column--over': isOver }"
		:data-testid="`file-area-column-${columnIndex}`"
		:aria-label="title"
		@dragover.prevent="onDragOver"
		@dragleave="isOver = false"
		@drop.prevent="onDrop($event, column.parentId)"
	>
		<header class="file-area-column__header">
			<h2 class="file-area-column__title text-subtitle-1">{{ title }}</h2>
			<div v-if="canEdit" class="d-flex">
				<VBtn
					v-if="column.files.length > 0"
					:icon="mdiFolderZipOutline"
					variant="text"
					size="small"
					:aria-label="t('pages.boardFileArea.downloadArchive')"
					data-testid="file-area-download-selected-files"
					@click="emit('download-files-as-archive', column.files, title)"
				/>
				<VBtn
					:icon="mdiFolderPlusOutline"
					variant="text"
					size="small"
					:aria-label="t('pages.boardFileArea.newFolder')"
					data-testid="file-area-new-folder"
					@click="emit('create-folder', column.parentId)"
				/>
				<VBtn
					:icon="mdiTrayArrowUp"
					variant="text"
					size="small"
					:aria-label="t('pages.boardFileArea.upload')"
					data-testid="file-area-upload"
					@click="fileInput?.click()"
				/>
			</div>
		</header>
		<input ref="fileInput" type="file" multiple hidden aria-hidden="true" @change="onFileSelection" />
		<VList v-if="!isEmpty" density="compact" class="file-area-column__list" :aria-label="title">
			<VListItem
				v-for="folder in column.folders"
				:key="folder.id"
				:active="folder.id === openFolderId"
				:draggable="canEdit"
				:data-testid="`file-area-folder-${folder.title}`"
				@click="emit('open-folder', folder.id)"
				@dragstart="onDragStart($event, 'folder', folder.id)"
				@dragover.prevent.stop="onDragOver"
				@drop.prevent.stop="onDrop($event, folder.id)"
			>
				<template #prepend><VIcon :icon="mdiFolderOutline" /></template>
				<VListItemTitle>{{ folder.title }}</VListItemTitle>
				<template #append>
					<KebabMenu v-if="canEdit" :aria-label="t('pages.boardFileArea.menu', { name: folder.title })">
						<KebabMenuActionRename @click="emit('rename-folder', folder)" />
						<KebabMenuActionDelete @click="emit('delete-folder', folder)" />
					</KebabMenu>
					<VIcon v-else :icon="mdiChevronRight" />
				</template>
			</VListItem>
			<VListItem
				v-for="file in column.files"
				:key="file.id"
				:active="file.id === selectedFileId"
				:draggable="canEdit"
				:data-testid="`file-area-file-${file.name}`"
				@click="emit('select-file', file.id)"
				@dragstart="onDragStart($event, 'file', file.id)"
			>
				<template #prepend><VIcon :icon="mdiFileDocumentOutline" /></template>
				<VListItemTitle>{{ file.name }}</VListItemTitle>
				<template #append>
					<KebabMenu :aria-label="t('pages.boardFileArea.menu', { name: file.name })">
						<KebabMenuActionDownloadFile @click="emit('download-file', file)" />
						<KebabMenuAction
							v-if="canEdit && isZipFile(file)"
							:icon="mdiArchiveOutline"
							@click="emit('unzip-file', file)"
						>
							{{ t("pages.boardFileArea.extract") }}
						</KebabMenuAction>
						<template v-if="canEdit">
							<KebabMenuActionRename @click="emit('rename-file', file)" />
							<KebabMenuActionDelete @click="emit('delete-file', file)" />
						</template>
					</KebabMenu>
				</template>
			</VListItem>
		</VList>
		<p v-else class="file-area-column__empty text-body-2" data-testid="file-area-empty">
			{{ canEdit ? t("pages.boardFileArea.emptyEditable") : t("pages.boardFileArea.empty") }}
		</p>
	</section>
</template>

<script setup lang="ts">
import KebabMenuActionDownloadFile from "./KebabMenuActionDownloadFile.vue";
import { FileRecord } from "@/types/file/File";
import { extractFilesFromItems } from "@/utils/fileHelper";
import type { FileAreaColumnData, FileAreaFolder } from "@data-board-file-area";
import {
	mdiArchiveOutline,
	mdiChevronRight,
	mdiFileDocumentOutline,
	mdiFolderOutline,
	mdiFolderPlusOutline,
	mdiFolderZipOutline,
	mdiTrayArrowUp,
} from "@icons/material";
import { KebabMenu, KebabMenuAction, KebabMenuActionDelete, KebabMenuActionRename } from "@ui-kebab-menu";
import { computed, PropType, ref } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps({
	column: { type: Object as PropType<FileAreaColumnData>, required: true },
	columnIndex: { type: Number, required: true },
	title: { type: String, required: true },
	openFolderId: { type: String, default: undefined },
	selectedFileId: { type: String, default: undefined },
	canEdit: { type: Boolean, default: false },
});

const emit = defineEmits<{
	(e: "open-folder", folderId: string): void;
	(e: "select-file", fileId: string): void;
	(e: "create-folder", parentId: string): void;
	(e: "rename-folder", folder: FileAreaFolder): void;
	(e: "delete-folder", folder: FileAreaFolder): void;
	(e: "rename-file", file: FileRecord): void;
	(e: "delete-file", file: FileRecord): void;
	(e: "download-file", file: FileRecord): void;
	(e: "unzip-file", file: FileRecord): void;
	(e: "download-files-as-archive", files: FileRecord[], title: string): void;
	(e: "upload", parentId: string, files: File[]): void;
	(e: "move-folder", folderId: string, toParentId: string): void;
	(e: "move-file", fileId: string, toParentId: string): void;
}>();

const { t } = useI18n();

const fileInput = ref<HTMLInputElement>();
const isOver = ref(false);
const DRAG_TYPE = "application/x-file-area-item";

const isEmpty = computed(() => props.column.folders.length === 0 && props.column.files.length === 0);

const isZipFile = (file: FileRecord): boolean =>
	file.mimeType === "application/zip" || file.name.toLowerCase().endsWith(".zip");

const onFileSelection = (event: Event) => {
	const input = event.target as HTMLInputElement;
	if (input.files?.length) emit("upload", props.column.parentId, Array.from(input.files));
	input.value = "";
};

const onDragStart = (event: DragEvent, type: "folder" | "file", id: string) => {
	if (!props.canEdit || !event.dataTransfer) return;
	event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ type, id }));
	event.dataTransfer.effectAllowed = "move";
};

const onDragOver = (event: DragEvent) => {
	if (!props.canEdit) return;
	isOver.value = true;
	if (event.dataTransfer)
		event.dataTransfer.dropEffect = event.dataTransfer.types.includes(DRAG_TYPE) ? "move" : "copy";
};

const onDrop = async (event: DragEvent, targetParentId: string) => {
	isOver.value = false;
	if (!props.canEdit || !event.dataTransfer) return;

	const internal = event.dataTransfer.getData(DRAG_TYPE);
	if (internal) {
		const { type, id } = JSON.parse(internal) as { type: "folder" | "file"; id: string };
		if (type === "folder") emit("move-folder", id, targetParentId);
		else emit("move-file", id, targetParentId);
		return;
	}

	const files = await extractFilesFromItems(event.dataTransfer.items);
	if (files.length > 0) emit("upload", targetParentId, files);
};
</script>

<style scoped>
.file-area-column {
	display: flex;
	flex: 0 0 300px;
	flex-direction: column;
	min-height: 320px;
	border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

.file-area-column--over {
	background-color: rgba(var(--v-theme-primary), 0.08);
}

.file-area-column__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 4px 8px 4px 16px;
	min-height: 48px;
}

.file-area-column__title {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.file-area-column__list {
	flex: 1;
	overflow-y: auto;
}

.file-area-column__empty {
	padding: 16px;
	color: rgba(var(--v-theme-on-surface), 0.6);
}

@media (max-width: 599px) {
	.file-area-column {
		flex-basis: 100%;
	}
}
</style>
