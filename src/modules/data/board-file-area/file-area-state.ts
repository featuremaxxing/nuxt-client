import { type FileAreaFolder, type FileAreaFolders, useFileAreaApi } from "./file-area-api";
import type { FileAreaChangedPayload } from "./file-area-socket";
import { FileRecord, FileRecordParent, StorageLocation } from "@/types/file/File";
import { $axios } from "@/utils/api";
import { useAppStore } from "@data-app";
import { useFileRecordsStore, useFileStorageApi } from "@data-file";
import { computed, type Ref, ref } from "vue";

export type FileAreaColumnData = {
	// the board (first column) or a folder
	parentId: string;
	folders: FileAreaFolder[];
	files: FileRecord[];
};

const byName = (a: string, b: string): number => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export const useFileAreaState = (boardId: Ref<string>) => {
	const api = useFileAreaApi();
	const fileStorage = useFileStorageApi();
	const fileRecordsStore = useFileRecordsStore();

	const folders = ref<FileAreaFolder[]>([]);
	const allowedOperations = ref<FileAreaFolders["allowedOperations"]>();
	const isLoading = ref(true);
	const hasError = ref(false);
	// folder ids from the first to the last opened folder
	const path = ref<string[]>([]);
	const selectedFileId = ref<string>();

	const canEdit = computed(() => allowedOperations.value?.createFileElement ?? false);

	const foldersOf = (parentId: string): FileAreaFolder[] =>
		folders.value.filter((folder) => folder.parentId === parentId).sort((a, b) => byName(a.title, b.title));

	const filesOf = (parentId: string): FileRecord[] =>
		fileStorage
			.getFileRecordsByParentId(parentId)
			.filter((file) => !file.isUploading)
			.sort((a, b) => byName(a.name, b.name));

	// The first column shows the file area itself, each opened folder adds a column to the right.
	const columns = computed<FileAreaColumnData[]>(() => {
		const parentIds = [boardId.value, ...path.value];

		return parentIds.map((parentId) => ({ parentId, folders: foldersOf(parentId), files: filesOf(parentId) }));
	});

	const selectedFile = computed(() => {
		if (!selectedFileId.value) return undefined;

		return columns.value.flatMap((column) => column.files).find((file) => file.id === selectedFileId.value);
	});

	const loadFiles = async (parentId: string): Promise<void> => {
		try {
			await fileStorage.fetchFiles(parentId, FileRecordParent.BOARDNODES);
		} catch {
			hasError.value = true;
		}
	};

	const loadFolders = async (): Promise<void> => {
		const result = await api.listFolders(boardId.value);
		folders.value = result.folders;
		allowedOperations.value = result.allowedOperations;

		// an opened folder that disappeared (deleted or moved by someone else) closes its columns
		const ids = new Set(result.folders.map((folder) => folder.id));
		const firstMissing = path.value.findIndex((id) => !ids.has(id));
		if (firstMissing !== -1) path.value = path.value.slice(0, firstMissing);
	};

	const loadAll = async (): Promise<void> => {
		try {
			await loadFolders();
			await Promise.all([boardId.value, ...path.value].map(loadFiles));
		} catch {
			hasError.value = true;
		} finally {
			isLoading.value = false;
		}
	};

	// Restores a path from the URL. Unknown ids end the path.
	const restorePath = (ids: string[]): void => {
		const restored: string[] = [];
		let parentId = boardId.value;
		for (const id of ids) {
			const folder = folders.value.find((f) => f.id === id && f.parentId === parentId);
			if (!folder) break;
			restored.push(id);
			parentId = id;
		}
		path.value = restored;
	};

	const openFolder = async (columnIndex: number, folderId: string): Promise<void> => {
		path.value = [...path.value.slice(0, columnIndex), folderId];
		selectedFileId.value = undefined;
		await loadFiles(folderId);
	};

	const closeFrom = (columnIndex: number): void => {
		path.value = path.value.slice(0, columnIndex);
	};

	const selectFile = (fileId: string | undefined): void => {
		selectedFileId.value = fileId;
	};

	const createFolder = async (parentId: string, title: string): Promise<void> => {
		await api.createFolder(parentId, title);
		await loadFolders();
	};

	const renameFolder = async (folderId: string, title: string): Promise<void> => {
		await api.renameFolder(folderId, title);
		await loadFolders();
	};

	const moveFolder = async (folderId: string, toParentId: string): Promise<void> => {
		if (folderId === toParentId) return;
		await api.moveFolder(folderId, toParentId);
		await loadFolders();
	};

	const deleteFolder = async (folderId: string): Promise<void> => {
		await api.deleteFolder(folderId);
		await loadFolders();
	};

	const uploadFiles = async (parentId: string, files: File[]): Promise<void> => {
		await Promise.allSettled(files.map((file) => fileStorage.upload(file, parentId, FileRecordParent.BOARDNODES)));
		await api.notifyFilesChanged(boardId.value, [parentId]);
	};

	const renameFile = async (file: FileRecord, fileName: string): Promise<void> => {
		await fileStorage.rename(file.id, { fileName });
		await api.notifyFilesChanged(boardId.value, [file.parentId]);
	};

	const deleteFiles = async (files: FileRecord[]): Promise<void> => {
		await fileStorage.deleteFiles(files);
		await api.notifyFilesChanged(boardId.value, [...new Set(files.map((file) => file.parentId))]);
	};

	// A real move in the file storage: the file keeps its id, so links to it on cards stay valid.
	const moveFile = async (file: FileRecord, toParentId: string): Promise<void> => {
		if (file.parentId === toParentId) return;
		const schoolId = useAppStore().school?.id as string;

		const response = await $axios.patch<FileRecord>(`/v3/file/move/${file.id}`, {
			target: {
				storageLocationId: schoolId,
				storageLocation: StorageLocation.SCHOOL,
				parentId: toParentId,
				parentType: FileRecordParent.BOARDNODES,
			},
		});
		// same id, new parent: the store keeps records per parent
		fileRecordsStore.deleteFileRecords([file]);
		fileRecordsStore.upsertFileRecords([response.data]);
		await Promise.all([loadFiles(file.parentId), loadFiles(toParentId)]);
		await api.notifyFilesChanged(boardId.value, [file.parentId, toParentId]);
	};

	// live updates: reload only the levels that were reported
	const onChanged = async (payload: FileAreaChangedPayload): Promise<void> => {
		if (payload.kind === "folders") {
			await loadFolders();
			return;
		}

		const visible = new Set([boardId.value, ...path.value]);
		await Promise.all(payload.parentIds.filter((id) => visible.has(id)).map(loadFiles));
	};

	return {
		folders,
		allowedOperations,
		canEdit,
		columns,
		path,
		selectedFile,
		isLoading,
		hasError,
		loadAll,
		loadFolders,
		restorePath,
		openFolder,
		closeFrom,
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
	};
};
