import { RoomBoardItem } from "@/types/room/Room";
import {
	LearningPathColor,
	RoomBoardLockResponseReasonEnum as LockReason,
	RoomLearningPathResponse,
	RoomLearningPathStepResponse,
	RoomLearningPathStepResponseStatusEnum as StepStatus,
	RoomLearningPathStepResponseUnlockModeEnum as UnlockMode,
} from "@api-server";
import { orderedSteps } from "@data-board-learning-path";

export type LearningPathStepInfo = { title: string; position: number; color?: LearningPathColor };

// "choose": no learning path chosen yet, the student has to pick one first
export type LockedHint = { mode: "all" | "any" | "choose"; titles: string[] };

// teachers get the class numbers, students their own state
export const isEditorSummary = (summary: RoomLearningPathResponse): boolean => summary.studentCount !== undefined;

// Every step of a learning path in reading order, text tiles included (they count when numbering
// the steps). Students only see the published ones.
const numberedChain = (summary: RoomLearningPathResponse): RoomLearningPathStepResponse[] =>
	orderedSteps(summary.steps).filter((step) => isEditorSummary(summary) || step.status !== StepStatus.Unavailable);

// The boards and cards of a learning path in reading order, as the room shows them: text tiles
// have nothing to complete and stay out.
export const visibleChain = (summary: RoomLearningPathResponse): RoomLearningPathStepResponse[] =>
	numberedChain(summary).filter((step) => !step.isText);

// For every board of the room that is part of a learning path: the paths and its step number in
// each. Students only see the paths they go, teachers all of them. A card step does not make its
// board a step, the card carries the hint.
export const stepInfoByBoardId = (boards: RoomBoardItem[]): Record<string, LearningPathStepInfo[]> => {
	const result: Record<string, LearningPathStepInfo[]> = {};
	for (const board of boards) {
		const summary = board.learningPath;
		if (!summary || !(isEditorSummary(summary) || summary.isEnrolled)) continue;

		numberedChain(summary).forEach((step, index) => {
			if (step.cardId || step.isText) return;
			(result[step.boardId] ??= []).push({ title: board.title, position: index + 1, color: summary.color });
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
		if (board.lockedByLearningPath?.reason === LockReason.ChooseLearningPath) {
			result[board.id] = { mode: "choose", titles: [] };
			continue;
		}

		const summary = board.lockedByLearningPath && pathsById.get(board.lockedByLearningPath.id)?.learningPath;
		if (!summary) continue;

		const stepsById = new Map(summary.steps.map((step) => [step.id, step]));
		const step = summary.steps.find((candidate) => candidate.boardId === board.id && !candidate.cardId);
		if (!step) continue;

		const titles = step.prerequisiteStepIds
			.map((id) => stepsById.get(id))
			.filter(
				(candidate): candidate is RoomLearningPathStepResponse =>
					!!candidate &&
					!candidate.isText &&
					candidate.status !== StepStatus.Done &&
					candidate.status !== StepStatus.Unavailable
			)
			.map((candidate) => candidate.title);
		if (titles.length === 0) continue;

		const mode = step.unlockMode === UnlockMode.Any && step.prerequisiteStepIds.length > 1 ? "any" : "all";
		result[board.id] = { mode, titles };
	}

	return result;
};

// The boards a student completed before but something new came up in, in the learning paths they go.
export const reworkBoardIds = (boards: RoomBoardItem[]): Set<string> => {
	const result = new Set<string>();
	for (const board of boards) {
		const summary = board.learningPath;
		if (!summary || isEditorSummary(summary) || !summary.isEnrolled) continue;

		summary.steps.filter((step) => step.reopened && !step.cardId).forEach((step) => result.add(step.boardId));
	}

	return result;
};
