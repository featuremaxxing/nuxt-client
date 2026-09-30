import { RoomBoardItem } from "@/types/room/Room";
import {
	RoomLearningPathResponse,
	RoomLearningPathStepResponse,
	RoomLearningPathStepResponseStatusEnum as StepStatus,
	RoomLearningPathStepResponseUnlockModeEnum as UnlockMode,
} from "@api-server";
import { orderedSteps } from "@data-board-learning-path";

export type LearningPathStepInfo = { title: string; position: number };

export type LockedHint = { mode: "all" | "any"; titles: string[] };

// teachers get the class numbers, students their own state
export const isEditorSummary = (summary: RoomLearningPathResponse): boolean => summary.studentCount !== undefined;

// The boards of a learning path in reading order. Students only see the published ones.
export const visibleChain = (summary: RoomLearningPathResponse): RoomLearningPathStepResponse[] =>
	orderedSteps(summary.steps).filter((step) => isEditorSummary(summary) || step.status !== StepStatus.Unavailable);

// For every board of the room that is part of a learning path: the path and its step number.
// A board on several paths shows the first one of the room.
export const stepInfoByBoardId = (boards: RoomBoardItem[]): Record<string, LearningPathStepInfo> => {
	const result: Record<string, LearningPathStepInfo> = {};
	for (const board of boards) {
		if (!board.learningPath) continue;
		visibleChain(board.learningPath).forEach((step, index) => {
			result[step.boardId] ??= { title: board.title, position: index + 1 };
		});
	}

	return result;
};

// For every locked board: the boards the student still has to complete, taken from the
// learning path that locks it.
export const lockedHintByBoardId = (boards: RoomBoardItem[]): Record<string, LockedHint> => {
	const pathsById = new Map(boards.filter((board) => board.learningPath).map((board) => [board.id, board]));
	const result: Record<string, LockedHint> = {};

	for (const board of boards) {
		const summary = board.lockedByLearningPath && pathsById.get(board.lockedByLearningPath.id)?.learningPath;
		if (!summary) continue;

		const stepsById = new Map(summary.steps.map((step) => [step.id, step]));
		const step = summary.steps.find((candidate) => candidate.boardId === board.id);
		if (!step) continue;

		const titles = step.prerequisiteStepIds
			.map((id) => stepsById.get(id))
			.filter(
				(candidate): candidate is RoomLearningPathStepResponse =>
					!!candidate && candidate.status !== StepStatus.Done && candidate.status !== StepStatus.Unavailable
			)
			.map((candidate) => candidate.title);
		if (titles.length === 0) continue;

		const mode = step.unlockMode === UnlockMode.Any && step.prerequisiteStepIds.length > 1 ? "any" : "all";
		result[board.id] = { mode, titles };
	}

	return result;
};
