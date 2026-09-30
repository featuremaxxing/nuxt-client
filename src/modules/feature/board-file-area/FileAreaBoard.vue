<template>
	<DefaultWireframe max-width="full" :breadcrumbs="breadcrumbs">
		<template #header>
			<div class="d-flex align-center">
				<h1 data-testid="file-area-title">{{ title }}</h1>
				<VChip v-if="!isVisible" class="ml-4" data-testid="board-draft-chip">
					{{ t("common.words.draft") }}
				</VChip>
				<KebabMenu v-if="canManage" class="ml-2" data-testid="board-menu-btn">
					<KebabMenuActionRename @click="openBoardRename" />
					<KebabMenuActionPublish v-if="!isVisible" @click="setVisibility(true)" />
					<KebabMenuActionRevert v-else @click="setVisibility(false)" />
					<KebabMenuActionDelete @click="onDeleteBoard" />
				</KebabMenu>
			</div>
		</template>

		<VProgressLinear v-if="isLoading" indeterminate />
		<VAlert v-else-if="hasError" type="error" variant="tonal" data-testid="file-area-error">
			{{ t("pages.boardFileArea.error.generic") }}
		</VAlert>
		<div v-else class="file-area" data-testid="file-area">
			<div class="file-area__columns" role="group" :aria-label="title">
				<FileAreaColumn
					v-for="(column, index) in visibleColumns"
					:key="column.parentId"
					:column="column"
					:column-index="index"
					:title="columnTitle(column.parentId)"
					:open-folder-id="path[index]"
					:selected-file-id="selectedFile?.id"
					:can-edit="canEdit"
					@open-folder="openFolder(index, $event)"
					@select-file="selectFile"
					@create-folder="onCreateFolder"
					@rename-folder="onRenameFolder"
					@delete-folder="onDeleteFolder"
					@rename-file="onRenameFile"
					@delete-file="onDeleteFile"
					@download-file="onDownload"
					@unzip-file="onUnzip"
					@download-files-as-archive="openArchiveSelection"
					@upload="uploadFiles"
					@move-folder="onMoveFolder"
					@move-file="onMoveFile"
				/>
				<FileAreaFileDetails v-if="selectedFile" :file="selectedFile" @download="onDownload" />
			</div>
		</div>
	</DefaultWireframe>
	<FolderNameDialog
		v-model:is-dialog-open="nameDialog.isOpen"
		:title="nameDialog.title"
		:name="nameDialog.name"
		@confirm="onNameConfirmed"
		@cancel="nameDialog.isOpen = false"
	/>
	<VDialog v-model="archiveSelection.isOpen" max-width="480">
		<VCard>
			<VCardTitle>{{ t("pages.boardFileArea.selectFilesForArchive") }}</VCardTitle>
			<VCardText>
				<VCheckbox
					v-for="file in archiveSelection.files"
					:key="file.id"
					v-model="archiveSelection.fileIds"
					:label="file.name"
					:value="file.id"
				/>
			</VCardText>
			<VCardActions>
				<VSpacer />
				<VBtn variant="text" @click="archiveSelection.isOpen = false">{{ t("common.actions.cancel") }}</VBtn>
				<VBtn color="primary" :disabled="archiveSelection.fileIds.length === 0" @click="downloadSelectedFiles">
					{{ t("pages.boardFileArea.downloadSelectedFiles") }}
				</VBtn>
			</VCardActions>
		</VCard>
	</VDialog>
</template>

<script setup lang="ts">
import FileAreaColumn from "./FileAreaColumn.vue";
import FileAreaFileDetails from "./FileAreaFileDetails.vue";
import FolderNameDialog from "./FolderNameDialog.vue";
import { FileRecord, FileRecordParent } from "@/types/file/File";
import { askDeletionForItem } from "@/utils/confirmation-dialog.utils";
import { downloadFile, downloadFilesAsArchive, sanitizeZipPathSegment } from "@/utils/fileHelper";
import { buildPageTitle } from "@/utils/pageTitle";
import { BoardResponse } from "@api-server";
import { notifyError } from "@data-app";
import { useBoardApi, useSharedBoardPageInformation } from "@data-board";
import { type FileAreaFolder, useFileAreaApi, useFileAreaSocket, useFileAreaState } from "@data-board-file-area";
import { useFileStorageApi } from "@data-file";
import {
	KebabMenu,
	KebabMenuActionDelete,
	KebabMenuActionPublish,
	KebabMenuActionRename,
	KebabMenuActionRevert,
} from "@ui-kebab-menu";
import { DefaultWireframe } from "@ui-layout";
import { useTitle } from "@vueuse/core";
import { computed, onMounted, PropType, reactive, ref, toRef, watch } from "vue";
import JSZip from "jszip";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
	boardId: { type: String, required: true },
	// the skeleton the page already loaded to find out that this is a file area
	board: { type: Object as PropType<BoardResponse>, required: true },
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const boardApi = useBoardApi();
const fileAreaApi = useFileAreaApi();
const fileStorage = useFileStorageApi();

