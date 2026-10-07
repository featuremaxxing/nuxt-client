import { type LearningPath, type LearningPathStep, useLearningPathApi } from "./learning-path-api";
import { stepRoute } from "./learning-path-cards";
import { orderedSteps } from "./learning-path-graph";
import { computed, type Ref, ref, watch } from "vue";
import type { RouteLocationRaw } from "vue-router";

const isOpenable = (step: LearningPathStep) => step.status === "open" || step.status === "done";

export type LearningPathStepNavigation = {
	step?: LearningPathStep;
	// counted over every step a student sees, text tiles included
	position: number;
	total: number;
	// the steps around it, when they can be opened
	previous?: LearningPathStep;
	next?: LearningPathStep;
	previousRoute?: RouteLocationRaw;
	nextRoute?: RouteLocationRaw;
};

// Where a step stands in its learning path and where paging leads from it - for a card opened in
// the detail view as well as for a text tile read on the learning path.
export const stepNavigation = (
	path: LearningPath | undefined,
	pathId: string,
	isCurrent: (step: LearningPathStep) => boolean
): LearningPathStepNavigation => {
	// students only see the published steps, as in the list of the learning path
	const chain = orderedSteps(path?.steps ?? []).filter((step) => path?.isEditor || step.status !== "unavailable");
	const index = chain.findIndex(isCurrent);
	const openable = (candidate: LearningPathStep | undefined) =>
		candidate && (path?.isEditor || isOpenable(candidate)) ? candidate : undefined;
	const previous = openable(index > 0 ? chain[index - 1] : undefined);
	const next = openable(index >= 0 && index < chain.length - 1 ? chain[index + 1] : undefined);

	return {
		step: index >= 0 ? chain[index] : undefined,
		position: index + 1,
		total: chain.length,
		previous,
		next,
		previousRoute: previous ? stepRoute(previous, pathId) : undefined,
		nextRoute: next ? stepRoute(next, pathId) : undefined,
	};
};

/**
 * A card opened as a step of a learning path (detail view with ?learningPath=<id>): which step it
 * is, the steps before and after it that can be opened, and the way back to the learning path.
 */
export const useLearningPathCardNavigation = (pathId: Ref<string | undefined>, cardId: Ref<string | undefined>) => {
	const api = useLearningPathApi();
	const path = ref<LearningPath>();

	const load = async (): Promise<void> => {
		if (!pathId.value) {
			path.value = undefined;
			return;
		}
		try {
			path.value = await api.fetchLearningPath(pathId.value);
		} catch {
			path.value = undefined;
		}
	};

	watch(pathId, load, { immediate: true });

	const isActive = computed(() => !!pathId.value);

	const navigation = computed(() =>
		stepNavigation(path.value, pathId.value ?? "", (step) => !!cardId.value && step.linkedCardId === cardId.value)
	);
	const pathRoute = computed<RouteLocationRaw | undefined>(() =>
		pathId.value ? `/boards/${pathId.value}` : undefined
	);

	return {
		isActive,
		path,
		step: computed(() => navigation.value.step),
		position: computed(() => navigation.value.position),
		total: computed(() => navigation.value.total),
		previousRoute: computed(() => (pathId.value ? navigation.value.previousRoute : undefined)),
		nextRoute: computed(() => (pathId.value ? navigation.value.nextRoute : undefined)),
		pathRoute,
		reload: load,
	};
};
