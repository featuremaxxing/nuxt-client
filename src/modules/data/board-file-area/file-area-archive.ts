import { useFileAreaApi } from "./file-area-api";
import { FileRecordParent } from "@/types/file/File";
import { sanitizeZipPathSegment } from "@/utils/fileHelper";
import { useFileStorageApi } from "@data-file";

export type FileAreaArchive = {
	fileRecordIds: string[];
	paths: Record<string, string>;
};

/** Collect every file of a file area and its folder path for the archive endpoint. */
export const useFileAreaArchive = () => {
	const fileAreaApi = useFileAreaApi();
	const fileStorage = useFileStorageApi();

	const buildArchive = async (boardId: string): Promise<FileAreaArchive> => {
		const { folders } = await fileAreaApi.listFolders(boardId);
		const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
		const pathByParentId = new Map<string, string>([[boardId, ""]]);

		const getFolderPath = (folderId: string, visiting = new Set<string>()): string => {
			const cached = pathByParentId.get(folderId);
			if (cached !== undefined) return cached;

			const folder = foldersById.get(folderId);
			if (!folder || visiting.has(folderId)) return "";

			visiting.add(folderId);
			const path = `${getFolderPath(folder.parentId, visiting)}${sanitizeZipPathSegment(folder.title)}/`;
			visiting.delete(folderId);
			pathByParentId.set(folderId, path);
			return path;
		};

		const parentIds = [boardId, ...folders.map((folder) => folder.id)];
		await Promise.all(parentIds.map((parentId) => fileStorage.fetchFiles(parentId, FileRecordParent.BOARDNODES)));

		const paths: Record<string, string> = {};
		for (const parentId of parentIds) {
			const folderPath = parentId === boardId ? "" : getFolderPath(parentId);
			for (const file of fileStorage.getFileRecordsByParentId(parentId)) {
				if (!file.isUploading) paths[file.id] = `${folderPath}${sanitizeZipPathSegment(file.name)}`;
			}
		}

		return { fileRecordIds: Object.keys(paths), paths };
	};

	return { buildArchive };
};