const { createPageInformation, breadcrumbs: sharedBreadcrumbs } = useSharedBoardPageInformation();

const boardId = toRef(props, "boardId");
const title = ref("");
const isVisible = ref(true);
watch(
	() => props.board,
	(board) => {
		title.value = board.title;
		isVisible.value = board.isVisible;
	},
	{ immediate: true }
);
const canManage = computed(() => props.board.allowedOperations?.updateBoardTitle ?? false);

const {
	canEdit,
	columns,
	path,
	selectedFile,
	isLoading,
	hasError,
	folders,
	loadAll,
	loadFolders,
	restorePath,
	openFolder,
	selectFile,
	createFolder,
	renameFolder,
	moveFolder,
	deleteFolder,
	uploadFiles,
	renameFile,
	deleteFiles,
	moveFile,
	onChanged,
} = useFileAreaState(boardId);

useFileAreaSocket(boardId, {
	onChanged,
	onReconnected: loadAll,
	onBoardDeleted: () => router.replace("/rooms"),
});

const breadcrumbs = computed(() =>
	sharedBreadcrumbs.value.map((crumb, index, all) =>
		index === all.length - 1 ? { ...crumb, title: title.value } : crumb
	)
);

useTitle(
	computed(() => buildPageTitle(title.value, sharedBreadcrumbs.value[sharedBreadcrumbs.value.length - 2]?.title))
);

const visibleColumns = computed(() => columns.value);

const columnTitle = (parentId: string): string =>
	parentId === boardId.value ? title.value : (folders.value.find((f) => f.id === parentId)?.title ?? "");

// --- board actions ---

const nameDialog = reactive({
	isOpen: false,
	title: "",
	name: "",
	action: "create" as "create" | "rename-folder" | "rename-file" | "rename-board",
	targetId: "",
	file: undefined as FileRecord | undefined,
});

const archiveSelection = reactive({
	isOpen: false,
	title: "",
	files: [] as FileRecord[],
	fileIds: [] as string[],
});

const openNameDialog = (action: typeof nameDialog.action, dialogTitle: string, name: string, targetId = "") => {
	Object.assign(nameDialog, { isOpen: true, title: dialogTitle, name, action, targetId });
};

const openBoardRename = () => openNameDialog("rename-board", t("pages.boardFileArea.renameBoard"), title.value);

const onCreateFolder = (parentId: string) => openNameDialog("create", t("pages.boardFileArea.newFolder"), "", parentId);

const onRenameFolder = (folder: FileAreaFolder) =>
	openNameDialog("rename-folder", t("pages.boardFileArea.renameFolder"), folder.title, folder.id);

const onRenameFile = (file: FileRecord) => {
	nameDialog.file = file;
	openNameDialog("rename-file", t("pages.boardFileArea.renameFile"), file.name, file.id);
};

const onNameConfirmed = async (name: string) => {
	nameDialog.isOpen = false;
	try {
		switch (nameDialog.action) {
			case "create": {
				const knownIds = new Set(folders.value.map((folder) => folder.id));
				await createFolder(nameDialog.targetId, name);
				// open the new folder right away, that is where the user wants to add things next
				const created = folders.value.find((f) => f.parentId === nameDialog.targetId && !knownIds.has(f.id));
				const columnIndex = columns.value.findIndex((column) => column.parentId === nameDialog.targetId);
				if (created && columnIndex !== -1) await openFolder(columnIndex, created.id);
				break;
			}
			case "rename-folder":
				await renameFolder(nameDialog.targetId, name);
				break;
			case "rename-file":
				if (nameDialog.file) await renameFile(nameDialog.file, name);
				break;
			default:
				await boardApi.updateBoardTitleCall(boardId.value, name);
				title.value = name;
		}
	} catch {
		// the api composables already showed the error
	}
};

const setVisibility = async (visible: boolean) => {
	await boardApi.updateBoardVisibilityCall(boardId.value, visible);
	isVisible.value = visible;
};

const onDeleteBoard = async () => {
	const shouldDelete = await askDeletionForItem(title.value, "common.words.board");
	if (!shouldDelete) return;

	const roomPath = sharedBreadcrumbs.value.find((crumb) => crumb.to?.toString().startsWith("/rooms/"))?.to;
	await boardApi.deleteBoardCall(boardId.value);
	router.replace(roomPath ?? "/rooms");
};

