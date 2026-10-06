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
	// for a card step the board the card lies on
	linkedBoardId: string;
	// set when the step is a single card
	linkedCardId?: string;
	// empty when the board or card is not available to the user
	title: string;
	// card steps: title of the board the card lies on
	boardTitle?: string;
	isVisible: boolean;
	positionX: number;
	positionY: number;
	prerequisiteStepIds: string[];
	unlockMode: LearningPathUnlockMode;
	lockUntilPrerequisitesDone: boolean;
	status: LearningPathStepStatus;
	// students only: completed before, but something new came up. It still unlocks what follows.
	reopened?: boolean;
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
	title?: string;
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

export type LearningPathOverviewProgress = {
	pathId: string;
	isEnrolled: boolean;
	// every published step done - completed boards count in every learning path, gone or not
	completed: boolean;
	done: number;
	total: number;
	rework: number;
	nextBoardTitle?: string;
};

export type LearningPathOverview = {
	paths: { id: string; title: string; color?: LearningPathColor; total: number }[];
	students: {
		userId: string;
		firstName?: string;
		lastName?: string;
		// every learning path of the room: whether the student goes it and how far they got
		paths: LearningPathOverviewProgress[];
	}[];
};

// a card of a board that is a step of learning paths: per learning path the step's number and state
export type LearningPathCardStep = {
	cardId: string;
	paths: {
		pathId: string;
		pathTitle: string;
		color?: LearningPathColor;
		position: number;
		status: LearningPathStepStatus;
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

	// with linkedCardId the step is that card of the board linkedBoardId
	const createStep = (
		boardId: string,
		linkedBoardId: string,
		positionX: number,
		positionY: number,
		linkedCardId?: string
	) =>
		withErrorNotification(async () => {
			const response = await $axios.post<LearningPathStep>("/v3/learning-path-steps", {
				boardId,
				linkedBoardId,
				...(linkedCardId ? { linkedCardId } : {}),
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

	// starts over for the given students (default: all of the room): stored completions and checkbox ticks go.
	// With a pathId only the boards and cards of that learning path start over.
	const resetProgress = (roomId: string, userIds?: string[], pathId?: string) =>
		withErrorNotification(async () => {
			await $axios.post(`/v3/rooms/${roomId}/learning-paths/reset`, {
				...(userIds ? { userIds } : {}),
				...(pathId ? { pathId } : {}),
			});
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

	const fetchCardCompletion = async (cardId: string): Promise<BoardCompletion> => {
		const response = await $axios.get<BoardCompletion>(`/v3/cards/${cardId}/completion`);

		return response.data;
	};

	const setCardCompletion = (cardId: string, completed: boolean) =>
		withErrorNotification(async () => {
			const response = await $axios.put<BoardCompletion>(`/v3/cards/${cardId}/completion`, { completed });

			return response.data;
		});

	const fetchBoardCardSteps = async (boardId: string): Promise<LearningPathCardStep[]> => {
		const response = await $axios.get<{ data: LearningPathCardStep[] }>(`/v3/boards/${boardId}/learning-path-cards`);

		return response.data.data;
	};

	return {
		fetchLearningPath,
		createStep,
		updateStep,
		updateColor,
		enroll,
		unenroll,
		fetchOverview,
		resetProgress,
		deleteStep,
		fetchCompletion,
		setCompletion,
		fetchCardCompletion,
		setCardCompletion,
		fetchBoardCardSteps,
	};
};
