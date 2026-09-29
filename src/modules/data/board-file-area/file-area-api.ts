import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { BoardFileAreaApiFactory, type FileAreaFolderResponse, type FileAreaFoldersResponse } from "@api-server";
import { notifyError } from "@data-app";
import { useI18n } from "vue-i18n";

export type FileAreaFolder = FileAreaFolderResponse;
export type FileAreaFolders = FileAreaFoldersResponse;

export const useFileAreaApi = () => {
	const { t } = useI18n();
	const api = BoardFileAreaApiFactory(undefined, "/v3", $axios);

	const showError = (error: unknown): void => {
		const responseError = mapAxiosErrorToResponseError(error);
		notifyError(responseError.code === 403 ? t("error.403") : t("pages.boardFileArea.error.generic"));
	};

	const listFolders = async (boardId: string): Promise<FileAreaFolders> => {
		const response = await api.fileAreaControllerListFolders(boardId);

		return response.data;
	};

	const createFolder = async (parentId: string, title: string): Promise<FileAreaFolder> => {
		try {
			const response = await api.fileAreaControllerCreateFolder({ parentId, title });

			return response.data;
		} catch (error) {
			showError(error);
			throw error;
		}
	};

	const renameFolder = async (folderId: string, title: string): Promise<FileAreaFolder> => {
		try {
			const response = await api.fileAreaControllerRenameFolder(folderId, { title });

			return response.data;
		} catch (error) {
			showError(error);
			throw error;
		}
	};

	const moveFolder = async (folderId: string, toParentId: string): Promise<FileAreaFolder> => {
		try {
			const response = await api.fileAreaControllerMoveFolder(folderId, { toParentId });

			return response.data;
		} catch (error) {
			showError(error);
			throw error;
		}
	};

	const deleteFolder = async (folderId: string): Promise<void> => {
		try {
			await api.fileAreaControllerDeleteFolder(folderId);
		} catch (error) {
			showError(error);
			throw error;
		}
	};

	// Files go straight to the file storage. Tell the other viewers of the file area about it.
	const notifyFilesChanged = async (boardId: string, parentIds: string[]): Promise<void> => {
		try {
			await api.fileAreaControllerFilesChanged(boardId, { parentIds });
		} catch {
			// the live update of other viewers is a courtesy, the change itself is already saved
		}
	};

	return { listFolders, createFolder, renameFolder, moveFolder, deleteFolder, notifyFilesChanged };
};