// --- folder and file actions ---

const onDeleteFolder = async (folder: FileAreaFolder) => {
	const shouldDelete = await askDeletionForItem(folder.title, "pages.boardFileArea.folder");
	if (shouldDelete) await deleteFolder(folder.id);
};

const openArchiveSelection = (files: FileRecord[], archiveTitle: string) => {
	Object.assign(archiveSelection, { isOpen: true, title: archiveTitle, files, fileIds: [] });
};

const downloadSelectedFiles = () => {
	if (archiveSelection.fileIds.length === 0) return;
	downloadFilesAsArchive({
		fileRecordIds: archiveSelection.fileIds,
		archiveName: archiveSelection.title,
	});
	archiveSelection.isOpen = false;
};

const onDeleteFile = async (file: FileRecord) => {
	const shouldDelete = await askDeletionForItem(file.name, "pages.boardFileArea.file");
	if (shouldDelete) await deleteFiles([file]);
};

const onDownload = (file: FileRecord) => downloadFile(file.url, file.name);

const MAX_ARCHIVE_ENTRIES = 500;
const MAX_ARCHIVE_UNCOMPRESSED_SIZE = 500 * 1024 * 1024;

type ZipEntryWithSize = { _data?: { uncompressedSize?: number } };

const onUnzip = async (file: FileRecord) => {
	try {
		const response = await fetch(file.url, { credentials: "include" });
		if (!response.ok) throw new Error("Could not download archive");

		const zip = await JSZip.loadAsync(await response.blob());
		const entries = Object.values(zip.files);
		const uncompressedSize = entries.reduce(
			(total, entry) => total + ((entry as unknown as ZipEntryWithSize)._data?.uncompressedSize ?? 0),
			0
		);
		if (entries.length > MAX_ARCHIVE_ENTRIES || uncompressedSize > MAX_ARCHIVE_UNCOMPRESSED_SIZE) {
			throw new Error("Archive exceeds extraction limit");
		}

		const folderIds = new Map<string, string>();
		for (const folder of folders.value) folderIds.set(`${folder.parentId}:${folder.title}`, folder.id);
		const touchedParentIds = new Set<string>();

		const resolveParent = async (segments: string[]): Promise<string> => {
			let currentParentId = file.parentId;
			for (const segment of segments) {
				const key = `${currentParentId}:${segment}`;
				const existingFolderId = folderIds.get(key);
				if (existingFolderId) {
					currentParentId = existingFolderId;
					continue;
				}
				const created = await fileAreaApi.createFolder(currentParentId, segment);
				folderIds.set(key, created.id);
				currentParentId = created.id;
			}
			return currentParentId;
		};

		for (const entry of entries) {
			const segments = entry.name
				.split("/")
				.filter((segment) => segment.length > 0 && segment !== "." && segment !== "..")
				.map(sanitizeZipPathSegment)
				.filter((segment) => segment.length > 0);
			if (segments.length === 0) continue;
			if (entry.dir) {
				await resolveParent(segments);
				continue;
			}

			const parentId = await resolveParent(segments.slice(0, -1));
			const blob = await entry.async("blob");
			await fileStorage.upload(new File([blob], segments.at(-1) as string), parentId, FileRecordParent.BOARDNODES);
			touchedParentIds.add(parentId);
		}

		await loadFolders();
		await fileAreaApi.notifyFilesChanged(boardId.value, [...touchedParentIds]);
	} catch {
		notifyError(t("pages.boardFileArea.extractError"));
	}
};

const onMoveFolder = async (folderId: string, toParentId: string) => {
	try {
		await moveFolder(folderId, toParentId);
	} catch {
		// the api composables already showed the error
	}
};

const onMoveFile = async (fileId: string, toParentId: string) => {
	const file = columns.value.flatMap((column) => column.files).find((f) => f.id === fileId);
	if (file) await moveFile(file, toParentId);
};

// --- the opened folders live in the url, so links and reloads keep them ---

const pathFromRoute = (): string[] => {
	const value = route.query.path;
	return typeof value === "string" && value.length > 0 ? value.split(",") : [];
};

watch(
	path,
	(newPath) => {
		const current = pathFromRoute().join(",");
		if (current === newPath.join(",")) return;
		router.replace({ query: { ...route.query, path: newPath.length ? newPath.join(",") : undefined } });
	},
	{ deep: true }
);

onMounted(async () => {
	createPageInformation(boardId.value);
	await loadAll();
	restorePath(pathFromRoute());
	await loadAll();
});
</script>

<style scoped>
.file-area {
	border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
	border-radius: 4px;
	overflow: hidden;
}

.file-area__columns {
	display: flex;
	min-height: 420px;
	overflow-x: auto;
}
</style>
