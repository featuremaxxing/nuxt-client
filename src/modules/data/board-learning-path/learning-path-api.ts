import { $axios, mapAxiosErrorToResponseError } from "@/utils/api";
import { LearningPathColor } from "@api-server";
import { notifyError } from "@data-app";
import { useI18n } from "vue-i18n";

export type LearningPathUnlockMode = "all" | "any";

export type LearningPathStepStatus = "done" | "open" | "locked" | "unavailable";

export type LearningPathLockReason = "prerequisites" | "chooseLearningPath";

// what keeps a locked step closed: boards of a learning path still to be completed, or no learning path chosen yet
export type LearningPathLock = {
	pathId: string;
	pathTitle: string;
	reason: LearningPathLockReason;
};

export type LearningPathStep = {
	id: string;
	linkedBoardId: string;
	// empty when the board is not available to the user
	title: string;
	isVisible: boolean;
	positionX: number;
	positionY: number;
	prerequisiteStepIds: string[];
	unlockMode: LearningPathUnlockMode;
	lockUntilPrerequisitesDone: boolean;
	status: LearningPathStepStatus;
	// students only
	lock?: LearningPathLock;
	// editors only: the students who go this learning path
	doneCount?: number;
	studentCount?: number;
};

export type LearningPathAvailableBoard = {
	id: string;
	title: string;
	isVisible: boolean;
};

export type LearningPath = {
	boardId: string;
	isEditor: boolean;
	color?: LearningPathColor;
	// students only: whether they go this learning path
	isEnrolled?: boolean;
	// students only: whether the room has several learning paths to choose from
	canChoose?: boolean;
	// editors only: the students who go this learning path and how many finished it
	studentCount?: number;
	completedStudentCount?: number;
	steps: LearningPathStep[];
	availableBoards: LearningPathAvailableBoard[];
};

export type LearningPathStepUpdate = Partial<
	Pick<
		LearningPathStep,
		"positionX" | "positionY" | "prerequisiteStepIds" | "unlockMode" | "lockUntilPrerequisitesDone"
	>
>;

export type LearningPathOverview = {
	paths: { id: string; title: string; color?: LearningPathColor; total: number }[];
	students: {
		userId: string;
		firstName?: string;
		lastName?: string;
		// the learning paths the student goes
		paths: { pathId: string; done: number; total: number; nextBoardTitle?: string }[];
	}[];
};

export type BoardCompletion = {
	inLearningPath: boolean;
	canMarkManually: boolean;
	completed: boolean;
};

// The endpoints are called directly until the generated client knows them
// (npm run generate-client:server).
export const useLearningPathApi = () => {
	const { t } = useI18n();

	const withErrorNotification = async <T>(request: () => Promise<T>, badRequestKey?: string): Promise<T> => {
		try {
			return await request();
		} catch (error) {
			const responseError = mapAxiosErrorToResponseError(error);
			if (responseError.code === 403) notifyError(t("error.403"));
			else if (responseError.code === 400 && badRequestKey) notifyError(t(badRequestKey));
			else notifyError(t("pages.learningPath.error.generic"));
			throw error;
		}
	};

	const fetchLearningPath = async (boardId: string): Promise<LearningPath> => {
		const response = await $axios.get<LearningPath>(`/v3/boards/${boardId}/learning-path`);

		return response.data;
	};

	const createStep = (boardId: string, linkedBoardId: string, positionX: number, positionY: number) =>
		withErrorNotification(async () => {
			const response = await $axios.post<LearningPathStep>("/v3/learning-path-steps", {
				boardId,
				linkedBoardId,
				positionX: Math.round(positionX),
				positionY: Math.round(positionY),
			});

			return response.data;
		});

	// the server refuses arrows that close a circle together with the other learning paths of the room
	const updateStep = (stepId: string, update: LearningPathStepUpdate) =>
		withErrorNotification(async () => {
			const body = { ...update };
			if (body.positionX !== undefined) body.positionX = Math.round(body.positionX);
			if (body.positionY !== undefined) body.positionY = Math.round(body.positionY);
			const response = await $axios.patch<LearningPathStep>(`/v3/learning-path-steps/${stepId}`, body);

			return response.data;
		}, "pages.learningPath.error.circleInRoom");

	const updateColor = (boardId: string, color: LearningPathColor) =>
		withErrorNotification(async () => {
			await $axios.patch(`/v3/boards/${boardId}/learning-path`, { color });
		});

	// a student chooses a learning path to go; a teacher can also set it for a member of the room
	const enroll = (boardId: string, userId?: string) =>
		withErrorNotification(async () => {
			await $axios.put(`/v3/boards/${boardId}/enrollment`, userId ? { userId } : {});
		});

	const unenroll = (boardId: string, userId?: string) =>
		withErrorNotification(async () => {
			await $axios.delete(`/v3/boards/${boardId}/enrollment`, { data: userId ? { userId } : {} });
		});

	const fetchOverview = async (roomId: string): Promise<LearningPathOverview> => {
		const response = await $axios.get<LearningPathOverview>(`/v3/rooms/${roomId}/learning-paths/overview`);

		return response.data;
	};

	const deleteStep = (stepId: string) =>
		withErrorNotification(async () => {
			await $axios.delete(`/v3/learning-path-steps/${stepId}`);
		});

	const fetchCompletion = async (boardId: string): Promise<BoardCompletion> => {
		const response = await $axios.get<BoardCompletion>(`/v3/boards/${boardId}/completion`);

		return response.data;
	};

	const setCompletion = (boardId: string, completed: boolean) =>
		withErrorNotification(async () => {
			const response = await $axios.put<BoardCompletion>(`/v3/boards/${boardId}/completion`, { completed });

			return response.data;
		});

	return {
		fetchLearningPath,
		createStep,
		updateStep,
		updateColor,
		enroll,
		unenroll,
		fetchOverview,
		deleteStep,
		fetchCompletion,
		setCompletion,
	};
};
