import type { LearningPathStep } from "./learning-path-api";

export type LearningPathEdge = { fromId: string; toId: string };

export const edgesOf = (steps: LearningPathStep[]): LearningPathEdge[] => {
	const ids = new Set(steps.map((step) => step.id));

	return steps.flatMap((step) =>
		step.prerequisiteStepIds.filter((fromId) => ids.has(fromId)).map((fromId) => ({ fromId, toId: step.id }))
	);
};

// true when an arrow from -> to would close a circle (the server refuses those as well)
export const wouldCreateCycle = (steps: LearningPathStep[], fromId: string, toId: string): boolean => {
	if (fromId === toId) return true;

	const prerequisitesOf = new Map(steps.map((step) => [step.id, step.prerequisiteStepIds]));
	const visited = new Set<string>();
	const stack = [fromId];
	while (stack.length > 0) {
		const current = stack.pop() as string;
		if (current === toId) return true;
		if (visited.has(current)) continue;
		visited.add(current);
		stack.push(...(prerequisitesOf.get(current) ?? []));
	}

	return false;
};

type PlacedStep = Pick<LearningPathStep, "id" | "positionX" | "positionY" | "prerequisiteStepIds">;

// Steps in reading order: every step after its prerequisites, ties from top to bottom and left
// to right as they are placed on the canvas. Used for the list view, the room and screen readers.
export const orderedSteps = <T extends PlacedStep>(steps: T[]): T[] => {
	const byPosition = [...steps].sort((a, b) => a.positionY - b.positionY || a.positionX - b.positionX);
	const ids = new Set(steps.map((step) => step.id));
	const placed = new Set<string>();
	const result: T[] = [];

	while (result.length < byPosition.length) {
		const next =
			byPosition.find(
				(step) => !placed.has(step.id) && step.prerequisiteStepIds.every((id) => !ids.has(id) || placed.has(id))
			) ?? byPosition.find((step) => !placed.has(step.id));
		if (!next) break;
		placed.add(next.id);
		result.push(next);
	}

	return result;
};
