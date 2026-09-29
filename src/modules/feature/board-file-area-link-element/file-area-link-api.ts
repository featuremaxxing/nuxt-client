import { FileRecord } from "@/types/file/File";
import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { FileApiFactory } from "@api-file-storage";
import { type FileAreaFolder, useFileAreaApi } from "@data-board-file-area";

export type LinkTargetResult<T> = { status: "ok"; value: T } | { status: "missing" } | { status: "forbidden" };

const toFailure = (error: unknown): { status: "missing" } | { status: "forbidden" } => {
	const { code } = mapAxiosErrorToResponseError(error);

	return code === 403 || code === 401 ? { status: "forbidden" } : { status: "missing" };
};

// Loads link targets without the error toasts of the regular file and file area composables: a
// missing or unreadable target is a normal state of a link and shown on the element itself.
export const useFileAreaLinkApi = () => {
	const fileApi = FileApiFactory(undefined, "/v3", $axios);
	const fileAreaApi = useFileAreaApi();

	const loadFile = async (fileRecordId: string): Promise<LinkTargetResult<FileRecord>> => {
		try {
			const response = await fileApi.getFileRecord(fileRecordId);

			return { status: "ok", value: response.data };
		} catch (error) {
			return toFailure(error);
		}
	};

	const loadFolders = async (fileAreaId: string): Promise<LinkTargetResult<FileAreaFolder[]>> => {
		try {
			const result = await fileAreaApi.listFolders(fileAreaId);

			return { status: "ok", value: result.folders };
		} catch (error) {
			return toFailure(error);
		}
	};

	return { loadFile, loadFolders, listFileAreasOfRoom: fileAreaApi.listFileAreasOfRoom };
};
