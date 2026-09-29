import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { notifyError } from "@data-app";

export type ProgressElementType = "checkbox" | "assignment" | "poll";

export interface ProgressSummary {
	done: number;
	total: number;
}

export interface ProgressStudentEntry {
	userId: string;
	firstName?: string;
	lastName?: string;
	done: boolean;
}

export interface ProgressItem {
	type: ProgressElementType;
	elementId: string;
	cardId: string;
	cardTitle?: string;
	title: string;
	dueDate?: string;
	// The requesting user's own eligibility/completion - meaningful for the student view.
	eligible: boolean;
	done: boolean;
	doneCount: number;
	eligibleCount: number;
	// Only present for a manager who requested ?details=true.
	students?: ProgressStudentEntry[];
}

export interface BoardProgress {
	boardId: string;
	boardTitle: string;
	isTeacherView: boolean;
	summary: ProgressSummary;
	items: ProgressItem[];
}

export interface RoomProgress {
	roomId: string;
	summary: ProgressSummary;
	boards: BoardProgress[];
}

const reportError = (error: unknown) => notifyError(mapAxiosErrorToResponseError(error).message);

export const useBoardProgressApi = () => {
	const getBoardProgress = async (boardId: string, details = false): Promise<BoardProgress | undefined> => {
		try {
			return (
				await $axios.get<BoardProgress>(`/v3/boards/${encodeURIComponent(boardId)}/progress`, {
					params: { details },
				})
			).data;
		} catch (error) {
			reportError(error);
		}
	};

	const getRoomProgress = async (roomId: string, details = false): Promise<RoomProgress | undefined> => {
		try {
			return (
				await $axios.get<RoomProgress>(`/v3/rooms/${encodeURIComponent(roomId)}/progress`, {
					params: { details },
				})
			).data;
		} catch (error) {
			reportError(error);
		}
	};

	return { getBoardProgress, getRoomProgress };
};
